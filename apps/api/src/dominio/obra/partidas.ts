// Avance y maestro de las partidas de una obra (ADR 0014).
//
// El avance se marca por recinto (aplica a todas sus líneas) con 0, 25, 50, 75 o 100 %, y si hace
// falta se afina línea por línea. Una partida que Odoo ya no trae no se toca: no cuenta.
import { db, ORG_PROGES } from "@proges/db";
import type * as contrato from "@proges/contrato";
import type { Quien } from "../../acceso/quien";
import { ErrorApi } from "../../errores";
import { espacioParaEscribirEn, exigirEquipo } from "../../permisos";
import { exigirAbierto, servicioParaEscribir } from "./permisos-obra";

// Cambia el avance y/o el maestro de una partida.
export async function cambiarPartida(quien: Quien, partidaId: string, cambio: contrato.PartidaCambio): Promise<void> {
  exigirEquipo(quien);
  if (cambio.avance === undefined && cambio.maestroId === undefined) {
    throw new ErrorApi(400, "No hay nada que cambiar: manda el avance o el maestro.", {
      avance: "Manda el avance o el maestro.",
    });
  }
  const partida = await db.partida.findUnique({
    where: { id: partidaId },
    select: { id: true, organizationId: true, quitadaEnOdoo: true, servicioEnCurso: { select: { estado: true } } },
  });
  await espacioParaEscribirEn(quien, partida?.organizationId);
  if (!partida) throw new ErrorApi(404, "No se encontró lo que buscas."); // solo para TypeScript: ya dio 404 arriba
  exigirAbierto(partida.servicioEnCurso.estado);
  if (partida.quitadaEnOdoo) throw new ErrorApi(409, "Esa partida ya no está en la orden de Odoo.");

  if (cambio.maestroId) {
    // El maestro vive en el espacio de Proges y tiene que estar activo (el id viene de la web).
    const maestro = await db.maestro.findFirst({
      where: { id: cambio.maestroId, organizationId: ORG_PROGES, activo: true },
      select: { id: true },
    });
    if (!maestro) throw new ErrorApi(400, "Ese maestro no está disponible.", { maestroId: "Ese maestro no está disponible." });
  }

  await db.partida.update({
    where: { id: partida.id },
    data: {
      ...(cambio.avance !== undefined ? { avance: cambio.avance } : {}),
      ...(cambio.maestroId !== undefined ? { maestroId: cambio.maestroId } : {}),
    },
  });
}

// Marca el avance de TODAS las líneas vigentes de un recinto. `recinto` null = las líneas sin recinto.
export async function avanceDeRecinto(quien: Quien, servicioId: string, pedido: contrato.AvanceRecinto): Promise<number> {
  const { orgId, servicio } = await servicioParaEscribir(quien, servicioId);
  exigirAbierto(servicio.estado);
  const { count } = await db.partida.updateMany({
    where: { servicioEnCursoId: servicio.id, organizationId: orgId, recinto: pedido.recinto, quitadaEnOdoo: false },
    data: { avance: pedido.avance },
  });
  if (count === 0) throw new ErrorApi(404, "Ese recinto no tiene partidas vigentes.");
  return count;
}
