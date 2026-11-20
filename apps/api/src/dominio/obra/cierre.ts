// Cerrar una obra (ADR 0014, punto 5 y 7). Solo la jefatura.
//
// Una obra solo se cierra cuando TODAS sus partidas vigentes están recibidas conforme (decisión
// d16): ninguna pendiente ni observada, y al menos una. Es la regla de `resumenRecepcion` de
// obra.ts; aquí se comprueba en el servidor dentro de la misma transacción que cierra, para que dos
// jefaturas apretando a la vez no cierren dos veces.
import { db } from "@proges/db";
import type * as contrato from "@proges/contrato";
import type { Quien } from "../../acceso/quien";
import { ErrorApi } from "../../errores";
import type { Odoo } from "../../integraciones/tipos";
import { espacioParaEscribirEn, exigirJefatura } from "../../permisos";
import { aFechaHoraISO } from "../../util/al-contrato";
import { cargarDatosDeObra } from "./datos";
import { textoONull } from "./formulario";
import { resumenRecepcion } from "./obra";
import { exigirAbierto } from "./permisos-obra";
import { planContraRealAContrato, planDeLaObra } from "./recorte";

export async function cerrarObra(
  quien: Quien,
  odoo: Odoo,
  servicioId: string,
  motivo: string | undefined,
): Promise<contrato.CierreRespuesta> {
  exigirJefatura(quien);
  const servicio = await db.servicioEnCurso.findUnique({
    where: { id: servicioId },
    select: { id: true, organizationId: true, estado: true, porRevisar: true },
  });
  const orgId = await espacioParaEscribirEn(quien, servicio?.organizationId);
  if (!servicio) throw new ErrorApi(404, "No se encontró lo que buscas."); // ya dio 404 arriba
  exigirAbierto(servicio.estado);
  if (servicio.porRevisar) throw new ErrorApi(409, "Este servicio todavía está por revisar.");

  const cerradoEl = await db.$transaction(async (tx) => {
    const partidas = await tx.partida.findMany({
      where: { servicioEnCursoId: servicio.id, organizationId: orgId, quitadaEnOdoo: false },
      select: { avance: true, recepcion: true },
    });
    const r = resumenRecepcion(partidas);
    if (r.total === 0) {
      throw new ErrorApi(409, "Este servicio no tiene partidas que recibir. Enlaza la orden de Odoo antes de cerrarlo.");
    }
    if (r.pendientes > 0 || r.observadas > 0) {
      const faltan = [r.pendientes > 0 ? `${r.pendientes} por recibir` : null, r.observadas > 0 ? `${r.observadas} observadas` : null]
        .filter(Boolean)
        .join(" y ");
      throw new ErrorApi(409, `No se puede cerrar: quedan partidas ${faltan}.`);
    }
    const ahora = new Date();
    const { count } = await tx.servicioEnCurso.updateMany({
      where: { id: servicio.id, organizationId: orgId, estado: "ABIERTO" },
      data: { estado: "TERMINADO", cerradoEl: ahora, motivoCierre: textoONull(motivo) },
    });
    if (count === 0) throw new ErrorApi(409, "Este servicio ya está cerrado: no se puede cambiar.");
    return ahora;
  });

  // Lo planificado contra lo real, con el día del cierre como «hasta».
  const datos = await cargarDatosDeObra(odoo, { id: servicio.id, organizationId: orgId });
  return { servicioId: servicio.id, cerradoEl: aFechaHoraISO(cerradoEl), planContraReal: planContraRealAContrato(planDeLaObra(datos)) };
}
