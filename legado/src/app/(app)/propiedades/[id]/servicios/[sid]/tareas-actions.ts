"use server";

// Acciones sobre las tareas de un proyecto: agregar, editar, marcar hecha o deshacer, y borrar.
//
// Son del EQUIPO (equipoEnAccion). Cualquiera del equipo anota y marca tareas: la jefatura
// reparte, pero no se bloquea a nadie (ADR 0013). El espacio donde se escribe sale del
// proyecto o de la tarea (espacioParaEscribirEn con SU organizationId), nunca del formulario,
// y el responsable se comprueba contra el equipo activo de Proges.

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { espacioParaEscribirEn, ORG_PROGES } from "@/lib/org";
import { equipoEnAccion } from "@/lib/sesion";
import { PROYECTO_CERRADO } from "@/lib/servicios";
import { optionalDateField, optionalText, toFieldErrors } from "@/lib/form-helpers";

export type TareaFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  ok?: boolean; // true cuando se guardó: el formulario se cierra o se vacía
};

const queField = z.string().trim().min(1, "Escribe qué hay que hacer").max(300, "Máximo 300 caracteres");

// Después de cualquier cambio se vuelven a pintar las tres pantallas que muestran tareas.
function revalidar(propertyId: string, servicioId: string) {
  revalidatePath("/mi-trabajo");
  revalidatePath("/operacion");
  revalidatePath(`/propiedades/${propertyId}/servicios/${servicioId}`);
}

// Un responsable tiene que ser del equipo activo de Proges (o ninguno).
async function responsableValido(responsableId: string | null): Promise<boolean> {
  if (responsableId === null) return true;
  const r = await db.usuario.findFirst({
    where: { id: responsableId, organizationId: ORG_PROGES, rol: "EQUIPO", activo: true },
    select: { id: true },
  });
  return r !== null;
}

// La tarea y su proyecto, con el permiso ya comprobado. null si no existe.
async function tareaEscribible(tareaId: string) {
  const tarea = await db.tarea.findUnique({
    where: { id: tareaId },
    select: {
      id: true,
      organizationId: true,
      hechaEl: true,
      servicioEnCursoId: true,
      servicioEnCurso: { select: { propertyId: true } },
    },
  });
  if (!tarea) return null;
  await espacioParaEscribirEn(tarea.organizationId);
  return tarea;
}

// ---------------------------------------------------------------------------
// Agregar
// ---------------------------------------------------------------------------

const agregarSchema = z.object({
  servicioEnCursoId: z.string().min(1, "Falta el proyecto"),
  que: queField,
  responsableId: optionalText,
  vence: optionalDateField(),
});

export async function agregarTarea(
  _prev: TareaFormState,
  formData: FormData,
): Promise<TareaFormState> {
  const usuario = await equipoEnAccion();

  const parsed = agregarSchema.safeParse({
    servicioEnCursoId: formData.get("servicioEnCursoId") ?? "",
    que: formData.get("que") ?? "",
    responsableId: formData.get("responsableId") ?? "",
    vence: formData.get("vence") ?? "",
  });
  if (!parsed.success) {
    return { error: "Revisa los campos.", fieldErrors: toFieldErrors(parsed.error) };
  }
  const { servicioEnCursoId, que, responsableId, vence } = parsed.data;

  const proyecto = await db.servicioEnCurso.findUnique({
    where: { id: servicioEnCursoId },
    select: { id: true, organizationId: true, propertyId: true, estado: true },
  });
  if (!proyecto) return { error: "El proyecto no existe." };
  const orgId = await espacioParaEscribirEn(proyecto.organizationId);
  if (proyecto.estado !== "ABIERTO") return { error: PROYECTO_CERRADO };

  if (!(await responsableValido(responsableId))) {
    return {
      error: "El responsable no es del equipo.",
      fieldErrors: { responsableId: "El responsable no es del equipo." },
    };
  }

  await db.tarea.create({
    data: {
      organizationId: orgId,
      servicioEnCursoId: proyecto.id,
      que,
      responsableId,
      vence,
      creadaPorId: usuario.id,
    },
  });

  revalidar(proyecto.propertyId, proyecto.id);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Editar
// ---------------------------------------------------------------------------

const editarSchema = z.object({
  tareaId: z.string().min(1, "Falta la tarea"),
  que: queField,
  responsableId: optionalText,
  vence: optionalDateField(),
});

// Solo se edita una tarea que no está hecha: una hecha se deshace primero.
export async function editarTarea(
  _prev: TareaFormState,
  formData: FormData,
): Promise<TareaFormState> {
  await equipoEnAccion();

  const parsed = editarSchema.safeParse({
    tareaId: formData.get("tareaId") ?? "",
    que: formData.get("que") ?? "",
    responsableId: formData.get("responsableId") ?? "",
    vence: formData.get("vence") ?? "",
  });
  if (!parsed.success) {
    return { error: "Revisa los campos.", fieldErrors: toFieldErrors(parsed.error) };
  }
  const { tareaId, que, responsableId, vence } = parsed.data;

  const tarea = await tareaEscribible(tareaId);
  if (!tarea) return { error: "La tarea no existe." };

  if (!(await responsableValido(responsableId))) {
    return {
      error: "El responsable no es del equipo.",
      fieldErrors: { responsableId: "El responsable no es del equipo." },
    };
  }

  // `hechaEl: null` en el filtro: si otra persona la marcó hecha justo antes, no se pisa.
  const { count } = await db.tarea.updateMany({
    where: { id: tarea.id, organizationId: tarea.organizationId, hechaEl: null },
    data: { que, responsableId, vence },
  });
  if (count !== 1) return { error: "La tarea ya está hecha: deshazla antes de editarla." };

  revalidar(tarea.servicioEnCurso.propertyId, tarea.servicioEnCursoId);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Marcar hecha / deshacer
// ---------------------------------------------------------------------------

const marcarSchema = z.object({
  tareaId: z.string().min(1, "Falta la tarea"),
  hecha: z.enum(["1", "0"]),
});

export async function marcarTarea(
  _prev: TareaFormState,
  formData: FormData,
): Promise<TareaFormState> {
  const usuario = await equipoEnAccion();

  const parsed = marcarSchema.safeParse({
    tareaId: formData.get("tareaId") ?? "",
    hecha: formData.get("hecha") ?? "",
  });
  if (!parsed.success) return { error: "No se entendió qué marcar." };
  const { tareaId, hecha } = parsed.data;

  const tarea = await tareaEscribible(tareaId);
  if (!tarea) return { error: "La tarea no existe." };

  // El filtro por estado evita pisar un cambio de otra persona: marcar solo sirve si sigue
  // abierta, y deshacer solo si sigue hecha.
  const { count } =
    hecha === "1"
      ? await db.tarea.updateMany({
          where: { id: tarea.id, organizationId: tarea.organizationId, hechaEl: null },
          data: { hechaEl: new Date(), hechaPorId: usuario.id },
        })
      : await db.tarea.updateMany({
          where: { id: tarea.id, organizationId: tarea.organizationId, hechaEl: { not: null } },
          data: { hechaEl: null, hechaPorId: null },
        });
  if (count !== 1) {
    return { error: hecha === "1" ? "Esa tarea ya estaba hecha." : "Esa tarea ya estaba abierta." };
  }

  revalidar(tarea.servicioEnCurso.propertyId, tarea.servicioEnCursoId);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Borrar
// ---------------------------------------------------------------------------

// Solo se borra una tarea sin hacer: lo hecho queda como historia del proyecto.
export async function borrarTarea(
  _prev: TareaFormState,
  formData: FormData,
): Promise<TareaFormState> {
  await equipoEnAccion();

  const tareaId = String(formData.get("tareaId") ?? "");
  if (!tareaId) return { error: "Falta la tarea." };

  const tarea = await tareaEscribible(tareaId);
  if (!tarea) return { error: "La tarea no existe." };

  const { count } = await db.tarea.deleteMany({
    where: { id: tarea.id, organizationId: tarea.organizationId, hechaEl: null },
  });
  if (count !== 1) return { error: "Una tarea hecha no se borra: deshazla antes." };

  revalidar(tarea.servicioEnCurso.propertyId, tarea.servicioEnCursoId);
  return { ok: true };
}
