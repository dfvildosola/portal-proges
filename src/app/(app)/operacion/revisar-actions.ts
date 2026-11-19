"use server";

// Revisar un proyecto que nació de un pedido de cliente: aceptarlo (elige el servicio del
// catálogo, quién lo lleva y una nota) o rechazarlo (con motivo).
//
// Son acciones del EQUIPO. El proyecto pertenece al cliente que lo pidió: el espacio donde se
// escribe sale del propio proyecto (espacioParaEscribirEn con SU organizationId), nunca del
// formulario. La lógica y la transacción viven en `src/lib/pedidos.ts`; acá solo se valida lo
// que llega del navegador y se comprueba el permiso.
//
// Dos personas pueden revisar el mismo proyecto a la vez: la primera lo «reclama» y la segunda
// recibe «Otra persona ya lo revisó» (ver `aceptarRevision`).

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { espacioParaEscribirEn } from "@/lib/org";
import { equipoEnAccion } from "@/lib/sesion";
import { optionalText, toFieldErrors } from "@/lib/form-helpers";
import { aceptarRevision, rechazarRevision } from "@/lib/pedidos";

export type RevisionFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  ok?: boolean; // true cuando se guardó: el diálogo se cierra
};

// Después de revisar se vuelven a pintar Trabajo del equipo, Mi trabajo, el contador del menú
// (está en el layout), la ficha de la propiedad y «Mis servicios», donde el cliente ve su pedido.
function revalidar(propertyId: string) {
  revalidatePath("/operacion");
  revalidatePath("/mi-trabajo");
  revalidatePath("/servicios");
  revalidatePath(`/propiedades/${propertyId}`);
  revalidatePath("/", "layout");
}

// El espacio del proyecto, con el permiso de escritura ya comprobado. null si no existe.
async function espacioDelProyecto(servicioEnCursoId: string): Promise<string | null> {
  const proyecto = await db.servicioEnCurso.findUnique({
    where: { id: servicioEnCursoId },
    select: { organizationId: true },
  });
  if (!proyecto) return null;
  return espacioParaEscribirEn(proyecto.organizationId);
}

// ---------------------------------------------------------------------------
// Aceptar
// ---------------------------------------------------------------------------

const revisarSchema = z.object({
  servicioEnCursoId: z.string().min(1, "Falta el proyecto"),
  servicioId: z.string().min(1, "Elige el servicio del catálogo"),
  responsableId: optionalText,
  nota: optionalText.refine((v) => v === null || v.length <= 2000, {
    message: "Máximo 2000 caracteres",
  }),
});

export async function revisarProyecto(
  _prev: RevisionFormState,
  formData: FormData,
): Promise<RevisionFormState> {
  const usuario = await equipoEnAccion();

  const parsed = revisarSchema.safeParse({
    servicioEnCursoId: formData.get("servicioEnCursoId") ?? "",
    servicioId: formData.get("servicioId") ?? "",
    responsableId: formData.get("responsableId") ?? "",
    nota: formData.get("nota") ?? "",
  });
  if (!parsed.success) {
    return { error: "Revisa los campos.", fieldErrors: toFieldErrors(parsed.error) };
  }
  const { servicioEnCursoId, servicioId, responsableId, nota } = parsed.data;

  const orgId = await espacioDelProyecto(servicioEnCursoId);
  if (!orgId) return { error: "El proyecto no existe." };

  const resultado = await aceptarRevision({
    orgId,
    servicioEnCursoId,
    servicioCatalogoId: servicioId,
    responsableId,
    nota,
    usuarioId: usuario.id,
  });
  if (!resultado.ok) return { error: resultado.error, fieldErrors: resultado.fieldErrors };

  revalidar(resultado.propertyId);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Rechazar
// ---------------------------------------------------------------------------

const rechazarSchema = z.object({
  servicioEnCursoId: z.string().min(1, "Falta el proyecto"),
  motivo: z.string().trim().min(1, "Escribe por qué se rechaza").max(2000, "Máximo 2000 caracteres"),
});

// El motivo es obligatorio: el cliente lo ve en su pedido.
export async function rechazarProyecto(
  _prev: RevisionFormState,
  formData: FormData,
): Promise<RevisionFormState> {
  const usuario = await equipoEnAccion();

  const parsed = rechazarSchema.safeParse({
    servicioEnCursoId: formData.get("servicioEnCursoId") ?? "",
    motivo: formData.get("motivo") ?? "",
  });
  if (!parsed.success) {
    return { error: "Revisa los campos.", fieldErrors: toFieldErrors(parsed.error) };
  }
  const { servicioEnCursoId, motivo } = parsed.data;

  const orgId = await espacioDelProyecto(servicioEnCursoId);
  if (!orgId) return { error: "El proyecto no existe." };

  const resultado = await rechazarRevision({
    orgId,
    servicioEnCursoId,
    motivo,
    usuarioId: usuario.id,
  });
  if (!resultado.ok) return { error: resultado.error, fieldErrors: resultado.fieldErrors };

  revalidar(resultado.propertyId);
  return { ok: true };
}
