// Recepción de la obra, partida por partida (ADR 0014, d16).
//
// Cuando el maestro dice que terminó una partida, el equipo la revisa y la recibe: CONFORME (está
// bien) u OBSERVADA (hay algo que corregir; con la observación y, si quiere, fotos). Una observada
// abre una tarea «Corregir: …» para que alguien la arregle. Volver a recibir una observada como
// conforme deja hecha esa tarea. Las fotos se suben primero a Drive y recién después se guarda todo
// junto: si una foto falla, la recepción no se guarda a medias.
import { db } from "@proges/db";
import type * as contrato from "@proges/contrato";
import type { Quien } from "../../acceso/quien";
import { ErrorApi } from "../../errores";
import type { Drive } from "../../integraciones/tipos";
import { espacioParaEscribirEn, exigirEquipo } from "../../permisos";
import { exigirResponsableValido } from "../trabajo/pedidos";
import { TIPOS_DE_FOTO, archivosDe, textoDeTareaCorreccion, textoONull, validarFotos } from "./formulario";
import { exigirAbierto } from "./permisos-obra";

export async function recibirPartida(
  quien: Quien,
  drive: Drive,
  partidaId: string,
  pedido: contrato.RecepcionPedido,
): Promise<contrato.RecepcionRespuesta> {
  const persona = exigirEquipo(quien);
  const observacion = textoONull(pedido.observacion);
  if (pedido.resultado === "OBSERVADA" && !observacion) {
    throw new ErrorApi(400, "Cuenta qué hay que corregir.", { observacion: "Cuenta qué hay que corregir." });
  }
  const fotos = archivosDe(pedido.fotos, "fotos");
  validarFotos(fotos);

  const partida = await db.partida.findUnique({
    where: { id: partidaId },
    select: {
      id: true,
      organizationId: true,
      servicioEnCursoId: true,
      descripcion: true,
      quitadaEnOdoo: true,
      servicioEnCurso: { select: { estado: true, property: { select: { driveCarpetaId: true } } } },
    },
  });
  const orgId = await espacioParaEscribirEn(quien, partida?.organizationId);
  if (!partida) throw new ErrorApi(404, "No se encontró lo que buscas."); // ya dio 404 arriba
  exigirAbierto(partida.servicioEnCurso.estado);
  if (partida.quitadaEnOdoo) throw new ErrorApi(409, "Esa partida ya no está en la orden de Odoo.");
  if (fotos.length > 0 && !partida.servicioEnCurso.property.driveCarpetaId) {
    throw new ErrorApi(409, "Esta propiedad no tiene carpeta de Drive: enlázala antes de subir fotos.");
  }

  // El responsable, si viene, tiene que ser alguien activo del equipo (el id viene de la web).
  const responsableId = pedido.responsableId ?? null;
  await exigirResponsableValido(responsableId);

  // Las fotos, a la carpeta «Portal» de la propiedad, antes de guardar nada. Si después falla la
  // base, las fotos ya subidas quedan sueltas en esa carpeta (sin datos de nadie más): se aceptó
  // así en el cierre de la v7; limpiarlas sería mandarlas a la papelera en el catch.
  const subidas: { driveFileId: string; nombre: string; mime: string }[] = [];
  for (const [i, foto] of fotos.entries()) {
    try {
      const { driveFileId } = await drive.subirArchivo({
        property: partida.servicioEnCurso.property,
        nombre: `recepcion-${partida.id}-${Date.now()}-${i + 1}.${TIPOS_DE_FOTO[foto.type]}`,
        mime: foto.type,
        datos: Buffer.from(await foto.arrayBuffer()),
      });
      subidas.push({ driveFileId, nombre: foto.name || `foto-${i + 1}`, mime: foto.type });
    } catch (e) {
      throw new ErrorApi(
        502,
        `No se pudo subir la foto ${i + 1}: ${e instanceof Error ? e.message : "error desconocido"}. No se guardó nada: vuelve a intentar.`,
      );
    }
  }

  const ahora = new Date();
  const tareaId = await db.$transaction(async (tx) => {
    await tx.partida.update({
      where: { id: partida.id },
      data: {
        recepcion: pedido.resultado,
        // En conforme, si no se escribió nada se deja la última observación como historia.
        ...(pedido.resultado === "OBSERVADA" || observacion ? { observacion } : {}),
        recibidaEl: ahora,
        recibidaPorId: persona.usuario.id,
      },
    });

    let tarea: string | null = null;
    if (pedido.resultado === "OBSERVADA") {
      // Una sola tarea abierta por partida: si ya había una, se actualiza en vez de duplicarla.
      const texto = textoDeTareaCorreccion(partida.descripcion, observacion as string);
      const abierta = await tx.tarea.findFirst({
        where: { partidaId: partida.id, organizationId: orgId, hechaEl: null },
        select: { id: true },
      });
      if (abierta) {
        await tx.tarea.update({
          where: { id: abierta.id },
          data: { que: texto, ...(responsableId ? { responsableId } : {}) },
        });
        tarea = abierta.id;
      } else {
        const creada = await tx.tarea.create({
          data: {
            organizationId: orgId,
            servicioEnCursoId: partida.servicioEnCursoId,
            que: texto,
            responsableId,
            creadaPorId: persona.usuario.id,
            partidaId: partida.id,
          },
        });
        tarea = creada.id;
      }
    } else {
      // Conforme: la tarea de corregir (si había) queda hecha.
      await tx.tarea.updateMany({
        where: { partidaId: partida.id, organizationId: orgId, hechaEl: null },
        data: { hechaEl: ahora, hechaPorId: persona.usuario.id },
      });
    }

    for (const s of subidas) {
      await tx.foto.create({ data: { organizationId: orgId, partidaId: partida.id, ...s } });
    }
    return tarea;
  });

  return { partidaId: partida.id, recepcion: pedido.resultado, tareaId, fotos: subidas.length };
}
