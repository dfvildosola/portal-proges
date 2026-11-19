"use server";

// Cerrar una obra (Pieza F). Solo la jefatura. Una obra solo se cierra cuando TODAS sus partidas
// vigentes están recibidas conforme (decisión d16): ninguna pendiente ni observada. Es la misma
// regla de `obraSePuedeCerrar` / `resumenRecepcion` de src/lib/obra.ts; acá se vuelve a comprobar
// en el servidor porque el botón de la pantalla es solo una comodidad.
//
// El espacio sale del proyecto leído, nunca de algo que mande el navegador.

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { espacioParaEscribirEn, ORG_PROGES } from "@/lib/org";
import { jefaturaEnAccion } from "@/lib/sesion";
import { PROYECTO_CERRADO } from "@/lib/servicios";
import { resumenRecepcion } from "@/lib/obra";
import { toFieldErrors } from "@/lib/form-helpers";

export type CierreFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  ok?: boolean; // true cuando quedó cerrada: el diálogo usa esto para cerrarse
};

const schema = z.object({
  servicioEnCursoId: z.string().min(1),
  // El motivo es optativo: una nota para quien lea el cierre después.
  motivo: z
    .string()
    .trim()
    .max(500, "La nota es muy larga")
    .transform((v) => (v === "" ? null : v)),
});

export async function cerrarObra(_prev: CierreFormState, formData: FormData): Promise<CierreFormState> {
  const usuario = await jefaturaEnAccion();

  const parsed = schema.safeParse({
    servicioEnCursoId: formData.get("servicioEnCursoId"),
    motivo: formData.get("motivo") ?? "",
  });
  if (!parsed.success) {
    return { error: "Revisa los campos.", fieldErrors: toFieldErrors(parsed.error) };
  }

  const servicio = await db.servicioEnCurso.findUnique({
    where: { id: parsed.data.servicioEnCursoId },
    select: {
      id: true,
      organizationId: true,
      propertyId: true,
      estado: true,
      porRevisar: true,
      tipo: true,
      etapa: { select: { nombre: true } },
    },
  });
  if (!servicio) return { error: "Ese proyecto no existe." };
  // Lanza «Sin permiso» si el proyecto es de un espacio que esta persona no puede escribir.
  const orgId = await espacioParaEscribirEn(servicio.organizationId);

  if (servicio.estado !== "ABIERTO") return { error: PROYECTO_CERRADO };
  if (servicio.porRevisar) return { error: "Este proyecto todavía está por revisar." };

  // La etapa que cierra el servicio, para que el tablero y el historial muestren la obra en su
  // última etapa y no dejen una obra TERMINADA parada en «En ejecución». Es la misma que usa
  // moverEtapa (etapas de Proges de este tipo). Si el tipo no tiene una, solo cambia el estado.
  const etapaDeCierre = await db.etapa.findFirst({
    where: { organizationId: ORG_PROGES, tipo: servicio.tipo, activa: true, cierraServicio: true },
    orderBy: { orden: "asc" },
    select: { id: true, nombre: true },
  });

  // Todo en una transacción: se cuentan las partidas y se cierra en el mismo paso, y el
  // `updateMany` con `estado: ABIERTO` evita cerrar dos veces si dos jefaturas aprietan a la vez.
  const resultado = await db.$transaction(async (tx) => {
    const partidas = await tx.partida.findMany({
      where: { servicioEnCursoId: servicio.id, organizationId: orgId, quitadaEnOdoo: false },
      select: { avance: true, recepcion: true },
    });
    const r = resumenRecepcion(partidas);
    if (r.total === 0) {
      return { error: "Este proyecto no tiene partidas que recibir. Enlaza la orden de Odoo antes de cerrarlo." };
    }
    if (r.pendientes > 0 || r.observadas > 0) {
      const faltan = [
        r.pendientes > 0 ? `${r.pendientes} por recibir` : null,
        r.observadas > 0 ? `${r.observadas} observadas` : null,
      ]
        .filter(Boolean)
        .join(" y ");
      return { error: `No se puede cerrar: quedan partidas ${faltan}.` };
    }
    const ahora = new Date();
    const { count } = await tx.servicioEnCurso.updateMany({
      where: { id: servicio.id, organizationId: orgId, estado: "ABIERTO" },
      data: {
        estado: "TERMINADO",
        cerradoEl: ahora,
        motivoCierre: parsed.data.motivo,
        ...(etapaDeCierre ? { etapaId: etapaDeCierre.id } : {}),
      },
    });
    if (count === 0) return { error: PROYECTO_CERRADO };
    // El mismo Evento que deja moverEtapa, en la misma transacción: o quedan las dos cosas o ninguna.
    if (etapaDeCierre) {
      await tx.evento.create({
        data: {
          organizationId: orgId,
          servicioEnCursoId: servicio.id,
          tipo: "ETAPA",
          etapaId: etapaDeCierre.id,
          anterior: servicio.etapa.nombre,
          nuevo: etapaDeCierre.nombre,
          motivo: parsed.data.motivo,
          autorId: usuario.id,
          fecha: ahora,
        },
      });
    }
    return { ok: true as const };
  });
  if ("error" in resultado) return { error: resultado.error };

  revalidatePath(`/propiedades/${servicio.propertyId}/servicios/${servicio.id}`);
  revalidatePath(`/propiedades/${servicio.propertyId}`);
  revalidatePath("/operacion");
  revalidatePath("/mi-trabajo");
  return { ok: true };
}
