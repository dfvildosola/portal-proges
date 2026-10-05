"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getOrgId } from "@/lib/org";
import { hoyChile, mesActual } from "@/lib/fechas";
import { formatDate } from "@/lib/format";
import {
  estadoContrato,
  estaVigente,
  montoReajustado,
  terminoRenovado,
} from "@/lib/contratos";
import { dateField, toFieldErrors } from "@/lib/form-helpers";

export type CicloFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  ok?: boolean;
};

// Cobros sin ningún pago: no hay plata de por medio, se pueden borrar o repreciar.
const SIN_PAGO = { montoPagado: null, estado: { not: "PAGADO" } } as const;

async function cargarContrato(id: string) {
  const orgId = await getOrgId();
  const c = await db.leaseContract.findFirst({
    where: { id, organizationId: orgId },
  });
  if (!c) return null;
  return { c, orgId };
}

const NO_ENCONTRADO: CicloFormState = {
  error: "Contrato no encontrado en esta organización.",
};

function revalidar(id: string, propertyId: string) {
  revalidatePath("/contratos");
  revalidatePath(`/contratos/${id}`);
  revalidatePath(`/propiedades/${propertyId}`);
  revalidatePath("/cobranza");
  revalidatePath("/pendientes");
  revalidatePath("/");
}

export async function renovarContrato(id: string): Promise<CicloFormState> {
  const cargado = await cargarContrato(id);
  if (!cargado) return NO_ENCONTRADO;
  const { c, orgId } = cargado;
  const hoy = hoyChile();
  const estado = estadoContrato(c, hoy);
  if (c.fechaSalida || estado === "POR_EMPEZAR") {
    return { error: "Este contrato no se puede renovar (tiene salida o aún no empieza)." };
  }
  const res = await db.leaseContract.updateMany({
    where: { id, organizationId: orgId },
    data: { fechaTermino: terminoRenovado(c, hoy) },
  });
  if (res.count === 0) {
    return { error: "No se pudo renovar: el contrato ya no existe." };
  }
  revalidar(id, c.propertyId);
  return { ok: true };
}

const terminarSchema = z.object({
  fechaSalida: dateField("La fecha de salida es obligatoria"),
});

export async function terminarContrato(
  id: string,
  _prev: CicloFormState,
  formData: FormData,
): Promise<CicloFormState> {
  const parsed = terminarSchema.safeParse({
    fechaSalida: formData.get("fechaSalida"),
  });
  if (!parsed.success) {
    return { error: "Revisa los campos.", fieldErrors: toFieldErrors(parsed.error) };
  }
  const { fechaSalida } = parsed.data;

  const cargado = await cargarContrato(id);
  if (!cargado) return NO_ENCONTRADO;
  const { c, orgId } = cargado;
  if (c.fechaSalida) {
    return { error: "El contrato ya tiene fecha de salida; corrígela desde Editar." };
  }
  if (fechaSalida < c.fechaInicio) {
    return {
      fieldErrors: { fechaSalida: "La salida no puede ser anterior al inicio" },
    };
  }

  const mesSalida = fechaSalida.toISOString().slice(0, 7);
  await db.$transaction([
    db.leaseContract.update({ where: { id }, data: { fechaSalida } }),
    db.rentCharge.deleteMany({
      where: {
        contractId: id,
        organizationId: orgId,
        periodo: { gt: mesSalida },
        ...SIN_PAGO,
      },
    }),
  ]);

  revalidar(id, c.propertyId);
  return { ok: true };
}

const reajustarSchema = z.object({
  porcentaje: z
    .string()
    .trim()
    .min(1, "El porcentaje es obligatorio")
    .transform((v) => Number(v.replace(",", ".")))
    .refine((n) => Number.isFinite(n) && n > 0 && n <= 100, {
      message: "Debe ser un porcentaje mayor que 0 y hasta 100",
    }),
  fechaEfectiva: dateField("La fecha es obligatoria"),
});

export async function reajustarContrato(
  id: string,
  _prev: CicloFormState,
  formData: FormData,
): Promise<CicloFormState> {
  const parsed = reajustarSchema.safeParse({
    porcentaje: formData.get("porcentaje"),
    fechaEfectiva: formData.get("fechaEfectiva"),
  });
  if (!parsed.success) {
    return { error: "Revisa los campos.", fieldErrors: toFieldErrors(parsed.error) };
  }
  const { porcentaje, fechaEfectiva } = parsed.data;

  const cargado = await cargarContrato(id);
  if (!cargado) return NO_ENCONTRADO;
  const { c, orgId } = cargado;
  if (!c.aplicaReajuste) {
    return { error: "Este contrato no tiene reajuste." };
  }
  if (!estaVigente(c, hoyChile())) {
    return { error: "Solo se puede reajustar un contrato vigente." };
  }
  if (fechaEfectiva < c.fechaInicio) {
    return {
      fieldErrors: { fechaEfectiva: "La fecha no puede ser anterior al inicio del contrato" },
    };
  }
  const mes = fechaEfectiva.toISOString().slice(0, 7);
  if (mes > mesActual()) {
    const desde = new Date(`${mes}-01T00:00:00.000Z`);
    return {
      fieldErrors: {
        fechaEfectiva: `Se puede aplicar desde el ${formatDate(desde)}: antes, los cobros que aún no se generan saldrían con el monto nuevo.`,
      },
    };
  }
  const nuevo = montoReajustado(Number(c.monto), porcentaje, c.moneda);

  await db.$transaction([
    db.leaseContract.update({
      where: { id },
      data: { monto: nuevo, ultimoReajuste: fechaEfectiva },
    }),
    db.rentCharge.updateMany({
      where: {
        contractId: id,
        organizationId: orgId,
        periodo: { gte: mes },
        ...SIN_PAGO,
      },
      data: { montoEsperado: nuevo },
    }),
  ]);

  revalidar(id, c.propertyId);
  return { ok: true };
}
