"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getOrgId } from "@/lib/org";
import {
  assertProperty,
  dateField,
  enumField,
  optionalText,
  requiredMoneyField,
  toFieldErrors,
} from "@/lib/form-helpers";
import {
  Currency,
  MovementType,
  MovementCategory,
  TaxStatus,
} from "@/generated/prisma/enums";

// ---------------------------------------------------------------------------
// Movimientos (ingresos / gastos)
// ---------------------------------------------------------------------------

export type MovementFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

const movementSchema = z.object({
  tipo: enumField(MovementType),
  categoria: enumField(MovementCategory),
  monto: requiredMoneyField,
  moneda: enumField(Currency),
  fecha: dateField(),
  descripcion: optionalText,
});

export async function addMovement(
  _prev: MovementFormState,
  formData: FormData,
): Promise<MovementFormState> {
  const propertyId = String(formData.get("propertyId") ?? "");
  if (!propertyId) return { error: "Falta la propiedad." };

  const parsed = movementSchema.safeParse({
    tipo: formData.get("tipo"),
    categoria: formData.get("categoria"),
    monto: formData.get("monto"),
    moneda: formData.get("moneda"),
    fecha: formData.get("fecha"),
    descripcion: formData.get("descripcion") ?? "",
  });
  if (!parsed.success) {
    return { error: "Revisa los campos.", fieldErrors: toFieldErrors(parsed.error) };
  }

  const orgId = await getOrgId();
  if (!(await assertProperty(propertyId, orgId)))
    return { error: "Propiedad no encontrada." };

  await db.movement.create({
    data: {
      organizationId: orgId,
      propertyId,
      tipo: parsed.data.tipo,
      categoria: parsed.data.categoria,
      monto: parsed.data.monto,
      moneda: parsed.data.moneda,
      fecha: parsed.data.fecha,
      descripcion: parsed.data.descripcion,
    },
  });

  revalidatePath(`/propiedades/${propertyId}`);
  return {};
}

export async function removeMovement(formData: FormData): Promise<void> {
  const movementId = String(formData.get("movementId") ?? "");
  const propertyId = String(formData.get("propertyId") ?? "");
  if (!movementId) return;

  const orgId = await getOrgId();
  await db.movement.deleteMany({
    where: { id: movementId, organizationId: orgId },
  });
  revalidatePath(`/propiedades/${propertyId}`);
}

// ---------------------------------------------------------------------------
// Contribuciones (impuesto territorial)
// ---------------------------------------------------------------------------

export type TaxFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

// Meses de vencimiento de cada cuota (basados en el calendario SII Chile).
const TAX_CUOTA_MONTH: Record<number, number> = { 1: 4, 2: 6, 3: 9, 4: 11 };

function calcTaxVencimiento(anio: number, cuota: number): Date {
  const month = TAX_CUOTA_MONTH[cuota];
  const lastDay = new Date(Date.UTC(anio, month, 0)).getUTCDate();
  return new Date(Date.UTC(anio, month - 1, lastDay));
}

const taxSchema = z.object({
  anio: z
    .string()
    .trim()
    .min(1, "El año es obligatorio")
    .refine(
      (v) => Number.isInteger(Number(v)) && Number(v) >= 2000 && Number(v) <= 2100,
      { message: "Año inválido" },
    ),
  cuota: z
    .string()
    .trim()
    .min(1, "La cuota es obligatoria")
    .refine((v) => ["1", "2", "3", "4"].includes(v), {
      message: "La cuota debe ser 1, 2, 3 o 4",
    }),
  monto: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === undefined || v === "" ? null : v))
    .refine((v) => v === null || (!Number.isNaN(Number(v)) && Number(v) >= 0), {
      message: "Debe ser un número válido",
    }),
});

export async function addTax(
  _prev: TaxFormState,
  formData: FormData,
): Promise<TaxFormState> {
  const propertyId = String(formData.get("propertyId") ?? "");
  if (!propertyId) return { error: "Falta la propiedad." };

  const parsed = taxSchema.safeParse({
    anio: formData.get("anio"),
    cuota: formData.get("cuota"),
    monto: formData.get("monto"),
  });
  if (!parsed.success) {
    return { error: "Revisa los campos.", fieldErrors: toFieldErrors(parsed.error) };
  }

  const orgId = await getOrgId();
  if (!(await assertProperty(propertyId, orgId)))
    return { error: "Propiedad no encontrada." };

  try {
    const anio = Number(parsed.data.anio);
    const cuota = Number(parsed.data.cuota);
    await db.propertyTax.create({
      data: {
        organizationId: orgId,
        propertyId,
        anio,
        cuota,
        monto: parsed.data.monto,
        fechaVencimiento: calcTaxVencimiento(anio, cuota),
        estado: TaxStatus.PENDIENTE,
      },
    });
  } catch {
    return { error: "Ya existe una contribución para ese año y cuota." };
  }

  revalidatePath(`/propiedades/${propertyId}`);
  return {};
}

// Genera las 4 cuotas de un año para una propiedad. Idempotente: no pisa registros existentes.
export async function generateYearTaxes(formData: FormData): Promise<void> {
  const propertyId = String(formData.get("propertyId") ?? "");
  const anioStr = String(formData.get("anio") ?? "");
  if (!propertyId || !anioStr) return;
  const anio = Number(anioStr);
  if (!Number.isInteger(anio) || anio < 2000 || anio > 2100) return;

  const orgId = await getOrgId();
  if (!(await assertProperty(propertyId, orgId))) return;

  for (const cuota of [1, 2, 3, 4]) {
    await db.propertyTax.upsert({
      where: { propertyId_anio_cuota: { propertyId, anio, cuota } },
      create: {
        organizationId: orgId,
        property: { connect: { id: propertyId } },
        anio,
        cuota,
        monto: null,
        fechaVencimiento: calcTaxVencimiento(anio, cuota),
        estado: TaxStatus.PENDIENTE,
      },
      update: {},
    });
  }

  revalidatePath(`/propiedades/${propertyId}`);
}

export async function updateTaxMonto(formData: FormData): Promise<void> {
  const taxId = String(formData.get("taxId") ?? "");
  const propertyId = String(formData.get("propertyId") ?? "");
  const montoStr = String(formData.get("monto") ?? "");
  if (!taxId || !montoStr || Number.isNaN(Number(montoStr)) || Number(montoStr) < 0) return;

  const orgId = await getOrgId();
  await db.propertyTax.updateMany({
    where: { id: taxId, organizationId: orgId },
    data: { monto: montoStr },
  });
  revalidatePath(`/propiedades/${propertyId}`);
}

export async function markTaxPaid(formData: FormData): Promise<void> {
  const taxId = String(formData.get("taxId") ?? "");
  const propertyId = String(formData.get("propertyId") ?? "");
  const fechaPagoStr = String(formData.get("fechaPago") ?? "");
  if (!taxId || !fechaPagoStr) return;

  const fechaPago = new Date(`${fechaPagoStr}T00:00:00Z`);
  if (Number.isNaN(fechaPago.getTime())) return;

  const orgId = await getOrgId();
  await db.propertyTax.updateMany({
    where: { id: taxId, organizationId: orgId },
    data: { estado: TaxStatus.PAGADA, fechaPago },
  });
  revalidatePath(`/propiedades/${propertyId}`);
}

export async function removeTax(formData: FormData): Promise<void> {
  const taxId = String(formData.get("taxId") ?? "");
  const propertyId = String(formData.get("propertyId") ?? "");
  if (!taxId) return;

  const orgId = await getOrgId();
  await db.propertyTax.deleteMany({
    where: { id: taxId, organizationId: orgId },
  });
  revalidatePath(`/propiedades/${propertyId}`);
}
