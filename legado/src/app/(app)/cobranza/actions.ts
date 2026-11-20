"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { espacioParaEscribirEnRegistro, espaciosParaEscribir } from "@/lib/org";
import { usuarioEnAccion } from "@/lib/sesion";
import { vencimientoDelMes } from "@/lib/fechas";
import { saldoCobro } from "@/lib/cobros";
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

// Genera un RentCharge por cada contrato VIGENTE que cubra el período dado, en los espacios
// donde se puede escribir (el cliente, el suyo; el equipo, todos los clientes o solo el que
// el filtro de la pantalla eligió). Usa upsert para no sobrescribir cobros ya existentes.
export async function generateMonthCharges(formData: FormData): Promise<void> {
  const mes = String(formData.get("mes") ?? "");
  if (!/^\d{4}-\d{2}$/.test(mes)) return;

  const filtro = String(formData.get("cliente") ?? "") || null;
  const usuario = await usuarioEnAccion();
  const contracts = await db.leaseContract.findMany({
    where: { organizationId: { in: await espaciosParaEscribir(filtro) }, ...whereCubreMes(mes) },
    select: { id: true, organizationId: true, monto: true, moneda: true, diaPago: true },
  });

  for (const c of contracts) {
    await db.rentCharge.upsert({
      where: { contractId_periodo: { contractId: c.id, periodo: mes } },
      create: {
        organizationId: c.organizationId,
        modificadoPorId: usuario.id,
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
  redirect(`/cobranza?mes=${mes}${filtro ? `&cliente=${encodeURIComponent(filtro)}` : ""}`);
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

  // El espacio sale del cobro mismo, no de algo que mande el navegador. Marcar un arriendo
  // pagado lo puede hacer el dueño o el equipo (d25).
  const usuario = await usuarioEnAccion();
  const orgId = await espacioParaEscribirEnRegistro(
    await db.rentCharge.findUnique({ where: { id: chargeId }, select: { organizationId: true } }),
  );
  if (!orgId) return { error: "Cobro no encontrado." };
  const { notas } = parsed.data;

  // Dos abonos a la vez (o un reintento) no se pueden pisar: la transacción
  // bloquea la fila del cobro hasta terminar, y el segundo lee el total ya sumado.
  const resultado = await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "RentCharge" WHERE id = ${chargeId} AND "organizationId" = ${orgId} FOR UPDATE`;
    const charge = await tx.rentCharge.findFirst({
      where: { id: chargeId, organizationId: orgId },
      select: {
        estado: true,
        moneda: true,
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
    const cubierto =
      saldoCobro({ ...charge, montoPagado: totalPagado }) === 0;

    await tx.rentCharge.update({
      where: { id: chargeId },
      data: {
        estado: cubierto ? ChargeStatus.PAGADO : charge.estado,
        modificadoPorId: usuario.id,
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
    return null;
  });
  if (resultado) return resultado;

  revalidatePath("/cobranza");
  revalidatePath(`/cobranza/${chargeId}`);
  redirect(`/cobranza/${chargeId}`);
}

export async function updateChargeStatus(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const estado = String(formData.get("estado") ?? "");
  if (!id || !["PENDIENTE", "ATRASADO"].includes(estado)) return;

  const usuario = await usuarioEnAccion();
  const orgId = await espacioParaEscribirEnRegistro(
    await db.rentCharge.findUnique({ where: { id }, select: { organizationId: true } }),
  );
  if (!orgId) return;
  await db.rentCharge.updateMany({
    where: { id, organizationId: orgId },
    data:
      estado === "PENDIENTE"
        ? {
            modificadoPorId: usuario.id,
            estado: ChargeStatus.PENDIENTE,
            fechaPago: null,
            montoPagado: null,
            interesMora: null,
          }
        : { estado: ChargeStatus.ATRASADO, modificadoPorId: usuario.id },
  });

  revalidatePath("/cobranza");
  revalidatePath(`/cobranza/${id}`);
}

export async function deleteCharge(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const orgId = await espacioParaEscribirEnRegistro(
    await db.rentCharge.findUnique({ where: { id }, select: { organizationId: true } }),
  );
  if (!orgId) return;
  await db.rentCharge.deleteMany({ where: { id, organizationId: orgId } });

  revalidatePath("/cobranza");
  redirect("/cobranza");
}
