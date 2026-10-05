"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getOrgId } from "@/lib/org";
import { vencimientoDelMes } from "@/lib/fechas";
import { whereCubreMes } from "@/lib/contratos";
import { ChargeStatus } from "@/generated/prisma/enums";

export type ChargeFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

const dateField = z
  .string()
  .trim()
  .min(1, "La fecha es obligatoria")
  .refine((v) => !Number.isNaN(Date.parse(`${v}T00:00:00Z`)), {
    message: "Fecha inválida",
  })
  .transform((v) => new Date(`${v}T00:00:00Z`));

const paymentSchema = z.object({
  fechaPago: dateField,
  montoPagado: z
    .string()
    .trim()
    .min(1, "El monto pagado es obligatorio")
    .refine((v) => !Number.isNaN(Number(v)) && Number(v) >= 0, {
      message: "Debe ser un número válido",
    }),
  interesMora: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === undefined || v === "" ? null : v))
    .refine((v) => v === null || (!Number.isNaN(Number(v)) && Number(v) >= 0), {
      message: "Debe ser un número válido",
    }),
  notas: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === undefined || v === "" ? null : v)),
});

function toFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

// Genera un RentCharge por cada contrato VIGENTE que cubra el período dado.
// Usa upsert para no sobrescribir cobros ya existentes.
export async function generateMonthCharges(formData: FormData): Promise<void> {
  const mes = String(formData.get("mes") ?? "");
  if (!/^\d{4}-\d{2}$/.test(mes)) return;

  const orgId = await getOrgId();
  const contracts = await db.leaseContract.findMany({
    where: { organizationId: orgId, ...whereCubreMes(mes) },
    select: { id: true, monto: true, moneda: true, diaPago: true },
  });

  for (const c of contracts) {
    await db.rentCharge.upsert({
      where: { contractId_periodo: { contractId: c.id, periodo: mes } },
      create: {
        organizationId: orgId,
        contractId: c.id,
        periodo: mes,
        montoEsperado: c.monto,
        moneda: c.moneda,
        fechaVencimiento: vencimientoDelMes(mes, c.diaPago),
        estado: ChargeStatus.PENDIENTE,
      },
      update: {},
    });
  }

  revalidatePath("/cobranza");
  redirect(`/cobranza?mes=${mes}`);
}

export async function registerPayment(
  _prev: ChargeFormState,
  formData: FormData,
): Promise<ChargeFormState> {
  const chargeId = String(formData.get("chargeId") ?? "");
  if (!chargeId) return { error: "Falta el identificador del cobro." };

  const parsed = paymentSchema.safeParse({
    fechaPago: formData.get("fechaPago"),
    montoPagado: formData.get("montoPagado"),
    interesMora: formData.get("interesMora") ?? "",
    notas: formData.get("notas") ?? "",
  });
  if (!parsed.success) {
    return { error: "Revisa los campos.", fieldErrors: toFieldErrors(parsed.error) };
  }

  const orgId = await getOrgId();
  const res = await db.rentCharge.updateMany({
    where: { id: chargeId, organizationId: orgId },
    data: {
      estado: ChargeStatus.PAGADO,
      fechaPago: parsed.data.fechaPago,
      montoPagado: parsed.data.montoPagado,
      interesMora: parsed.data.interesMora,
      notas: parsed.data.notas,
    },
  });
  if (res.count === 0) return { error: "Cobro no encontrado." };

  revalidatePath("/cobranza");
  revalidatePath(`/cobranza/${chargeId}`);
  redirect(`/cobranza/${chargeId}`);
}

export async function updateChargeStatus(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const estado = String(formData.get("estado") ?? "");
  if (!id || !["PENDIENTE", "ATRASADO"].includes(estado)) return;

  const orgId = await getOrgId();
  await db.rentCharge.updateMany({
    where: { id, organizationId: orgId },
    data:
      estado === "PENDIENTE"
        ? {
            estado: ChargeStatus.PENDIENTE,
            fechaPago: null,
            montoPagado: null,
            interesMora: null,
            notas: null,
          }
        : { estado: ChargeStatus.ATRASADO },
  });

  revalidatePath("/cobranza");
  revalidatePath(`/cobranza/${id}`);
}

export async function deleteCharge(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const orgId = await getOrgId();
  await db.rentCharge.deleteMany({ where: { id, organizationId: orgId } });

  revalidatePath("/cobranza");
  redirect("/cobranza");
}
