"use server";

// Crear, renombrar y activar o desactivar clientes. Solo el admin (adminEnAccion).
//
// Un cliente es un espacio: una fila de Organizacion de tipo CLIENTE. Todos los datos del
// cliente (propiedades, contratos, servicios…) llevan el id de esa fila en `organizationId`.
// Por eso un cliente nunca se borra: se desactiva. Desactivado, deja de ofrecerse en el
// selector del equipo, pero sus datos siguen intactos y se puede reactivar.

import { randomUUID } from "node:crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { adminEnAccion } from "@/lib/sesion";
import { toFieldErrors } from "@/lib/form-helpers";

export type ClienteFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  ok?: boolean; // true cuando se guardó: el diálogo usa esto para cerrarse
};

const clienteSchema = z.object({
  id: z.string().optional(),
  nombre: z
    .string()
    .trim()
    .min(1, "El nombre es obligatorio")
    .max(80, "El nombre es demasiado largo"),
});

function recargar() {
  revalidatePath("/equipo");
}

// Crea un cliente (sin `id`) o lo renombra (con `id`). El nombre no se repite entre clientes,
// sin importar mayúsculas: así «npl» y «NPL» no pueden ser dos espacios distintos.
export async function guardarCliente(
  _prev: ClienteFormState,
  formData: FormData,
): Promise<ClienteFormState> {
  await adminEnAccion();

  const parsed = clienteSchema.safeParse({
    id: formData.get("id") || undefined,
    nombre: formData.get("nombre"),
  });
  if (!parsed.success) {
    return { error: "Revisa los campos.", fieldErrors: toFieldErrors(parsed.error) };
  }
  const { id, nombre } = parsed.data;

  if (id) {
    // Solo se renombra un cliente: org_proges (el espacio de Proges) no se toca desde acá.
    const existe = await db.organizacion.findFirst({
      where: { id, tipo: "CLIENTE" },
      select: { id: true },
    });
    if (!existe) return { error: "Ese cliente no existe." };
  }

  const repetido = await db.organizacion.findFirst({
    where: {
      tipo: "CLIENTE",
      nombre: { equals: nombre, mode: "insensitive" },
      ...(id ? { id: { not: id } } : {}),
    },
    select: { id: true },
  });
  if (repetido) return { fieldErrors: { nombre: "Ya existe un cliente con ese nombre." } };

  if (id) {
    await db.organizacion.update({ where: { id }, data: { nombre } });
  } else {
    // El id se genera acá (un código al azar) para que no dependa del nombre: renombrar
    // el cliente nunca cambia el id con el que están marcados sus datos.
    await db.organizacion.create({
      data: { id: `cli_${randomUUID()}`, nombre, tipo: "CLIENTE" },
    });
  }

  recargar();
  return { ok: true };
}

// Desactiva o reactiva un cliente (no se borra).
export async function cambiarActivaCliente(
  _prev: ClienteFormState,
  formData: FormData,
): Promise<ClienteFormState> {
  await adminEnAccion();

  const parsed = z
    .object({ id: z.string().min(1), activa: z.enum(["si", "no"]) })
    .safeParse({ id: formData.get("id"), activa: formData.get("activa") });
  if (!parsed.success) return { error: "No se entendió qué hacer con el cliente." };

  const existe = await db.organizacion.findFirst({
    where: { id: parsed.data.id, tipo: "CLIENTE" },
    select: { id: true },
  });
  if (!existe) return { error: "Ese cliente no existe." };

  await db.organizacion.update({
    where: { id: parsed.data.id },
    data: { activa: parsed.data.activa === "si" },
  });

  recargar();
  return { ok: true };
}
