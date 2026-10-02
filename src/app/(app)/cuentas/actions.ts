"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getOrgId } from "@/lib/org";
import { assertProperty, dateField, toFieldErrors } from "@/lib/form-helpers";
import { BillStatus, BillType, Currency } from "@/generated/prisma/enums";

export type BillFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

const billSchema = z.object({
  tipo: z.enum(Object.values(BillType) as [BillType, ...BillType[]], {
    message: "Tipo de cuenta inválido",
  }),
  periodo: z
    .string()
    .trim()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "El período debe ser AAAA-MM"),
  monto: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === undefined || v === "" ? null : v))
    .refine((v) => v === null || (!Number.isNaN(Number(v)) && Number(v) >= 0 && Number(v) < 1e12), {
      message: "Debe ser un número válido",
    }),
  moneda: z
    .enum(Object.values(Currency) as [Currency, ...Currency[]], {
      message: "Moneda inválida",
    })
    .default(Currency.CLP),
  fechaVencimiento: dateField("El vencimiento es obligatorio"),
  notas: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === undefined || v === "" ? null : v)),
});

export async function addBill(
  _prev: BillFormState,
  formData: FormData,
): Promise<BillFormState> {
  const propertyId = String(formData.get("propertyId") ?? "");
  if (!propertyId) return { error: "Falta la propiedad." };

  const parsed = billSchema.safeParse({
    tipo: formData.get("tipo"),
    periodo: formData.get("periodo"),
    monto: formData.get("monto") ?? undefined,
    moneda: formData.get("moneda") || undefined,
    fechaVencimiento: formData.get("fechaVencimiento"),
    notas: formData.get("notas") ?? undefined,
  });
  if (!parsed.success) {
    return { error: "Revisa los campos.", fieldErrors: toFieldErrors(parsed.error) };
  }

  const orgId = await getOrgId();
  if (!(await assertProperty(propertyId, orgId)))
    return { error: "Propiedad no encontrada." };

  try {
    await db.propertyBill.create({
      data: {
        organizationId: orgId,
        propertyId,
        tipo: parsed.data.tipo,
        periodo: parsed.data.periodo,
        monto: parsed.data.monto,
        moneda: parsed.data.moneda,
        fechaVencimiento: parsed.data.fechaVencimiento,
        estado: BillStatus.PENDIENTE,
        notas: parsed.data.notas,
      },
    });
  } catch (e) {
    console.error("addBill: no se pudo guardar la cuenta", e);
    return { error: "No se pudo guardar la cuenta. Intenta de nuevo." };
  }

  revalidatePath(`/propiedades/${propertyId}`);
  revalidatePath("/cuentas");
  return {};
}

export async function markBillPaid(formData: FormData): Promise<void> {
  const billId = String(formData.get("billId") ?? "");
  const propertyId = String(formData.get("propertyId") ?? "");
  const fechaPagoStr = String(formData.get("fechaPago") ?? "");
  if (!billId || !fechaPagoStr) return;

  const fechaPago = new Date(`${fechaPagoStr}T00:00:00Z`);
  if (Number.isNaN(fechaPago.getTime())) return;

  const orgId = await getOrgId();
  await db.propertyBill.updateMany({
    where: { id: billId, organizationId: orgId, estado: BillStatus.PENDIENTE },
    data: { estado: BillStatus.PAGADA, fechaPago },
  });
  revalidatePath(`/propiedades/${propertyId}`);
  revalidatePath("/cuentas");
}

export async function removeBill(formData: FormData): Promise<void> {
  const billId = String(formData.get("billId") ?? "");
  const propertyId = String(formData.get("propertyId") ?? "");
  if (!billId) return;

  const orgId = await getOrgId();
  await db.propertyBill.deleteMany({
    where: { id: billId, organizationId: orgId },
  });
  revalidatePath(`/propiedades/${propertyId}`);
  revalidatePath("/cuentas");
}
