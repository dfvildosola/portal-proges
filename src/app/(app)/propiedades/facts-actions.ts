"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { getOrgId } from "@/lib/org";
import {
  assertProperty,
  enumField,
  moneyField,
  optionalText,
  requiredMoneyField,
  toFieldErrors,
} from "@/lib/form-helpers";
import { OwnerType, PropertyUnitType } from "@/generated/prisma/enums";
import type { PropertyFormState } from "./actions";

// ---------------------------------------------------------------------------
// Dueños (copropiedad) y etiquetas
// ---------------------------------------------------------------------------

const porcentajeField = z
  .string()
  .trim()
  .min(1, "El porcentaje es obligatorio")
  .refine(
    (v) => !Number.isNaN(Number(v)) && Number(v) > 0 && Number(v) <= 100,
    { message: "Debe ser un número entre 0 y 100" },
  );

const newOwnerSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio"),
  rut: z.string().trim().min(1, "El RUT es obligatorio"),
  tipo: enumField(OwnerType),
});

// Agrega un dueño a la propiedad. Puede REUTILIZAR una entidad existente
// (`ownerId`) o crear una nueva (nombre/rut/tipo). Así una misma sociedad/persona
// no se duplica entre propiedades — base para agruparlas por grupo económico.
export async function addOwner(
  _prev: PropertyFormState,
  formData: FormData,
): Promise<PropertyFormState> {
  const propertyId = String(formData.get("propertyId") ?? "");
  if (!propertyId) return { error: "Falta la propiedad." };

  // Dentro de un z.object para que el issue traiga `path` y el error quede en fieldErrors.porcentaje.
  const porcentaje = z
    .object({ porcentaje: porcentajeField })
    .safeParse({ porcentaje: formData.get("porcentaje") ?? "" });
  if (!porcentaje.success) {
    return { error: "Revisa los campos.", fieldErrors: toFieldErrors(porcentaje.error) };
  }

  const orgId = await getOrgId();
  if (!(await assertProperty(propertyId, orgId)))
    return { error: "Propiedad no encontrada." };

  // Entidad existente o nueva
  const existingOwnerId = String(formData.get("ownerId") ?? "").trim();
  let ownerId: string;
  if (existingOwnerId) {
    const owner = await db.owner.findFirst({
      where: { id: existingOwnerId, organizationId: orgId },
      select: { id: true },
    });
    if (!owner) return { error: "Entidad no encontrada." };
    ownerId = owner.id;
  } else {
    const parsed = newOwnerSchema.safeParse({
      nombre: formData.get("nombre"),
      rut: formData.get("rut"),
      tipo: formData.get("tipo"),
    });
    if (!parsed.success) {
      return { error: "Revisa los campos.", fieldErrors: toFieldErrors(parsed.error) };
    }
    const created = await db.owner.create({
      data: { organizationId: orgId, ...parsed.data },
    });
    ownerId = created.id;
  }

  // Evita duplicar la copropiedad (única por propiedad+entidad).
  const dup = await db.propertyOwner.findFirst({
    where: { propertyId, ownerId },
    select: { id: true },
  });
  if (dup) return { error: "Esa entidad ya figura como dueña de esta propiedad." };

  await db.propertyOwner.create({
    data: {
      organizationId: orgId,
      propertyId,
      ownerId,
      porcentaje: porcentaje.data.porcentaje,
    },
  });

  revalidatePath(`/propiedades/${propertyId}`);
  return {};
}

export async function removeOwner(formData: FormData): Promise<void> {
  const propertyOwnerId = String(formData.get("propertyOwnerId") ?? "");
  const propertyId = String(formData.get("propertyId") ?? "");
  if (!propertyOwnerId) return;

  const orgId = await getOrgId();
  await db.propertyOwner.deleteMany({
    where: { id: propertyOwnerId, organizationId: orgId },
  });
  revalidatePath(`/propiedades/${propertyId}`);
}

const tagSchema = z.object({
  nombre: z.string().trim().min(1, "Escribe una etiqueta"),
});

export async function addTag(
  _prev: PropertyFormState,
  formData: FormData,
): Promise<PropertyFormState> {
  const propertyId = String(formData.get("propertyId") ?? "");
  if (!propertyId) return { error: "Falta la propiedad." };

  const parsed = tagSchema.safeParse({ nombre: formData.get("nombre") });
  if (!parsed.success) {
    return { error: "Revisa los campos.", fieldErrors: toFieldErrors(parsed.error) };
  }

  const orgId = await getOrgId();
  if (!(await assertProperty(propertyId, orgId)))
    return { error: "Propiedad no encontrada." };

  // Crea la etiqueta si no existe (única por organización) y la vincula a la propiedad.
  const tag = await db.propertyTag.upsert({
    where: {
      organizationId_nombre: { organizationId: orgId, nombre: parsed.data.nombre },
    },
    create: { organizationId: orgId, nombre: parsed.data.nombre },
    update: {},
  });
  await db.property.update({
    where: { id: propertyId },
    data: { tags: { connect: { id: tag.id } } },
  });

  revalidatePath(`/propiedades/${propertyId}`);
  return {};
}

export async function removeTag(formData: FormData): Promise<void> {
  const propertyId = String(formData.get("propertyId") ?? "");
  const tagId = String(formData.get("tagId") ?? "");
  if (!propertyId || !tagId) return;

  const orgId = await getOrgId();
  if (!(await assertProperty(propertyId, orgId))) return;

  await db.property.update({
    where: { id: propertyId },
    data: { tags: { disconnect: { id: tagId } } },
  });
  revalidatePath(`/propiedades/${propertyId}`);
}

// ---------------------------------------------------------------------------
// Anexos (estacionamientos y bodegas)
// ---------------------------------------------------------------------------

const unitSchema = z.object({
  tipo: enumField(PropertyUnitType),
  numero: z.string().trim().min(1, "El número o identificador es obligatorio"),
  rolSII: optionalText,
  avaluoFiscal: moneyField,
});

export async function addUnit(
  _prev: PropertyFormState,
  formData: FormData,
): Promise<PropertyFormState> {
  const propertyId = String(formData.get("propertyId") ?? "");
  if (!propertyId) return { error: "Falta la propiedad." };

  const parsed = unitSchema.safeParse({
    tipo: formData.get("tipo"),
    numero: formData.get("numero"),
    rolSII: formData.get("rolSII") ?? "",
    avaluoFiscal: formData.get("avaluoFiscal") ?? "",
  });
  if (!parsed.success) {
    return { error: "Revisa los campos.", fieldErrors: toFieldErrors(parsed.error) };
  }

  const orgId = await getOrgId();
  if (!(await assertProperty(propertyId, orgId)))
    return { error: "Propiedad no encontrada." };

  await db.propertyUnit.create({
    data: { organizationId: orgId, propertyId, ...parsed.data },
  });

  revalidatePath(`/propiedades/${propertyId}`);
  return {};
}

export async function removeUnit(formData: FormData): Promise<void> {
  const unitId = String(formData.get("unitId") ?? "");
  const propertyId = String(formData.get("propertyId") ?? "");
  if (!unitId) return;

  const orgId = await getOrgId();
  await db.propertyUnit.deleteMany({
    where: { id: unitId, organizationId: orgId },
  });
  revalidatePath(`/propiedades/${propertyId}`);
}

// ---------------------------------------------------------------------------
// Avalúos fiscales (historial)
// ---------------------------------------------------------------------------

const assessmentSchema = z.object({
  anio: z
    .string()
    .trim()
    .min(1, "El año es obligatorio")
    .refine(
      (v) => Number.isInteger(Number(v)) && Number(v) >= 1800 && Number(v) <= 2100,
      { message: "Año inválido" },
    ),
  valor: requiredMoneyField,
});

export async function addAssessment(
  _prev: PropertyFormState,
  formData: FormData,
): Promise<PropertyFormState> {
  const propertyId = String(formData.get("propertyId") ?? "");
  if (!propertyId) return { error: "Falta la propiedad." };

  const parsed = assessmentSchema.safeParse({
    anio: formData.get("anio"),
    valor: formData.get("valor"),
  });
  if (!parsed.success) {
    return { error: "Revisa los campos.", fieldErrors: toFieldErrors(parsed.error) };
  }

  const orgId = await getOrgId();
  if (!(await assertProperty(propertyId, orgId)))
    return { error: "Propiedad no encontrada." };

  try {
    await db.propertyAssessment.create({
      data: {
        organizationId: orgId,
        propertyId,
        anio: Number(parsed.data.anio),
        valor: parsed.data.valor,
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "Ya existe un avalúo para ese año." };
    }
    console.error("addAssessment: no se pudo guardar el avalúo", { propertyId, anio: parsed.data.anio }, e);
    return { error: "No se pudo guardar el avalúo. Intenta de nuevo." };
  }

  revalidatePath(`/propiedades/${propertyId}`);
  return {};
}

export async function removeAssessment(formData: FormData): Promise<void> {
  const assessmentId = String(formData.get("assessmentId") ?? "");
  const propertyId = String(formData.get("propertyId") ?? "");
  if (!assessmentId) return;

  const orgId = await getOrgId();
  await db.propertyAssessment.deleteMany({
    where: { id: assessmentId, organizationId: orgId },
  });
  revalidatePath(`/propiedades/${propertyId}`);
}
