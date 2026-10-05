"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getOrgId } from "@/lib/org";
import {
  dateField,
  enumField,
  moneyField,
  optionalDateField,
  toFieldErrors,
} from "@/lib/form-helpers";
import { plazoEnMeses } from "@/lib/contratos";
import { Currency, AdjustmentType } from "@/generated/prisma/enums";

export type ContractFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

const contractSchema = z
  .object({
    propertyId: z.string().trim().min(1, "Elige una propiedad"),
    tenantId: z.string().trim().min(1, "Elige un arrendatario"),
    monto: z
      .string()
      .trim()
      .min(1, "El monto es obligatorio")
      .refine((v) => !Number.isNaN(Number(v)) && Number(v) > 0, {
        message: "Debe ser un número mayor que 0",
      }),
    moneda: enumField(Currency),
    reajusteTipo: enumField(AdjustmentType),
    reajusteFrecuenciaMeses: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v === undefined || v === "" ? null : v))
      .refine(
        (v) => v === null || (Number.isInteger(Number(v)) && Number(v) > 0),
        { message: "Debe ser un número de meses válido" },
      ),
    fechaInicio: dateField(),
    fechaTermino: dateField(),
    renovacionAutomatica: z.boolean(),
    diasAviso: z
      .string()
      .trim()
      .min(1, "Los días de aviso son obligatorios")
      .refine((v) => Number.isInteger(Number(v)) && Number(v) >= 0, {
        message: "Debe ser un número entero, 0 o más",
      }),
    plazoMeses: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v === undefined || v === "" ? null : v))
      .refine(
        (v) => v === null || (Number.isInteger(Number(v)) && Number(v) >= 1),
        { message: "Debe ser un número de meses, 1 o más" },
      ),
    garantia: moneyField,
    fechaSalida: optionalDateField(),
    ultimoReajuste: optionalDateField({ noFutura: true }),
    diaPago: z
      .string()
      .trim()
      .min(1, "El día de pago es obligatorio")
      .refine(
        (v) => Number.isInteger(Number(v)) && Number(v) >= 1 && Number(v) <= 31,
        { message: "Debe ser un día entre 1 y 31" },
      ),
  })
  .refine((d) => d.fechaTermino >= d.fechaInicio, {
    message: "El término no puede ser anterior al inicio",
    path: ["fechaTermino"],
  })
  .refine(
    (d) => d.reajusteTipo === AdjustmentType.NINGUNO || d.reajusteFrecuenciaMeses,
    {
      message: "Indica cada cuántos meses se reajusta",
      path: ["reajusteFrecuenciaMeses"],
    },
  )
  .refine((d) => d.fechaSalida === null || d.fechaSalida >= d.fechaInicio, {
    message: "La salida no puede ser anterior al inicio",
    path: ["fechaSalida"],
  })
  .refine(
    (d) =>
      d.reajusteTipo === AdjustmentType.NINGUNO ||
      d.ultimoReajuste === null ||
      d.ultimoReajuste >= d.fechaInicio,
    {
      message: "El reajuste no puede ser anterior al inicio",
      path: ["ultimoReajuste"],
    },
  );

function parse(formData: FormData) {
  return contractSchema.safeParse({
    propertyId: formData.get("propertyId"),
    tenantId: formData.get("tenantId"),
    monto: formData.get("monto"),
    moneda: formData.get("moneda"),
    reajusteTipo: formData.get("reajusteTipo"),
    reajusteFrecuenciaMeses: formData.get("reajusteFrecuenciaMeses") ?? "",
    fechaInicio: formData.get("fechaInicio"),
    fechaTermino: formData.get("fechaTermino"),
    renovacionAutomatica: formData.get("renovacionAutomatica") !== null,
    diasAviso: formData.get("diasAviso"),
    plazoMeses: formData.get("plazoMeses") ?? "",
    garantia: formData.get("garantia") ?? "",
    fechaSalida: formData.get("fechaSalida") ?? "",
    ultimoReajuste: formData.get("ultimoReajuste") ?? "",
    diaPago: formData.get("diaPago"),
  });
}

// Construye el objeto de datos para Prisma a partir de lo validado.
function toData(d: z.infer<typeof contractSchema>) {
  const aplicaReajuste = d.reajusteTipo !== AdjustmentType.NINGUNO;
  return {
    propertyId: d.propertyId,
    tenantId: d.tenantId,
    monto: d.monto,
    moneda: d.moneda,
    aplicaReajuste,
    reajusteTipo: d.reajusteTipo,
    // La frecuencia solo tiene sentido si hay reajuste.
    reajusteFrecuenciaMeses: aplicaReajuste
      ? d.reajusteFrecuenciaMeses
        ? Number(d.reajusteFrecuenciaMeses)
        : null
      : null,
    // Sin reajuste no hay «último reajuste».
    ultimoReajuste: aplicaReajuste ? d.ultimoReajuste : null,
    fechaInicio: d.fechaInicio,
    fechaTermino: d.fechaTermino,
    diaPago: Number(d.diaPago),
    renovacionAutomatica: d.renovacionAutomatica,
    diasAviso: Number(d.diasAviso),
    plazoMeses: d.plazoMeses
      ? Number(d.plazoMeses)
      : plazoEnMeses(d.fechaInicio, d.fechaTermino),
    garantia: d.garantia,
  };
}

// Verifica que propiedad y arrendatario pertenezcan a la organización activa.
async function assertRefs(propertyId: string, tenantId: string, orgId: string) {
  const [prop, tenant] = await Promise.all([
    db.property.findFirst({
      where: { id: propertyId, organizationId: orgId },
      select: { id: true },
    }),
    db.tenant.findFirst({
      where: { id: tenantId, organizationId: orgId },
      select: { id: true },
    }),
  ]);
  return Boolean(prop && tenant);
}

export async function createContract(
  _prev: ContractFormState,
  formData: FormData,
): Promise<ContractFormState> {
  const parsed = parse(formData);
  if (!parsed.success) {
    return { error: "Revisa los campos.", fieldErrors: toFieldErrors(parsed.error) };
  }

  const orgId = await getOrgId();
  if (!(await assertRefs(parsed.data.propertyId, parsed.data.tenantId, orgId))) {
    return { error: "Propiedad o arrendatario no encontrado." };
  }

  const created = await db.leaseContract.create({
    data: { ...toData(parsed.data), organizationId: orgId },
  });

  revalidatePath("/contratos");
  revalidatePath(`/propiedades/${parsed.data.propertyId}`);
  redirect(`/contratos/${created.id}`);
}

export async function updateContract(
  _prev: ContractFormState,
  formData: FormData,
): Promise<ContractFormState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Falta el identificador del contrato." };

  const parsed = parse(formData);
  if (!parsed.success) {
    return { error: "Revisa los campos.", fieldErrors: toFieldErrors(parsed.error) };
  }

  const orgId = await getOrgId();
  if (!(await assertRefs(parsed.data.propertyId, parsed.data.tenantId, orgId))) {
    return { error: "Propiedad o arrendatario no encontrado." };
  }

  const res = await db.leaseContract.updateMany({
    where: { id, organizationId: orgId },
    data: {
      ...toData(parsed.data),
      // Solo se toca la salida si el formulario trajo el campo (contratos que ya la tenían).
      ...(formData.has("fechaSalida") && { fechaSalida: parsed.data.fechaSalida }),
    },
  });
  if (res.count === 0) return { error: "Contrato no encontrado." };

  revalidatePath("/contratos");
  revalidatePath(`/contratos/${id}`);
  revalidatePath(`/propiedades/${parsed.data.propertyId}`);
  revalidatePath("/cobranza");
  revalidatePath("/pendientes");
  revalidatePath("/");
  redirect(`/contratos/${id}`);
}

export async function deleteContract(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const orgId = await getOrgId();
  await db.leaseContract.deleteMany({ where: { id, organizationId: orgId } });

  revalidatePath("/contratos");
  redirect("/contratos");
}
