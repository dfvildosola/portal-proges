"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getOrgId } from "@/lib/org";
import { toFieldErrors } from "@/lib/form-helpers";
import { OwnerType } from "@/generated/prisma/enums";

export type DuenosState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

const grupoSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio"),
  rut: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : null)),
});

// Crea un grupo económico (controlador) vacío; luego se le asignan entidades.
export async function createGrupo(
  _prev: DuenosState,
  formData: FormData,
): Promise<DuenosState> {
  const parsed = grupoSchema.safeParse({
    nombre: formData.get("nombre"),
    rut: formData.get("rut"),
  });
  if (!parsed.success)
    return { error: "Revisa los campos.", fieldErrors: toFieldErrors(parsed.error) };

  const orgId = await getOrgId();
  await db.grupo.create({
    data: { organizationId: orgId, nombre: parsed.data.nombre, rut: parsed.data.rut },
  });
  revalidatePath("/duenos");
  return {};
}

// Elimina un grupo. Sus entidades quedan sin grupo (onDelete: SetNull).
export async function deleteGrupo(formData: FormData): Promise<void> {
  const grupoId = String(formData.get("grupoId") ?? "");
  if (!grupoId) return;
  const orgId = await getOrgId();
  await db.grupo.deleteMany({ where: { id: grupoId, organizationId: orgId } });
  revalidatePath("/duenos");
}

// Asigna (o desasigna, grupoId vacío) una entidad a un grupo.
export async function setOwnerGrupo(formData: FormData): Promise<void> {
  const ownerId = String(formData.get("ownerId") ?? "");
  if (!ownerId) return;
  const grupoIdRaw = String(formData.get("grupoId") ?? "");
  const orgId = await getOrgId();

  let grupoId: string | null = null;
  if (grupoIdRaw) {
    const grupo = await db.grupo.findFirst({
      where: { id: grupoIdRaw, organizationId: orgId },
      select: { id: true },
    });
    if (!grupo) return;
    grupoId = grupo.id;
  }

  await db.owner.updateMany({
    where: { id: ownerId, organizationId: orgId },
    data: { grupoId },
  });
  revalidatePath("/duenos");
}

const ownerSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio"),
  rut: z.string().trim().min(1, "El RUT es obligatorio"),
  tipo: z.enum(Object.values(OwnerType) as [OwnerType, ...OwnerType[]]),
  grupoId: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : null)),
});

// Crea una entidad legal (persona o sociedad) sin asociarla todavía a una
// propiedad; opcionalmente la asigna a un grupo.
export async function createOwner(
  _prev: DuenosState,
  formData: FormData,
): Promise<DuenosState> {
  const parsed = ownerSchema.safeParse({
    nombre: formData.get("nombre"),
    rut: formData.get("rut"),
    tipo: formData.get("tipo"),
    grupoId: formData.get("grupoId"),
  });
  if (!parsed.success)
    return { error: "Revisa los campos.", fieldErrors: toFieldErrors(parsed.error) };

  const orgId = await getOrgId();
  let grupoId: string | null = null;
  if (parsed.data.grupoId) {
    const grupo = await db.grupo.findFirst({
      where: { id: parsed.data.grupoId, organizationId: orgId },
      select: { id: true },
    });
    grupoId = grupo?.id ?? null;
  }

  await db.owner.create({
    data: {
      organizationId: orgId,
      nombre: parsed.data.nombre,
      rut: parsed.data.rut,
      tipo: parsed.data.tipo,
      grupoId,
    },
  });
  revalidatePath("/duenos");
  return {};
}
