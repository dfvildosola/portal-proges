"use server";

// Acciones del equipo sobre los servicios en curso de una propiedad: abrir,
// mover de etapa, confirmar, cambiar responsable y nota, y cancelar.
//
// Cada acción parte pidiendo un integrante activo del EQUIPO (equipoEnAccion)
// y vuelve a comprobar en el servidor que la propiedad, el servicio, la etapa y
// el responsable son de la organización: lo que llega del formulario nunca se
// da por bueno.
//
// Cada cambio de etapa deja un Evento (el historial). Cancelar NO es una etapa:
// es una salida, y por eso no crea Evento de etapa.

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getOrgId } from "@/lib/org";
import { equipoEnAccion } from "@/lib/sesion";
import { assertProperty, enumField, optionalText, toFieldErrors } from "@/lib/form-helpers";
import { ServicioTipo } from "@/generated/prisma/enums";
import { familiasDelTipo } from "@/lib/servicios";

export type ServicioFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  ok?: boolean; // true cuando se guardó: el formulario usa esto para cerrarse o avisar
};

const textoLargo = (max: number) =>
  optionalText.refine((v) => v === null || v.length <= max, {
    message: `Máximo ${max} caracteres`,
  });

// Responsable: un id de Usuario, o vacío para dejarlo sin responsable.
const responsableField = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : null));

// Vuelve a pintar la ficha y la página del servicio.
function revalidar(propertyId: string, servicioId: string) {
  revalidatePath(`/propiedades/${propertyId}`);
  revalidatePath(`/propiedades/${propertyId}/servicios/${servicioId}`);
}

// Confirma que el responsable elegido es un integrante activo del equipo de la
// organización. Devuelve el mensaje de error, o null si está bien.
async function errorDeResponsable(responsableId: string | null, orgId: string) {
  if (responsableId === null) return null;
  const usuario = await db.usuario.findFirst({
    where: { id: responsableId, organizationId: orgId, rol: "EQUIPO", activo: true },
    select: { id: true },
  });
  return usuario ? null : "El responsable no es del equipo.";
}

// El servicio de la propiedad, siempre dentro de la organización.
async function buscarServicio(servicioId: string, propertyId: string, orgId: string) {
  return db.servicioEnCurso.findFirst({
    where: { id: servicioId, propertyId, organizationId: orgId },
    include: { etapa: { select: { id: true, nombre: true } } },
  });
}

// ---------------------------------------------------------------------------
// Abrir
// ---------------------------------------------------------------------------

const abrirSchema = z.object({
  propertyId: z.string().min(1, "Falta la propiedad"),
  tipo: enumField(ServicioTipo),
  servicioId: z.string().min(1, "Elige el servicio del catálogo"),
  responsableId: responsableField,
  nota: textoLargo(2000),
});

// Abre un servicio en la propiedad. Parte en la primera etapa activa de su tipo
// (la de menor orden) y deja el primer Evento del historial en la misma
// transacción: o quedan las dos cosas, o ninguna.
export async function abrirServicio(
  _prev: ServicioFormState,
  formData: FormData,
): Promise<ServicioFormState> {
  const usuario = await equipoEnAccion();
  const orgId = await getOrgId();

  const parsed = abrirSchema.safeParse({
    propertyId: formData.get("propertyId") ?? "",
    tipo: formData.get("tipo") ?? "",
    servicioId: formData.get("servicioId") ?? "",
    responsableId: formData.get("responsableId") ?? "",
    nota: formData.get("nota") ?? "",
  });
  if (!parsed.success) {
    return { error: "Revisa los campos.", fieldErrors: toFieldErrors(parsed.error) };
  }
  const { propertyId, tipo, servicioId, responsableId, nota } = parsed.data;

  if (!(await assertProperty(propertyId, orgId))) return { error: "Propiedad no encontrada." };

  // El servicio del catálogo debe estar activo y ser de una familia que ese tipo ofrece.
  const catalogo = await db.servicio.findFirst({
    where: { id: servicioId, organizationId: orgId, activo: true },
    select: { id: true, familia: true },
  });
  if (!catalogo) return { error: "El servicio elegido no existe en el catálogo." };
  if (!familiasDelTipo(tipo).includes(catalogo.familia)) {
    return {
      error: "Ese servicio del catálogo no corresponde al tipo elegido.",
      fieldErrors: { servicioId: "No corresponde al tipo" },
    };
  }

  const errorResp = await errorDeResponsable(responsableId, orgId);
  if (errorResp) return { error: errorResp, fieldErrors: { responsableId: errorResp } };

  const primeraEtapa = await db.etapa.findFirst({
    where: { organizationId: orgId, tipo, activa: true },
    orderBy: { orden: "asc" },
    select: { id: true, nombre: true },
  });
  if (!primeraEtapa) {
    return {
      error: "Ese tipo de servicio no tiene etapas activas. Actívalas o créalas en Equipo > Etapas.",
    };
  }

  const creado = await db.servicioEnCurso.create({
    data: {
      organizationId: orgId,
      propertyId,
      servicioId: catalogo.id,
      tipo,
      etapaId: primeraEtapa.id,
      responsableId,
      nota,
      // El primer evento: entra a la primera etapa, sin etapa anterior.
      eventos: {
        create: {
          organizationId: orgId,
          tipo: "ETAPA",
          etapaId: primeraEtapa.id,
          anterior: null,
          nuevo: primeraEtapa.nombre,
          autorId: usuario.id,
        },
      },
    },
    select: { id: true },
  });

  revalidar(propertyId, creado.id);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Mover de etapa
// ---------------------------------------------------------------------------

const moverSchema = z.object({
  propertyId: z.string().min(1, "Falta la propiedad"),
  servicioId: z.string().min(1, "Falta el servicio"),
  etapaId: z.string().min(1, "Elige la etapa"),
  nota: textoLargo(2000),
});

// Mueve el servicio a cualquier etapa activa de su tipo (no solo la siguiente).
// Si la etapa nueva «cierra el servicio», queda TERMINADO con la fecha de cierre.
export async function moverEtapa(
  _prev: ServicioFormState,
  formData: FormData,
): Promise<ServicioFormState> {
  const usuario = await equipoEnAccion();
  const orgId = await getOrgId();

  const parsed = moverSchema.safeParse({
    propertyId: formData.get("propertyId") ?? "",
    servicioId: formData.get("servicioId") ?? "",
    etapaId: formData.get("etapaId") ?? "",
    nota: formData.get("nota") ?? "",
  });
  if (!parsed.success) {
    return { error: "Revisa los campos.", fieldErrors: toFieldErrors(parsed.error) };
  }
  const { propertyId, servicioId, etapaId, nota } = parsed.data;

  const servicio = await buscarServicio(servicioId, propertyId, orgId);
  if (!servicio) return { error: "Servicio no encontrado." };
  if (servicio.estado !== "ABIERTO") return { error: "Este servicio ya está cerrado." };
  if (servicio.etapaId === etapaId) {
    return { error: "El servicio ya está en esa etapa.", fieldErrors: { etapaId: "Ya está ahí" } };
  }

  // La etapa debe ser de la organización, del mismo tipo que el servicio y estar activa.
  const nueva = await db.etapa.findFirst({
    where: { id: etapaId, organizationId: orgId, tipo: servicio.tipo, activa: true },
    select: { id: true, nombre: true, cierraServicio: true },
  });
  if (!nueva) return { error: "Esa etapa no existe o no es de este tipo de servicio." };

  // Todo en una transacción. El `updateMany` con `estado: ABIERTO` evita pisar a otra
  // persona que cerró el servicio justo antes: si no actualiza nada, se deshace todo.
  const ahora = new Date();
  const resultado = await db.$transaction(async (tx) => {
    const { count } = await tx.servicioEnCurso.updateMany({
      where: { id: servicio.id, organizationId: orgId, estado: "ABIERTO" },
      data: {
        etapaId: nueva.id,
        ...(nueva.cierraServicio
          ? { estado: "TERMINADO", cerradoEl: ahora, motivoCierre: nota }
          : {}),
      },
    });
    if (count === 0) return false;
    await tx.evento.create({
      data: {
        organizationId: orgId,
        servicioEnCursoId: servicio.id,
        tipo: "ETAPA",
        etapaId: nueva.id,
        anterior: servicio.etapa.nombre,
        nuevo: nueva.nombre,
        motivo: nota,
        autorId: usuario.id,
        fecha: ahora,
      },
    });
    return true;
  });
  if (!resultado) return { error: "Este servicio ya está cerrado." };

  revalidar(propertyId, servicio.id);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Confirmar
// ---------------------------------------------------------------------------

const idsSchema = z.object({
  propertyId: z.string().min(1, "Falta la propiedad"),
  servicioId: z.string().min(1, "Falta el servicio"),
});

// Marca como confirmado un servicio que venía «por confirmar» de la carga inicial.
// No deja evento: confirmar no cambia nada del trabajo, solo avisa que alguien lo revisó.
export async function confirmarServicio(
  _prev: ServicioFormState,
  formData: FormData,
): Promise<ServicioFormState> {
  await equipoEnAccion();
  const orgId = await getOrgId();

  const parsed = idsSchema.safeParse({
    propertyId: formData.get("propertyId") ?? "",
    servicioId: formData.get("servicioId") ?? "",
  });
  if (!parsed.success) {
    return { error: "Revisa los campos.", fieldErrors: toFieldErrors(parsed.error) };
  }
  const { propertyId, servicioId } = parsed.data;

  const servicio = await buscarServicio(servicioId, propertyId, orgId);
  if (!servicio) return { error: "Servicio no encontrado." };
  if (servicio.estado !== "ABIERTO") return { error: "Este servicio ya está cerrado." };

  await db.servicioEnCurso.update({
    where: { id: servicio.id },
    data: { porConfirmar: false },
  });

  revalidar(propertyId, servicio.id);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Responsable y nota
// ---------------------------------------------------------------------------

const detalleSchema = z.object({
  propertyId: z.string().min(1, "Falta la propiedad"),
  servicioId: z.string().min(1, "Falta el servicio"),
  responsableId: responsableField,
  nota: textoLargo(2000),
});

// Cambia quién lleva el servicio y su nota. Los dos campos se guardan juntos:
// dejar la nota vacía la borra, y «sin responsable» lo deja sin responsable.
export async function cambiarDetalle(
  _prev: ServicioFormState,
  formData: FormData,
): Promise<ServicioFormState> {
  await equipoEnAccion();
  const orgId = await getOrgId();

  const parsed = detalleSchema.safeParse({
    propertyId: formData.get("propertyId") ?? "",
    servicioId: formData.get("servicioId") ?? "",
    responsableId: formData.get("responsableId") ?? "",
    nota: formData.get("nota") ?? "",
  });
  if (!parsed.success) {
    return { error: "Revisa los campos.", fieldErrors: toFieldErrors(parsed.error) };
  }
  const { propertyId, servicioId, responsableId, nota } = parsed.data;

  const servicio = await buscarServicio(servicioId, propertyId, orgId);
  if (!servicio) return { error: "Servicio no encontrado." };
  if (servicio.estado !== "ABIERTO") return { error: "Este servicio ya está cerrado." };

  const errorResp = await errorDeResponsable(responsableId, orgId);
  if (errorResp) return { error: errorResp, fieldErrors: { responsableId: errorResp } };

  await db.servicioEnCurso.update({
    where: { id: servicio.id },
    data: { responsableId, nota },
  });

  revalidar(propertyId, servicio.id);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Cancelar
// ---------------------------------------------------------------------------

const cancelarSchema = z.object({
  propertyId: z.string().min(1, "Falta la propiedad"),
  servicioId: z.string().min(1, "Falta el servicio"),
  motivo: z.string().trim().min(1, "Escribe por qué se cancela").max(2000, "Máximo 2000 caracteres"),
});

// Cancela un servicio abierto. El motivo es obligatorio. Es una salida, no una
// etapa: no crea Evento de etapa (el motivo queda en el propio servicio).
export async function cancelarServicio(
  _prev: ServicioFormState,
  formData: FormData,
): Promise<ServicioFormState> {
  await equipoEnAccion();
  const orgId = await getOrgId();

  const parsed = cancelarSchema.safeParse({
    propertyId: formData.get("propertyId") ?? "",
    servicioId: formData.get("servicioId") ?? "",
    motivo: formData.get("motivo") ?? "",
  });
  if (!parsed.success) {
    return { error: "Revisa los campos.", fieldErrors: toFieldErrors(parsed.error) };
  }
  const { propertyId, servicioId, motivo } = parsed.data;

  const servicio = await buscarServicio(servicioId, propertyId, orgId);
  if (!servicio) return { error: "Servicio no encontrado." };

  // `estado: ABIERTO` en el filtro: si otra persona lo cerró justo antes, no se pisa.
  const { count } = await db.servicioEnCurso.updateMany({
    where: { id: servicio.id, organizationId: orgId, estado: "ABIERTO" },
    data: { estado: "CANCELADO", cerradoEl: new Date(), motivoCierre: motivo },
  });
  if (count === 0) return { error: "Este servicio ya está cerrado." };

  revalidar(propertyId, servicio.id);
  return { ok: true };
}
