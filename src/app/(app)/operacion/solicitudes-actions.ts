"use server";

// Responder una solicitud de un cliente: aceptarla (abre el servicio) o rechazarla (con motivo).
//
// Son acciones del EQUIPO. A diferencia de las demás acciones de servicios, NO usan el cliente
// activo: una solicitud pertenece al cliente que la pidió, y el servicio que se abre al aceptarla
// queda en ESE espacio, aunque el equipo esté mirando a otro cliente en la cabecera.
//
// Dos personas del equipo pueden responder la misma solicitud a la vez. Para que no se pisen,
// la primera en llegar la «reclama» con un updateMany que solo funciona si sigue NUEVA; la
// segunda recibe «Otra persona ya la resolvió». Es como la ventanilla con un solo número:
// el que llega segundo ve que ya lo atendieron.

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { ORG_PROGES } from "@/lib/org";
import { equipoEnAccion } from "@/lib/sesion";
import { assertProperty, optionalText, toFieldErrors } from "@/lib/form-helpers";
import { familiasDelTipo } from "@/lib/servicios";

export type SolicitudFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  ok?: boolean; // true cuando se guardó: el diálogo se cierra
};

const YA_RESUELTA = "Otra persona ya la resolvió.";

// Después de responder se vuelve a pintar la bandeja, el contador del menú (está en el layout)
// y la ficha de la propiedad, donde el cliente ve el estado de su pedido.
function revalidar(propertyId: string) {
  revalidatePath("/operacion");
  revalidatePath(`/propiedades/${propertyId}`);
  revalidatePath("/", "layout");
}

// ---------------------------------------------------------------------------
// Aceptar
// ---------------------------------------------------------------------------

const aceptarSchema = z.object({
  solicitudId: z.string().min(1, "Falta la solicitud"),
  servicioId: z.string().min(1, "Elige el servicio del catálogo"),
  responsableId: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : null)),
  nota: optionalText.refine((v) => v === null || v.length <= 2000, {
    message: "Máximo 2000 caracteres",
  }),
});

// Acepta la solicitud: abre el servicio del catálogo en la primera etapa activa de su tipo,
// con su primer Evento, y deja la solicitud enlazada a él. Todo en una transacción: o quedan
// las tres cosas (solicitud aceptada, servicio y evento), o ninguna.
export async function aceptarSolicitud(
  _prev: SolicitudFormState,
  formData: FormData,
): Promise<SolicitudFormState> {
  const usuario = await equipoEnAccion();

  const parsed = aceptarSchema.safeParse({
    solicitudId: formData.get("solicitudId") ?? "",
    servicioId: formData.get("servicioId") ?? "",
    responsableId: formData.get("responsableId") ?? "",
    nota: formData.get("nota") ?? "",
  });
  if (!parsed.success) {
    return { error: "Revisa los campos.", fieldErrors: toFieldErrors(parsed.error) };
  }
  const { solicitudId, servicioId, responsableId, nota } = parsed.data;

  const solicitud = await db.solicitud.findUnique({
    where: { id: solicitudId },
    select: { id: true, estado: true, organizationId: true, propertyId: true, tipo: true },
  });
  if (!solicitud) return { error: "La solicitud no existe." };
  if (solicitud.estado !== "NUEVA") return { error: YA_RESUELTA };

  // La propiedad debe ser del cliente de la solicitud (no del cliente activo).
  if (!(await assertProperty(solicitud.propertyId, solicitud.organizationId))) {
    return { error: "La propiedad de esta solicitud ya no existe." };
  }

  // El catálogo y las etapas son de Proges: se leen de ORG_PROGES, nunca del cliente.
  const catalogo = await db.servicio.findFirst({
    where: { id: servicioId, organizationId: ORG_PROGES, activo: true },
    select: { id: true, familia: true },
  });
  if (!catalogo) return { error: "El servicio elegido no existe en el catálogo." };
  if (!familiasDelTipo(solicitud.tipo).includes(catalogo.familia)) {
    return {
      error: "Ese servicio del catálogo no corresponde al tipo pedido.",
      fieldErrors: { servicioId: "No corresponde al tipo" },
    };
  }

  if (responsableId !== null) {
    const responsable = await db.usuario.findFirst({
      where: { id: responsableId, organizationId: ORG_PROGES, rol: "EQUIPO", activo: true },
      select: { id: true },
    });
    if (!responsable) {
      return {
        error: "El responsable no es del equipo.",
        fieldErrors: { responsableId: "El responsable no es del equipo." },
      };
    }
  }

  const primeraEtapa = await db.etapa.findFirst({
    where: { organizationId: ORG_PROGES, tipo: solicitud.tipo, activa: true },
    orderBy: { orden: "asc" },
    select: { id: true, nombre: true },
  });
  if (!primeraEtapa) {
    return {
      error: "Ese tipo de servicio no tiene etapas activas. Actívalas o créalas en Equipo > Etapas.",
    };
  }

  const ahora = new Date();
  const abierta = await db.$transaction(async (tx) => {
    // Se reclama la solicitud primero: si otra persona la resolvió justo antes, no hay nada
    // que actualizar y se sale sin haber escrito nada.
    const { count } = await tx.solicitud.updateMany({
      where: { id: solicitud.id, estado: "NUEVA" },
      data: { estado: "ACEPTADA", resueltaPorId: usuario.id, resueltaEl: ahora },
    });
    if (count !== 1) return false;

    const servicio = await tx.servicioEnCurso.create({
      data: {
        // El espacio de la solicitud, no el del cliente activo.
        organizationId: solicitud.organizationId,
        propertyId: solicitud.propertyId,
        servicioId: catalogo.id,
        tipo: solicitud.tipo,
        etapaId: primeraEtapa.id,
        responsableId,
        nota,
        eventos: {
          create: {
            organizationId: solicitud.organizationId,
            tipo: "ETAPA",
            etapaId: primeraEtapa.id,
            anterior: null,
            nuevo: primeraEtapa.nombre,
            motivo: "Pedido por el cliente",
            autorId: usuario.id,
          },
        },
      },
      select: { id: true },
    });
    await tx.solicitud.update({
      where: { id: solicitud.id },
      data: { servicioEnCursoId: servicio.id },
    });
    return true;
  });
  if (!abierta) return { error: YA_RESUELTA };

  revalidar(solicitud.propertyId);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Rechazar
// ---------------------------------------------------------------------------

const rechazarSchema = z.object({
  solicitudId: z.string().min(1, "Falta la solicitud"),
  motivo: z
    .string()
    .trim()
    .min(1, "Escribe por qué se rechaza")
    .max(2000, "Máximo 2000 caracteres"),
});

// Rechaza la solicitud. El motivo es obligatorio: el cliente lo ve en su ficha.
export async function rechazarSolicitud(
  _prev: SolicitudFormState,
  formData: FormData,
): Promise<SolicitudFormState> {
  const usuario = await equipoEnAccion();

  const parsed = rechazarSchema.safeParse({
    solicitudId: formData.get("solicitudId") ?? "",
    motivo: formData.get("motivo") ?? "",
  });
  if (!parsed.success) {
    return { error: "Revisa los campos.", fieldErrors: toFieldErrors(parsed.error) };
  }
  const { solicitudId, motivo } = parsed.data;

  const solicitud = await db.solicitud.findUnique({
    where: { id: solicitudId },
    select: { id: true, propertyId: true },
  });
  if (!solicitud) return { error: "La solicitud no existe." };

  const { count } = await db.solicitud.updateMany({
    where: { id: solicitud.id, estado: "NUEVA" },
    data: {
      estado: "RECHAZADA",
      motivoRechazo: motivo,
      resueltaPorId: usuario.id,
      resueltaEl: new Date(),
    },
  });
  if (count !== 1) return { error: YA_RESUELTA };

  revalidar(solicitud.propertyId);
  return { ok: true };
}
