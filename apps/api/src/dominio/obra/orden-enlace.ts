// Traer la orden de Odoo a un servicio: revisar, enlazar y volver a traer (ADR 0012, ADR 0014).
//
// Piensa en copiar a mano una cotización: primero la lees entera y confirmas que es del cliente
// correcto (revisar, no escribe nada); después la copias (enlazar). Odoo no se toca nunca: solo se
// lee. La orden se vuelve a leer de Odoo en cada paso: lo que se mostró en pantalla no se da por
// bueno. Las reglas de comparación (cuenta analítica, qué partidas son nuevas o quedaron quitadas)
// viven en orden-odoo.ts como funciones puras.
import { db } from "@proges/db";
import type * as contrato from "@proges/contrato";
import { ErrorApi } from "../../errores";
import type { OrdenOdoo } from "../../integraciones/odoo";
import type { Odoo } from "../../integraciones/tipos";
import { aMonto } from "../../util/al-contrato";
import { compararCuenta, planDeOrden, type PartidaExistente, type PlanDeOrden } from "./orden-odoo";
import { exigirAbierto, type servicioParaEscribir } from "./permisos-obra";

type ServicioCargado = Awaited<ReturnType<typeof servicioParaEscribir>>["servicio"];

// Lee la orden en Odoo. Una orden que no existe es 404 con el campo `numero`; Odoo caído, 502.
async function traerOrden(odoo: Odoo, numero: string): Promise<OrdenOdoo> {
  let orden: OrdenOdoo;
  try {
    orden = await odoo.leerOrden(numero);
  } catch (e) {
    const mensaje = e instanceof Error ? e.message : "No se pudo leer la orden en Odoo.";
    if (/^No existe la orden/.test(mensaje)) throw new ErrorApi(404, mensaje, { numero: mensaje });
    throw new ErrorApi(502, `Odoo no respondió: ${mensaje}`);
  }
  if (orden.estado === "cancel") {
    const mensaje = `La orden ${orden.numero} está cancelada en Odoo.`;
    throw new ErrorApi(409, mensaje, { numero: mensaje });
  }
  return orden;
}

// Una orden se enlaza a un solo servicio.
async function exigirOrdenLibre(servicio: ServicioCargado, orden: OrdenOdoo): Promise<void> {
  if (servicio.orden) {
    throw new ErrorApi(409, `Este servicio ya tiene la orden ${servicio.orden.numero}. Usa «actualizar» para ponerla al día.`, {
      numero: "Este servicio ya tiene una orden enlazada.",
    });
  }
  const otra = await db.ordenDueno.findFirst({
    where: { odooOrderId: orden.id },
    select: { servicioEnCurso: { select: { property: { select: { direccion: true } }, servicio: { select: { nombre: true } } } } },
  });
  if (otra) {
    const { property, servicio: catalogo } = otra.servicioEnCurso;
    const mensaje = `La orden ${orden.numero} ya está enlazada a otro servicio: «${catalogo.nombre}» en ${property.direccion}.`;
    throw new ErrorApi(409, mensaje, { numero: mensaje });
  }
}

function avisosDeOrden(orden: OrdenOdoo, plan: PlanDeOrden): string[] {
  const avisos: string[] = [];
  if (orden.estado !== "sale" && orden.estado !== "done") {
    avisos.push(`La orden todavía no está confirmada en Odoo (estado «${orden.estado}»): puede cambiar.`);
  }
  if (plan.totalPartidas === 0) avisos.push("La orden no tiene líneas de trabajo.");
  return avisos;
}

// planDeOrden rechaza una moneda que no sea CLP ni UF con un Error común: hacia la web, un 400.
function planOError(orden: OrdenOdoo, existentes: PartidaExistente[]): PlanDeOrden {
  try {
    return planDeOrden(orden, existentes);
  } catch (e) {
    const mensaje = e instanceof Error ? e.message : "No se pudo leer la orden.";
    throw new ErrorApi(400, mensaje, { numero: mensaje });
  }
}

async function revisionDe(servicio: ServicioCargado, orden: OrdenOdoo, plan: PlanDeOrden): Promise<contrato.OrdenRevision> {
  // Las propiedades del mismo cliente: una cuenta puede cubrir dos deptos.
  const delCliente = await db.property.findMany({
    where: { organizationId: servicio.organizationId },
    select: { id: true, direccion: true, rolSII: true, odooCuentaAnalitica: true },
  });
  const veredicto = compararCuenta(orden.cuentaAnalitica, servicio.property, delCliente);
  return {
    numero: orden.numero,
    clienteOdoo: orden.cliente,
    estadoOdoo: orden.estado,
    total: aMonto(plan.total, plan.moneda),
    facturadoAlDueno: aMonto(plan.facturado, plan.moneda),
    anticipos: plan.anticipos,
    recintos: plan.recintos,
    partidas: plan.totalPartidas,
    cuentaAnalitica: orden.cuentaAnalitica?.codigo ?? null,
    propiedad: servicio.property.direccion,
    veredicto: veredicto.tipo,
    mensajeCuenta: veredicto.mensaje,
    avisos: avisosDeOrden(orden, plan),
  };
}

// Revisa (confirmar = false) o enlaza (confirmar = true) la orden de Odoo a este servicio.
export async function revisarOEnlazarOrden(
  odoo: Odoo,
  servicio: ServicioCargado,
  usuarioId: string,
  numero: string,
  confirmar: boolean,
): Promise<contrato.OrdenRespuesta> {
  exigirAbierto(servicio.estado);
  const orden = await traerOrden(odoo, numero);
  await exigirOrdenLibre(servicio, orden);
  const plan = planOError(orden, []);
  const revision = await revisionDe(servicio, orden, plan);
  if (!confirmar) return { enlazada: false, revision, mensaje: null };

  const orgId = servicio.organizationId;
  // Si la propiedad aún no tiene su cuenta analítica, queda guardada para la próxima orden.
  const cuenta = orden.cuentaAnalitica?.codigo ?? null;
  const guardarCuenta = !servicio.property.odooCuentaAnalitica && cuenta !== null;

  try {
    // Todo o nada: la orden, sus partidas y la cuenta quedan juntas, o no queda nada.
    await db.$transaction(async (tx) => {
      // Se vuelve a mirar dentro de la transacción por si otra persona la enlazó mientras tanto.
      const repetida = await tx.ordenDueno.findFirst({ where: { odooOrderId: orden.id }, select: { id: true } });
      if (repetida) throw new ErrorApi(409, `La orden ${orden.numero} ya está enlazada a otro servicio.`);

      const creada = await tx.ordenDueno.create({
        data: {
          organizationId: orgId,
          servicioEnCursoId: servicio.id,
          numero: orden.numero,
          odooOrderId: orden.id,
          total: plan.total,
          moneda: plan.moneda,
          facturado: plan.facturado,
        },
      });
      await tx.partida.createMany({
        data: plan.nuevas.map((p) => ({
          organizationId: orgId,
          servicioEnCursoId: servicio.id,
          ordenId: creada.id,
          moneda: plan.moneda,
          ...p,
        })),
      });
      if (guardarCuenta) {
        await tx.property.update({
          where: { id: servicio.property.id },
          data: { odooCuentaAnalitica: cuenta, modificadoPorId: usuarioId },
        });
      }
    });
  } catch (e) {
    // Dos personas enlazando el mismo servicio a la vez: la segunda choca con la llave única.
    if ((e as { code?: string }).code === "P2002") throw new ErrorApi(409, "Este servicio ya tiene una orden enlazada.");
    throw e;
  }
  return { enlazada: true, revision, mensaje: `Orden ${orden.numero} enlazada: ${plan.nuevas.length} partidas.` };
}

// Pone al día lo que Odoo cambió sin perder avance, recepción ni maestro.
export async function actualizarOrden(odoo: Odoo, servicio: ServicioCargado): Promise<contrato.OrdenActualizada> {
  exigirAbierto(servicio.estado);
  if (!servicio.orden) throw new ErrorApi(409, "Este servicio todavía no tiene una orden enlazada.");
  const ordenId = servicio.orden.id;

  const orden = await traerOrden(odoo, servicio.orden.numero);
  if (orden.id !== servicio.orden.odooOrderId) {
    throw new ErrorApi(
      409,
      `En Odoo, ${orden.numero} ya no es la misma orden que se enlazó. Avísale a quien administra el portal.`,
    );
  }

  const filas = await db.partida.findMany({ where: { ordenId, servicioEnCursoId: servicio.id } });
  const existentes: PartidaExistente[] = filas.map((f) => ({
    id: f.id,
    odooLineId: f.odooLineId,
    quitadaEnOdoo: f.quitadaEnOdoo,
    recinto: f.recinto,
    codigo: f.codigo,
    descripcion: f.descripcion,
    cantidad: f.cantidad === null ? null : Number(f.cantidad),
    unidad: f.unidad,
    precioDueno: f.precioDueno === null ? null : Number(f.precioDueno),
    posicion: f.posicion,
  }));
  const plan = planOError(orden, existentes);

  const orgId = servicio.organizationId;
  await db.$transaction(
    async (tx) => {
      await tx.ordenDueno.update({
        where: { id: ordenId },
        data: { total: plan.total, moneda: plan.moneda, facturado: plan.facturado, traidaEl: new Date() },
      });
      if (plan.nuevas.length > 0) {
        await tx.partida.createMany({
          data: plan.nuevas.map((p) => ({
            organizationId: orgId,
            servicioEnCursoId: servicio.id,
            ordenId,
            moneda: plan.moneda,
            ...p,
          })),
        });
      }
      // Solo se escriben los campos que vienen de Odoo: avance, recepción y maestro no se tocan.
      for (const a of plan.actualizadas) {
        await tx.partida.update({ where: { id: a.id }, data: a.datos });
      }
      if (plan.quitadas.length > 0) {
        await tx.partida.updateMany({ where: { id: { in: plan.quitadas }, ordenId }, data: { quitadaEnOdoo: true } });
      }
    },
    { timeout: 20_000 },
  );

  const partes: string[] = [];
  if (plan.nuevas.length > 0) partes.push(`${plan.nuevas.length} partidas nuevas`);
  if (plan.actualizadas.length > 0) partes.push(`${plan.actualizadas.length} cambiadas`);
  if (plan.quitadas.length > 0) partes.push(`${plan.quitadas.length} quitadas en Odoo`);
  return {
    nuevas: plan.nuevas.length,
    cambiadas: plan.actualizadas.length,
    quitadasEnOdoo: plan.quitadas.length,
    mensaje: partes.length > 0 ? `Orden al día: ${partes.join(", ")}.` : "La orden ya estaba al día.",
  };
}
