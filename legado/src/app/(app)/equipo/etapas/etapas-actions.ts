"use server";

// Editar las etapas de cada tipo de servicio. Solo el admin (adminEnAccion).
//
// Una etapa con servicios o historial adentro nunca se borra: se desactiva. Una etapa
// desactivada deja de ofrecerse para mover servicios, pero los que ya están en ella
// siguen ahí. El historial (Evento) guarda el nombre de la etapa como texto, así que
// renombrar una etapa no cambia lo ya escrito.

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { ORG_PROGES } from "@/lib/org";
import { adminEnAccion } from "@/lib/sesion";
import { enumField, toFieldErrors } from "@/lib/form-helpers";
import { esComercial } from "@/lib/servicios";
import { ServicioTipo } from "@/generated/prisma/enums";

export type EtapaFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  ok?: boolean; // true cuando se guardó: el diálogo usa esto para cerrarse
  sugerirDesactivar?: boolean; // al intentar borrar una etapa con historial
};

const MENSAJE_CON_HISTORIAL =
  "Esta etapa tiene servicios o historial: desactívala en vez de borrarla.";

const nombreField = z
  .string()
  .trim()
  .min(1, "El nombre es obligatorio")
  .max(80, "El nombre es demasiado largo");

const idField = z.string().min(1, "Falta la etapa");

function recargar() {
  revalidatePath("/equipo/etapas");
}

// Busca la etapa y confirma que es del espacio de Proges. Devuelve null si no.
async function etapaDeLaOrg(id: string, orgId: string) {
  return db.etapa.findFirst({ where: { id, organizationId: orgId } });
}

// ¿Quedaría al menos una etapa activa en el tipo si esta deja de estar activa?
async function esLaUnicaActiva(etapa: { id: string; tipo: ServicioTipo; organizationId: string }) {
  const otras = await db.etapa.count({
    where: {
      organizationId: etapa.organizationId,
      tipo: etapa.tipo,
      activa: true,
      id: { not: etapa.id },
    },
  });
  return otras === 0;
}

// ---------------------------------------------------------------------------
// Agregar una etapa al final de un tipo
// ---------------------------------------------------------------------------

const agregarSchema = z.object({
  tipo: enumField(ServicioTipo),
  nombre: nombreField,
  cierraServicio: z.boolean(),
  propiedadPublicada: z.boolean(),
});

export async function agregarEtapa(
  _prev: EtapaFormState,
  formData: FormData,
): Promise<EtapaFormState> {
  await adminEnAccion();
  const orgId = ORG_PROGES; // las etapas son de Proges, comunes a todos los clientes

  const parsed = agregarSchema.safeParse({
    tipo: formData.get("tipo"),
    nombre: formData.get("nombre"),
    cierraServicio: formData.get("cierraServicio") === "on",
    propiedadPublicada: formData.get("propiedadPublicada") === "on",
  });
  if (!parsed.success) {
    return { error: "Revisa los campos.", fieldErrors: toFieldErrors(parsed.error) };
  }
  const { tipo, nombre, cierraServicio } = parsed.data;
  // La marca «propiedad publicada» solo tiene sentido en venta y arriendo.
  const propiedadPublicada = esComercial(tipo) && parsed.data.propiedadPublicada;

  const mismoNombre = await db.etapa.findFirst({
    where: { organizationId: orgId, tipo, nombre: { equals: nombre, mode: "insensitive" } },
    select: { id: true },
  });
  if (mismoNombre) {
    return { fieldErrors: { nombre: "Ya hay una etapa con ese nombre en este tipo." } };
  }

  // Va al final: un número más que la mayor de las etapas del tipo (activas o no).
  const ultima = await db.etapa.aggregate({
    where: { organizationId: orgId, tipo },
    _max: { orden: true },
  });
  await db.etapa.create({
    data: {
      organizationId: orgId,
      tipo,
      nombre,
      orden: (ultima._max.orden ?? 0) + 1,
      cierraServicio,
      propiedadPublicada,
    },
  });

  recargar();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Renombrar y cambiar las marcas (un solo formulario)
// ---------------------------------------------------------------------------

const editarSchema = z.object({
  id: idField,
  nombre: nombreField,
  cierraServicio: z.boolean(),
  propiedadPublicada: z.boolean(),
});

export async function editarEtapa(
  _prev: EtapaFormState,
  formData: FormData,
): Promise<EtapaFormState> {
  await adminEnAccion();
  const orgId = ORG_PROGES; // las etapas son de Proges, comunes a todos los clientes

  const parsed = editarSchema.safeParse({
    id: formData.get("id"),
    nombre: formData.get("nombre"),
    cierraServicio: formData.get("cierraServicio") === "on",
    propiedadPublicada: formData.get("propiedadPublicada") === "on",
  });
  if (!parsed.success) {
    return { error: "Revisa los campos.", fieldErrors: toFieldErrors(parsed.error) };
  }
  const { id, nombre, cierraServicio } = parsed.data;

  const etapa = await etapaDeLaOrg(id, orgId);
  if (!etapa) return { error: "Esa etapa no existe." };
  const propiedadPublicada = esComercial(etapa.tipo) && parsed.data.propiedadPublicada;

  const mismoNombre = await db.etapa.findFirst({
    where: {
      organizationId: orgId,
      tipo: etapa.tipo,
      id: { not: id },
      nombre: { equals: nombre, mode: "insensitive" },
    },
    select: { id: true },
  });
  if (mismoNombre) {
    return { fieldErrors: { nombre: "Ya hay una etapa con ese nombre en este tipo." } };
  }

  await db.etapa.update({
    where: { id },
    data: { nombre, cierraServicio, propiedadPublicada },
  });

  recargar();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Subir y bajar: intercambia el lugar con la vecina
// ---------------------------------------------------------------------------

const moverSchema = z.object({
  id: idField,
  direccion: z.enum(["subir", "bajar"]),
});

export async function moverEtapa(
  _prev: EtapaFormState,
  formData: FormData,
): Promise<EtapaFormState> {
  await adminEnAccion();
  const orgId = ORG_PROGES; // las etapas son de Proges, comunes a todos los clientes

  const parsed = moverSchema.safeParse({
    id: formData.get("id"),
    direccion: formData.get("direccion"),
  });
  if (!parsed.success) return { error: "No se entendió qué etapa mover." };
  const { id, direccion } = parsed.data;

  const etapa = await etapaDeLaOrg(id, orgId);
  if (!etapa) return { error: "Esa etapa no existe." };

  // Todo o nada: se lee la lista del tipo y se escribe el nuevo orden en una transacción,
  // para que dos clics seguidos no dejen dos etapas con el mismo lugar.
  const movida = await db.$transaction(async (tx) => {
    const lista = await tx.etapa.findMany({
      where: { organizationId: orgId, tipo: etapa.tipo },
      orderBy: [{ orden: "asc" }, { createdAt: "asc" }, { id: "asc" }],
      select: { id: true, orden: true },
    });
    const i = lista.findIndex((e) => e.id === id);
    const j = direccion === "subir" ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= lista.length) return false;

    [lista[i], lista[j]] = [lista[j], lista[i]];
    // Se vuelve a numerar toda la lista (1, 2, 3…): así se arreglan de paso huecos o repetidos.
    for (const [posicion, e] of lista.entries()) {
      if (e.orden !== posicion + 1) {
        await tx.etapa.update({ where: { id: e.id }, data: { orden: posicion + 1 } });
      }
    }
    return true;
  });
  if (!movida) {
    return { error: direccion === "subir" ? "Ya es la primera." : "Ya es la última." };
  }

  recargar();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Desactivar y reactivar
// ---------------------------------------------------------------------------

const activaSchema = z.object({
  id: idField,
  activa: z.enum(["si", "no"]),
});

export async function cambiarActivaEtapa(
  _prev: EtapaFormState,
  formData: FormData,
): Promise<EtapaFormState> {
  await adminEnAccion();
  const orgId = ORG_PROGES; // las etapas son de Proges, comunes a todos los clientes

  const parsed = activaSchema.safeParse({
    id: formData.get("id"),
    activa: formData.get("activa"),
  });
  if (!parsed.success) return { error: "No se entendió qué hacer con la etapa." };
  const { id } = parsed.data;
  const activa = parsed.data.activa === "si";

  const etapa = await etapaDeLaOrg(id, orgId);
  if (!etapa) return { error: "Esa etapa no existe." };

  // Un tipo sin ninguna etapa activa no tendría dónde empezar un servicio nuevo.
  if (!activa && etapa.activa && (await esLaUnicaActiva(etapa))) {
    return {
      error:
        "Es la única etapa activa de este tipo: agrega otra antes de desactivarla.",
    };
  }

  await db.etapa.update({ where: { id }, data: { activa } });

  recargar();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Borrar: solo si nunca tuvo servicios ni eventos
// ---------------------------------------------------------------------------

export async function borrarEtapa(
  _prev: EtapaFormState,
  formData: FormData,
): Promise<EtapaFormState> {
  await adminEnAccion();
  const orgId = ORG_PROGES; // las etapas son de Proges, comunes a todos los clientes

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "No se entendió qué etapa borrar." };

  const etapa = await etapaDeLaOrg(id, orgId);
  if (!etapa) return { error: "Esa etapa no existe." };

  // Igual que al desactivar: no se deja el tipo sin ninguna etapa activa.
  if (etapa.activa && (await esLaUnicaActiva(etapa))) {
    return {
      error: "Es la única etapa activa de este tipo: agrega otra antes de borrarla.",
    };
  }

  // La cuenta y el borrado van juntos en una transacción: si justo se mueve un servicio
  // a esta etapa, no se borra por error.
  const resultado = await db.$transaction(async (tx) => {
    const [servicios, eventos] = await Promise.all([
      tx.servicioEnCurso.count({ where: { etapaId: id } }),
      tx.evento.count({ where: { etapaId: id } }),
    ]);
    if (servicios > 0 || eventos > 0) return "con-historial" as const;
    await tx.etapa.delete({ where: { id } });
    return "borrada" as const;
  });

  if (resultado === "con-historial") {
    return { error: MENSAJE_CON_HISTORIAL, sugerirDesactivar: true };
  }

  recargar();
  return { ok: true };
}
