// Presupuestos del maestro de una obra (ADR 0014).
//
// El maestro manda su presupuesto (en PDF o por WhatsApp). El equipo lo carga: quién es, cuánto
// cobra, en cuántos días y qué partidas de la orden cubre. Queda RECIBIDO. Después la jefatura lo
// APRUEBA (pasa a ser el plan de costo y plazo) o lo RECHAZA con un motivo. Un cambio de alcance
// durante la obra es un presupuesto ADICIONAL y se aprueba igual. Cargar es del equipo; aprobar y
// rechazar, solo de la jefatura.
import { db, ORG_PROGES } from "@proges/db";
import type * as contrato from "@proges/contrato";
import type { Quien } from "../../acceso/quien";
import { ErrorApi } from "../../errores";
import type { Drive } from "../../integraciones/tipos";
import { espacioParaEscribirEn, exigirJefatura } from "../../permisos";
import { MAX_BYTES_ARCHIVO, archivosDe, esPdf, nombreSeguro, textoONull } from "./formulario";
import { exigirAbierto, servicioParaEscribir } from "./permisos-obra";

// Sube el PDF a la carpeta «Portal» de la propiedad. Si falla, el presupuesto NO se guarda: nunca
// queda un presupuesto sin su PDF a medias.
async function subirPdf(drive: Drive, archivo: File, property: { driveCarpetaId: string | null }, nombreMaestro: string) {
  if (archivo.size > MAX_BYTES_ARCHIVO) {
    throw new ErrorApi(400, "El PDF pesa más de 4 MB: achícalo o guárdalo en el Drive de la propiedad.", { pdf: "Pesa más de 4 MB." });
  }
  const datos = Buffer.from(await archivo.arrayBuffer());
  if (!esPdf(datos)) throw new ErrorApi(400, "El archivo no es un PDF.", { pdf: "El archivo no es un PDF." });
  if (!property.driveCarpetaId) {
    throw new ErrorApi(409, "Esta propiedad no tiene carpeta de Drive: enlázala antes de subir el PDF.");
  }
  try {
    const { driveFileId } = await drive.subirArchivo({
      property,
      nombre: `Presupuesto ${nombreSeguro(nombreMaestro) || "maestro"}.pdf`,
      mime: "application/pdf",
      datos,
    });
    return driveFileId;
  } catch (e) {
    throw new ErrorApi(502, `No se pudo subir el PDF a Drive: ${e instanceof Error ? e.message : "error desconocido"}.`);
  }
}

export async function cargarPresupuesto(
  quien: Quien,
  drive: Drive,
  servicioId: string,
  pedido: contrato.PresupuestoPedido,
): Promise<contrato.PresupuestoRespuesta> {
  const { persona, orgId, servicio } = await servicioParaEscribir(quien, servicioId);
  exigirAbierto(servicio.estado);

  // El maestro vive en el espacio de Proges y tiene que estar activo.
  const maestro = await db.maestro.findFirst({
    where: { id: pedido.maestroId, organizationId: ORG_PROGES, activo: true },
    select: { id: true, nombre: true },
  });
  if (!maestro) throw new ErrorApi(400, "Ese maestro no está disponible.", { maestroId: "Ese maestro no está disponible." });

  // Las partidas que cubre tienen que ser de este mismo servicio (los ids vienen de la web).
  const partidaIds = [...new Set(pedido.partidaIds === undefined ? [] : [pedido.partidaIds].flat())];
  if (partidaIds.length > 0) {
    const validas = await db.partida.count({ where: { id: { in: partidaIds }, servicioEnCursoId: servicio.id } });
    if (validas !== partidaIds.length) {
      throw new ErrorApi(400, "Alguna partida no es de este servicio.", { partidaIds: "Alguna partida no es de este servicio." });
    }
  }

  let pdfDriveFileId: string | null = null;
  const [pdf, ...sobran] = archivosDe(pedido.pdf, "pdf");
  if (sobran.length > 0) throw new ErrorApi(400, "Adjunta un solo PDF.", { pdf: "Adjunta un solo PDF." });
  if (pdf) pdfDriveFileId = await subirPdf(drive, pdf, servicio.property, maestro.nombre);

  const creado = await db.presupuestoMaestro.create({
    data: {
      organizationId: orgId,
      servicioEnCursoId: servicio.id,
      maestroId: maestro.id,
      tipo: pedido.tipo,
      total: pedido.total,
      plazoDias: pedido.plazoDias ?? null,
      pdfDriveFileId,
      nota: textoONull(pedido.nota),
      cargadoPorId: persona.usuario.id,
      partidas: { connect: partidaIds.map((id) => ({ id })) },
    },
    select: { id: true, estado: true },
  });
  return creado;
}

// Lee el presupuesto que se va a resolver y comprueba que se puede tocar.
async function presupuestoParaResolver(quien: Quien, id: string) {
  const jefe = exigirJefatura(quien);
  const p = await db.presupuestoMaestro.findUnique({
    where: { id },
    select: {
      id: true,
      organizationId: true,
      servicioEnCursoId: true,
      estado: true,
      nota: true,
      maestroId: true,
      servicioEnCurso: { select: { estado: true } },
      partidas: { select: { id: true, servicioEnCursoId: true } },
    },
  });
  await espacioParaEscribirEn(quien, p?.organizationId);
  if (!p) throw new ErrorApi(404, "No se encontró lo que buscas."); // ya dio 404 arriba
  exigirAbierto(p.servicioEnCurso.estado);
  if (p.estado !== "RECIBIDO") throw new ErrorApi(409, "Ese presupuesto ya fue resuelto.");
  return { jefe, p };
}

// La jefatura aprueba un presupuesto: pasa a ser el plan. Las partidas que cubre y que aún no
// tienen maestro quedan a nombre de este.
export async function aprobarPresupuesto(quien: Quien, id: string): Promise<contrato.PresupuestoRespuesta> {
  const { jefe, p } = await presupuestoParaResolver(quien, id);
  const sinMaestro = p.partidas.filter((x) => x.servicioEnCursoId === p.servicioEnCursoId).map((x) => x.id);

  // Todo o nada: aprobar y asignar el maestro van en una sola transacción. El `where` con el
  // estado evita aprobar dos veces si dos jefaturas aprietan a la vez.
  const hecho = await db.$transaction(async (tx) => {
    const cambio = await tx.presupuestoMaestro.updateMany({
      where: { id: p.id, estado: "RECIBIDO" },
      data: { estado: "APROBADO", resueltoPorId: jefe.usuario.id, resueltoEl: new Date() },
    });
    if (cambio.count === 0) return false;
    await tx.partida.updateMany({ where: { id: { in: sinMaestro }, maestroId: null }, data: { maestroId: p.maestroId } });
    return true;
  });
  if (!hecho) throw new ErrorApi(409, "Ese presupuesto ya fue resuelto.");
  return { id: p.id, estado: "APROBADO" };
}

// La jefatura rechaza un presupuesto y deja el motivo (que se suma a la nota que ya tenía).
export async function rechazarPresupuesto(quien: Quien, id: string, motivo: string): Promise<contrato.PresupuestoRespuesta> {
  const { jefe, p } = await presupuestoParaResolver(quien, id);
  const rechazo = `Rechazado: ${motivo}`;
  const cambio = await db.presupuestoMaestro.updateMany({
    where: { id: p.id, estado: "RECIBIDO" },
    data: {
      estado: "RECHAZADO",
      resueltoPorId: jefe.usuario.id,
      resueltoEl: new Date(),
      nota: p.nota ? `${p.nota}\n${rechazo}` : rechazo,
    },
  });
  if (cambio.count === 0) throw new ErrorApi(409, "Ese presupuesto ya fue resuelto.");
  return { id: p.id, estado: "RECHAZADO" };
}
