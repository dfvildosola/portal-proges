"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getOrgId } from "@/lib/org";
import { vencimientoDelMes } from "@/lib/fechas";
import { whereCubreMes } from "@/lib/contratos";
import { ChargeStatus } from "@/generated/prisma/enums";
import { Prisma } from "@/generated/prisma/client";
import { dateField, toFieldErrors } from "@/lib/form-helpers";

export type ChargeFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

const paymentSchema = z.object({
  fechaPago: dateField(),
  montoPagado: z
    .string()
    .trim()
    .min(1, "El monto pagado es obligatorio")
    .refine((v) => !Number.isNaN(Number(v)) && Number(v) > 0, {
      message: "El monto debe ser mayor que cero",
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
  const charge = await db.rentCharge.findFirst({
    where: { id: chargeId, organizationId: orgId },
    select: {
      estado: true,
      montoEsperado: true,
      montoPagado: true,
      notas: true,
    },
  });
  if (!charge) return { error: "Cobro no encontrado." };
  if (charge.estado === ChargeStatus.PAGADO) {
    return { error: "Este cobro ya está pagado." };
  }

  // Cada pago se suma a lo ya pagado (ADR 0006). Decimal, no Number: la UF tiene decimales.
  const totalPagado = (charge.montoPagado ?? new Prisma.Decimal(0)).plus(
    new Prisma.Decimal(parsed.data.montoPagado),
  );
  const cubierto = totalPagado.gte(charge.montoEsperado);
  const { notas } = parsed.data;

  await db.rentCharge.update({
    where: { id: chargeId },
    data: {
      estado: cubierto ? ChargeStatus.PAGADO : charge.estado,
      fechaPago: parsed.data.fechaPago,
      montoPagado: totalPagado,
      ...(parsed.data.interesMora !== null && {
        interesMora: parsed.data.interesMora,
      }),
      ...(notas !== null && {
        notas: charge.notas ? `${charge.notas} · ${notas}` : notas,
      }),
    },
  });

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
