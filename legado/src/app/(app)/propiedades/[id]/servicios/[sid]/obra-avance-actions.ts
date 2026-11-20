"use server";

// Avance de las partidas de una obra (Pieza E).
//
// El avance se marca por recinto (aplica a todas sus líneas) con 0, 25, 50, 75 o 100 %, y si
// hace falta se afina línea por línea. En un servicio suelto (sin recintos) cada línea es una
// casilla: marcada = 100 %. Una partida que Odoo ya no trae no se toca: no cuenta.
//
// Es trabajo del equipo. El espacio donde se escribe sale del proyecto o de la partida que se
// toca, nunca de algo que mande el navegador.

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { espacioParaEscribirEn } from "@/lib/org";
import { PROYECTO_CERRADO } from "@/lib/servicios";
import { equipoEnAccion } from "@/lib/sesion";

export type AvanceFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  ok?: boolean;
};

const avanceSchema = z.coerce
  .number()
  .refine((n) => [0, 25, 50, 75, 100].includes(n), { message: "El avance es 0, 25, 50, 75 o 100" });

function recargar(propertyId: string, servicioId: string) {
  revalidatePath(`/propiedades/${propertyId}/servicios/${servicioId}`);
}

// Marca el avance de TODAS las líneas de un recinto. `recinto` vacío = las líneas sin recinto.
export async function marcarAvanceRecinto(_prev: AvanceFormState, formData: FormData): Promise<AvanceFormState> {
  await equipoEnAccion();

  const servicioId = String(formData.get("servicioEnCursoId") ?? "");
  const recinto = String(formData.get("recinto") ?? "");
  const avance = avanceSchema.safeParse(formData.get("avance"));
  if (!servicioId) return { error: "Falta el proyecto." };
  if (!avance.success) return { error: avance.error.issues[0]?.message ?? "Avance inválido" };

  const servicio = await db.servicioEnCurso.findUnique({
    where: { id: servicioId },
    select: { id: true, propertyId: true, organizationId: true, estado: true },
  });
  if (!servicio) return { error: "Ese proyecto no existe." };
  const orgId = await espacioParaEscribirEn(servicio.organizationId);
  if (servicio.estado !== "ABIERTO") return { error: PROYECTO_CERRADO };

  const { count } = await db.partida.updateMany({
    where: {
      servicioEnCursoId: servicio.id,
      organizationId: orgId,
      recinto: recinto === "" ? null : recinto,
      quitadaEnOdoo: false,
    },
    data: { avance: avance.data },
  });
  if (count === 0) return { error: "Ese recinto no tiene partidas vigentes." };

  recargar(servicio.propertyId, servicio.id);
  return { ok: true };
}

// Marca el avance de una sola partida (la línea dentro de un recinto, o la casilla de un
// servicio suelto).
export async function marcarAvancePartida(_prev: AvanceFormState, formData: FormData): Promise<AvanceFormState> {
  await equipoEnAccion();

  const partidaId = String(formData.get("partidaId") ?? "");
  const avance = avanceSchema.safeParse(formData.get("avance"));
  if (!partidaId) return { error: "Falta la partida." };
  if (!avance.success) return { error: avance.error.issues[0]?.message ?? "Avance inválido" };

  const partida = await db.partida.findUnique({
    where: { id: partidaId },
    select: {
      id: true,
      organizationId: true,
      quitadaEnOdoo: true,
      servicioEnCurso: { select: { id: true, propertyId: true, estado: true } },
    },
  });
  if (!partida) return { error: "Esa partida no existe." };
  await espacioParaEscribirEn(partida.organizationId);
  if (partida.servicioEnCurso.estado !== "ABIERTO") return { error: PROYECTO_CERRADO };
  if (partida.quitadaEnOdoo) return { error: "Esa partida ya no está en la orden de Odoo." };

  await db.partida.update({ where: { id: partida.id }, data: { avance: avance.data } });
  recargar(partida.servicioEnCurso.propertyId, partida.servicioEnCurso.id);
  return { ok: true };
}
