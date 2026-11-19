"use server";

// Crear y editar usuarios del portal. Solo el admin (adminEnAccion).
// Un usuario nunca se borra: se desactiva, para que su historial siga teniendo autor.

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getOrgId } from "@/lib/org";
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
  admin: z.boolean(),
  activo: z.boolean(),
  grupoId: z.string(),
  alcance: z.enum(["GRUPO", "SOCIEDADES"]),
  sociedades: z.array(z.string()),
});

export async function guardarUsuario(
  _prev: UsuarioFormState,
  formData: FormData,
): Promise<UsuarioFormState> {
  const admin = await adminEnAccion();
  const orgId = await getOrgId();

  const parsed = usuarioSchema.safeParse({
    id: formData.get("id") || undefined,
    nombre: formData.get("nombre"),
    email: formData.get("email"),
    rol: formData.get("rol"),
    admin: formData.get("admin") === "on",
    // Al crear no hay casilla «activo»: nace activo.
    activo: formData.has("id") ? formData.get("activo") === "on" : true,
    grupoId: String(formData.get("grupoId") ?? ""),
    alcance: formData.get("alcance") ?? "GRUPO",
    sociedades: formData.getAll("sociedades").map(String),
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

  // Si es de edición, el usuario tiene que ser de la organización.
  if (datos.id) {
    const existe = await db.usuario.findFirst({
      where: { id: datos.id, organizationId: orgId },
      select: { id: true },
    });
    if (!existe) return { error: "Ese usuario no existe." };
  }

  // El correo es único en todo el portal.
  const repetido = await db.usuario.findUnique({
    where: { email: datos.email },
    select: { id: true },
  });
  if (repetido && repetido.id !== datos.id) {
    return { fieldErrors: { email: "Ya existe un usuario con ese correo." } };
  }

  // Lo que depende del rol. Un EQUIPO no lleva grupo ni alcance; un CLIENTE no es admin.
  const esCliente = datos.rol === "CLIENTE";
  let grupoId: string | null = null;
  let sociedades: string[] = [];
  if (esCliente) {
    if (!datos.grupoId) return { fieldErrors: { grupoId: "Elige el grupo del cliente." } };
    const grupo = await db.grupo.findFirst({
      where: { id: datos.grupoId, organizationId: orgId },
      select: { id: true },
    });
    if (!grupo) return { fieldErrors: { grupoId: "Ese grupo no existe." } };
    grupoId = grupo.id;

    if (datos.alcance === "SOCIEDADES") {
      if (datos.sociedades.length === 0) {
        return { fieldErrors: { sociedades: "Marca al menos una sociedad." } };
      }
      // Cada sociedad marcada tiene que ser de ese grupo: si no, un cliente podría
      // ver propiedades de otro grupo.
      const validas = await db.owner.findMany({
        where: { id: { in: datos.sociedades }, grupoId: grupo.id, organizationId: orgId },
        select: { id: true },
      });
      if (validas.length !== new Set(datos.sociedades).size) {
        return { fieldErrors: { sociedades: "Hay una sociedad que no es de ese grupo." } };
      }
      sociedades = validas.map((o) => o.id);
    }
  }

  const valores = {
    nombre: datos.nombre,
    email: datos.email,
    rol: datos.rol,
    admin: esCliente ? false : datos.admin,
    activo: datos.activo,
    grupoId,
    alcance: esCliente ? datos.alcance : ("GRUPO" as const),
  };

  // Todo o nada: el usuario y sus sociedades se guardan juntos.
  await db.$transaction(async (tx) => {
    const usuario = datos.id
      ? await tx.usuario.update({ where: { id: datos.id }, data: valores })
      : await tx.usuario.create({ data: { ...valores, organizationId: orgId } });
    await tx.usuarioSociedad.deleteMany({ where: { usuarioId: usuario.id } });
    if (sociedades.length > 0) {
      await tx.usuarioSociedad.createMany({
        data: sociedades.map((ownerId) => ({
          organizationId: orgId,
          usuarioId: usuario.id,
          ownerId,
        })),
      });
    }
  });

  revalidatePath("/equipo");
  return { ok: true };
}
