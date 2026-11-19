"use server";

// Recepción de la obra, partida por partida (Pieza E, d16).
//
// Cuando el maestro dice que terminó una partida, el equipo la revisa y la recibe: CONFORME (está
// bien) u OBSERVADA (hay algo que corregir; con la observación y, si quiere, fotos). Una observada
// abre una tarea «Corregir: …» para que alguien la arregle. Volver a recibir una observada como
// conforme deja hecha esa tarea. Una obra no se cierra con partidas pendientes u observadas (eso
// lo exige el cierre, con obraSePuedeCerrar de src/lib/obra.ts).
//
// Es trabajo del equipo. El espacio sale de la partida que se toca, nunca del navegador. Las fotos
// se suben primero a Drive y recién después se guarda todo junto: si una foto falla, la recepción
// no se guarda a medias y se devuelve el error para volver a intentar.

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { espacioParaEscribirEn } from "@/lib/org";
import { equipoEnAccion } from "@/lib/sesion";
import { subirArchivo } from "@/lib/archivos";
import { toFieldErrors } from "@/lib/form-helpers";
import { MAX_BYTES_FOTO, MAX_FOTOS_POR_NOTA } from "./bitacora-limites";

export type RecepcionFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  ok?: boolean;
};

const TIPOS_DE_FOTO: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

const recepcionSchema = z.object({
  partidaId: z.string().min(1),
  resultado: z.enum(["CONFORME", "OBSERVADA"], { message: "Elige conforme u observada" }),
  observacion: z
    .string()
    .trim()
    .max(500, "Máximo 500 caracteres")
    .optional()
    .transform((v) => (v === undefined || v === "" ? null : v)),
  responsableId: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === undefined || v === "" ? null : v)),
});

// El texto de la tarea que abre una observada: «Corregir: <partida>: <observación>».
function textoDeTarea(descripcion: string, observacion: string): string {
  const corta = descripcion.length > 80 ? `${descripcion.slice(0, 77)}…` : descripcion;
  return `Corregir: ${corta}: ${observacion}`;
}

export async function recibirPartida(_prev: RecepcionFormState, formData: FormData): Promise<RecepcionFormState> {
  const usuario = await equipoEnAccion();

  const parsed = recepcionSchema.safeParse({
    partidaId: formData.get("partidaId"),
    resultado: formData.get("resultado"),
    observacion: formData.get("observacion") ?? undefined,
    responsableId: formData.get("responsableId") ?? undefined,
  });
  if (!parsed.success) {
    return { error: "Revisa los campos.", fieldErrors: toFieldErrors(parsed.error) };
  }
  const { partidaId, resultado, observacion, responsableId } = parsed.data;

  if (resultado === "OBSERVADA" && !observacion) {
    return { fieldErrors: { observacion: "Cuenta qué hay que corregir" } };
  }

  const fotos = formData.getAll("fotos").filter((f): f is File => f instanceof File && f.size > 0);
  if (fotos.length > MAX_FOTOS_POR_NOTA) {
    return { fieldErrors: { fotos: `Máximo ${MAX_FOTOS_POR_NOTA} fotos` } };
  }
  for (const f of fotos) {
    if (!TIPOS_DE_FOTO[f.type]) return { fieldErrors: { fotos: "Solo se aceptan fotos JPG, PNG o WebP" } };
    if (f.size > MAX_BYTES_FOTO) return { fieldErrors: { fotos: "Una foto pesa demasiado: prueba con otra" } };
  }

  const partida = await db.partida.findUnique({
    where: { id: partidaId },
    select: {
      id: true,
      organizationId: true,
      servicioEnCursoId: true,
      descripcion: true,
      quitadaEnOdoo: true,
      servicioEnCurso: { select: { propertyId: true, property: { select: { driveCarpetaId: true } } } },
    },
  });
  if (!partida) return { error: "Esa partida no existe." };
  const orgId = await espacioParaEscribirEn(partida.organizationId);
  if (partida.quitadaEnOdoo) return { error: "Esa partida ya no está en la orden de Odoo." };

  // El responsable, si viene, tiene que ser alguien activo del equipo (el id viene del navegador).
  if (responsableId) {
    const responsable = await db.usuario.findFirst({
      where: { id: responsableId, rol: "EQUIPO", activo: true },
      select: { id: true },
    });
    if (!responsable) return { fieldErrors: { responsableId: "Esa persona no está disponible." } };
  }

  // Las fotos, a la carpeta «Portal» de la propiedad, antes de guardar nada.
  const subidas: { driveFileId: string; nombre: string; mime: string }[] = [];
  for (const [i, foto] of fotos.entries()) {
    try {
      const { driveFileId } = await subirArchivo({
        property: partida.servicioEnCurso.property,
        nombre: `recepcion-${partida.id}-${Date.now()}-${i + 1}.${TIPOS_DE_FOTO[foto.type]}`,
        mime: foto.type,
        datos: Buffer.from(await foto.arrayBuffer()),
      });
      subidas.push({ driveFileId, nombre: foto.name || `foto-${i + 1}`, mime: foto.type });
    } catch (e) {
      return {
        error: `No se pudo subir la foto ${i + 1}: ${e instanceof Error ? e.message : "error desconocido"}. No se guardó nada: vuelve a intentar.`,
      };
    }
  }

  const ahora = new Date();
  await db.$transaction(async (tx) => {
    await tx.partida.update({
      where: { id: partida.id },
      data: {
        recepcion: resultado,
        // En conforme, si no se escribió nada se deja la última observación como historia.
        ...(resultado === "OBSERVADA" || observacion ? { observacion } : {}),
        recibidaEl: ahora,
        recibidaPorId: usuario.id,
      },
    });

    if (resultado === "OBSERVADA") {
      // Una sola tarea abierta por partida: si ya había una, se actualiza en vez de duplicarla.
      const texto = textoDeTarea(partida.descripcion, observacion as string);
      const abierta = await tx.tarea.findFirst({
        where: { partidaId: partida.id, organizationId: orgId, hechaEl: null },
        select: { id: true },
      });
      if (abierta) {
        await tx.tarea.update({
          where: { id: abierta.id },
          data: { que: texto, ...(responsableId ? { responsableId } : {}) },
        });
      } else {
        await tx.tarea.create({
          data: {
            organizationId: orgId,
            servicioEnCursoId: partida.servicioEnCursoId,
            que: texto,
            responsableId,
            creadaPorId: usuario.id,
            partidaId: partida.id,
          },
        });
      }
    } else {
      // Conforme: la tarea de corregir (si había) queda hecha.
      await tx.tarea.updateMany({
        where: { partidaId: partida.id, organizationId: orgId, hechaEl: null },
        data: { hechaEl: ahora, hechaPorId: usuario.id },
      });
    }

    for (const s of subidas) {
      await tx.foto.create({ data: { organizationId: orgId, partidaId: partida.id, ...s } });
    }
  });

  revalidatePath(`/propiedades/${partida.servicioEnCurso.propertyId}/servicios/${partida.servicioEnCursoId}`);
  return { ok: true };
}
