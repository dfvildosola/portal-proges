"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getOrgId } from "@/lib/org";
import {
  enumField,
  moneyField,
  optionalDateField,
  optionalText,
  optionalYearField,
  toFieldErrors,
} from "@/lib/form-helpers";
import {
  PropertyType,
  PropertyStatus,
  PropertyGoal,
  Currency,
  ValorFuente,
} from "@/generated/prisma/enums";

export type PropertyFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

const propertySchema = z.object({
  rolSII: z.string().trim().min(1, "El ROL es obligatorio"),
  tipo: enumField(PropertyType),
  direccion: z.string().trim().min(1, "La dirección es obligatoria"),
  comuna: z.string().trim().min(1, "La comuna es obligatoria"),
  region: z.string().trim().min(1, "La región es obligatoria"),
  objetivo: enumField(PropertyGoal),
  estado: enumField(PropertyStatus),
  monedaPrincipal: enumField(Currency),
  m2Terreno: moneyField,
  m2Construidos: moneyField,
  anoConstruccion: optionalYearField,
  valorComercial: moneyField,
  valorComercialMoneda: enumField(Currency),
  valorComercialFecha: optionalDateField({ noFutura: true }),
  valorComercialFuente: enumField(ValorFuente).nullable(),
  compraFecha: optionalDateField({ noFutura: true }),
  compraPrecio: moneyField,
  compraMoneda: enumField(Currency),
  deudaSaldo: moneyField,
  deudaMoneda: enumField(Currency),
  deudaFecha: optionalDateField({ noFutura: true }),
  deudaBanco: optionalText,
  deudaDividendo: moneyField,
  deudaTermino: optionalDateField(),
  exentaContribuciones: z.boolean(),
});

function parse(formData: FormData) {
  return propertySchema.safeParse({
    rolSII: formData.get("rolSII"),
    tipo: formData.get("tipo"),
    direccion: formData.get("direccion"),
    comuna: formData.get("comuna"),
    region: formData.get("region"),
    objetivo: formData.get("objetivo"),
    estado: formData.get("estado"),
    monedaPrincipal: formData.get("monedaPrincipal"),
    m2Terreno: formData.get("m2Terreno") ?? "",
    m2Construidos: formData.get("m2Construidos") ?? "",
    anoConstruccion: formData.get("anoConstruccion") ?? "",
    valorComercial: formData.get("valorComercial") ?? "",
    valorComercialMoneda: formData.get("valorComercialMoneda") ?? "CLP",
    valorComercialFecha: formData.get("valorComercialFecha") ?? "",
    // Sin fuente ("") queda como null.
    valorComercialFuente: formData.get("valorComercialFuente") || null,
    compraFecha: formData.get("compraFecha") ?? "",
    compraPrecio: formData.get("compraPrecio") ?? "",
    compraMoneda: formData.get("compraMoneda") ?? "CLP",
    deudaSaldo: formData.get("deudaSaldo") ?? "",
    deudaMoneda: formData.get("deudaMoneda") ?? "UF",
    deudaFecha: formData.get("deudaFecha") ?? "",
    deudaBanco: formData.get("deudaBanco") ?? "",
    deudaDividendo: formData.get("deudaDividendo") ?? "",
    deudaTermino: formData.get("deudaTermino") ?? "",
    // El checkbox manda "true" si está marcado y "false" si no (ver property-form).
    exentaContribuciones: formData.get("exentaContribuciones") === "true",
  });
}

export async function createProperty(
  _prev: PropertyFormState,
  formData: FormData,
): Promise<PropertyFormState> {
  const parsed = parse(formData);
  if (!parsed.success) {
    return { error: "Revisa los campos.", fieldErrors: toFieldErrors(parsed.error) };
  }

  const orgId = await getOrgId();
  const data = parsed.data;
  const created = await db.property.create({
    data: { ...data, organizationId: orgId },
  });

  revalidatePath("/propiedades");
  redirect(`/propiedades/${created.id}`);
}

export async function updateProperty(
  _prev: PropertyFormState,
  formData: FormData,
): Promise<PropertyFormState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Falta el identificador de la propiedad." };

  const parsed = parse(formData);
  if (!parsed.success) {
    return { error: "Revisa los campos.", fieldErrors: toFieldErrors(parsed.error) };
  }

  const orgId = await getOrgId();
  // updateMany con where { id, organizationId } refuerza el aislamiento multi-tenant.
  const res = await db.property.updateMany({
    where: { id, organizationId: orgId },
    data: parsed.data,
  });
  if (res.count === 0) return { error: "Propiedad no encontrada." };

  revalidatePath("/propiedades");
  revalidatePath(`/propiedades/${id}`);
  redirect(`/propiedades/${id}`);
}

export async function updatePropertyStatus(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const estado = formData.get("estado") as PropertyStatus;
  if (!id || !Object.values(PropertyStatus).includes(estado)) return;

  const orgId = await getOrgId();
  await db.property.updateMany({
    where: { id, organizationId: orgId },
    data: { estado },
  });

  revalidatePath("/propiedades");
  revalidatePath(`/propiedades/${id}`);
  revalidatePath("/resumen");
}

export async function deleteProperty(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const orgId = await getOrgId();
  await db.property.deleteMany({ where: { id, organizationId: orgId } });

  revalidatePath("/propiedades");
  redirect("/propiedades");
}
