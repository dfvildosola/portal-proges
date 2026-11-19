"use server";

// Crear y editar usuarios del portal. Solo el admin (adminEnAccion).
// Un usuario nunca se borra: se desactiva, para que su historial siga teniendo autor.
//
// El rol decide el espacio del usuario: un EQUIPO vive en org_proges y puede ser admin;
// un CLIENTE vive en el espacio de su cliente (organizationId = id del cliente) y nunca es admin.

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { ORG_PROGES } from "@/lib/org";
import { adminEnAccion } from "@/lib/sesion";
import { toFieldErrors } from "@/lib/form-helpers";

export type UsuarioFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  ok?: boolean; // true cuando se guardó: el formulario usa esto para cerrarse
};

const usuarioSchema = z.object({
  id: z.string().optional(),
  nombre: z.string().trim().min(1, "El nombre es obligatorio"),
  // El correo se guarda siempre en minúsculas: así «Ana@x.cl» y «ana@x.cl» son la misma persona.
  email: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[^@\s]+@[^@\s]+\.[^@\s]+$/, "Correo inválido"),
  rol: z.enum(["EQUIPO", "CLIENTE"], { message: "Elige el rol" }),
  clienteId: z.string().optional(), // obligatorio solo si el rol es CLIENTE (se comprueba abajo)
  admin: z.boolean(),
  activo: z.boolean(),
});

export async function guardarUsuario(
  _prev: UsuarioFormState,
  formData: FormData,
): Promise<UsuarioFormState> {
  const admin = await adminEnAccion();

  const parsed = usuarioSchema.safeParse({
    id: formData.get("id") || undefined,
    nombre: formData.get("nombre"),
    email: formData.get("email"),
    rol: formData.get("rol"),
    clienteId: formData.get("clienteId") || undefined,
    // Un cliente nunca es admin, aunque el formulario lo mande.
    admin: formData.get("rol") === "EQUIPO" && formData.get("admin") === "on",
    // Al crear no hay casilla «activo»: nace activo.
    activo: formData.has("id") ? formData.get("activo") === "on" : true,
  });
  if (!parsed.success) {
    return { error: "Revisa los campos.", fieldErrors: toFieldErrors(parsed.error) };
  }
  const datos = parsed.data;

  // Un admin no puede quitarse a sí mismo el admin ni desactivarse: se quedaría
  // sin nadie que administre los usuarios.
  if (datos.id && datos.id === admin.id) {
    if (datos.rol !== "EQUIPO" || !datos.admin) {
      return { error: "No puedes quitarte a ti mismo el permiso de admin." };
    }
    if (!datos.activo) return { error: "No puedes desactivarte a ti mismo." };
  }

  // Si se edita, el usuario tiene que existir (sea de Proges o de un cliente).
  const actual = datos.id
    ? await db.usuario.findUnique({
        where: { id: datos.id },
        select: { id: true, organizationId: true },
      })
    : null;
  if (datos.id && !actual) return { error: "Ese usuario no existe." };

  // El espacio del usuario: el del cliente si es CLIENTE, el de Proges si es EQUIPO.
  let organizationId = ORG_PROGES;
  if (datos.rol === "CLIENTE") {
    if (!datos.clienteId) return { fieldErrors: { clienteId: "Elige el cliente." } };
    const cliente = await db.organizacion.findFirst({
      where: { id: datos.clienteId, tipo: "CLIENTE" },
      select: { id: true, activa: true },
    });
    if (!cliente) return { fieldErrors: { clienteId: "Ese cliente no existe." } };
    // A un cliente desactivado no se le suman usuarios; el que ya está ahí puede seguir.
    if (!cliente.activa && cliente.id !== actual?.organizationId) {
      return { fieldErrors: { clienteId: "Ese cliente está desactivado." } };
    }
    organizationId = cliente.id;
  }

  // El correo es único en todo el portal.
  const repetido = await db.usuario.findUnique({
    where: { email: datos.email },
    select: { id: true },
  });
  if (repetido && repetido.id !== datos.id) {
    return { fieldErrors: { email: "Ya existe un usuario con ese correo." } };
  }

  const valores = {
    nombre: datos.nombre,
    email: datos.email,
    rol: datos.rol,
    organizationId,
    admin: datos.admin,
    activo: datos.activo,
  };

  if (datos.id) {
    await db.usuario.update({ where: { id: datos.id }, data: valores });
  } else {
    await db.usuario.create({ data: valores });
  }

  revalidatePath("/equipo");
  return { ok: true };
}
