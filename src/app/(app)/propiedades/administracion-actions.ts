"use server";

// Poner una propiedad en administración de arriendos, editarla y terminarla (pieza M, ADR 0012).
//
// Solo el EQUIPO lo hace (el dueño ve la administración, no la maneja). El espacio donde se
// escribe sale de la propiedad o de la administración que se toca, nunca del formulario.
// Una propiedad tiene a lo más una administración vigente a la vez: no se permite que dos se
// pisen en el tiempo.

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { equipoEnAccion } from "@/lib/sesion";
import { espacioParaEscribirEnPropiedad, espacioParaEscribirEnRegistro } from "@/lib/org";
import { dateField, optionalDateField, toFieldErrors } from "@/lib/form-helpers";

export type AdministracionFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

// La comisión llega como texto del formulario: un número mayor que 0 y hasta 100, con a lo
// más dos decimales (la columna es Decimal(5,2)).
const comisionField = z
  .string()
  .trim()
  .min(1, "La comisión es obligatoria")
  .refine((v) => !Number.isNaN(Number(v)) && Number(v) > 0 && Number(v) <= 100, {
    message: "Debe ser un porcentaje entre 0 y 100",
  })
  .transform((v) => Math.round(Number(v) * 100) / 100);

const ponerSchema = z.object({
  desde: dateField("La fecha de inicio es obligatoria"),
  comisionPct: comisionField,
});

const editarSchema = z.object({
  desde: dateField("La fecha de inicio es obligatoria"),
  hasta: optionalDateField(),
  comisionPct: comisionField,
});

const terminarSchema = z.object({
  hasta: dateField("La fecha de término es obligatoria"),
});

// ¿Hay otra administración de esa propiedad que se pise con el rango desde..hasta?
// Dos rangos se pisan si cada uno empieza antes de que termine el otro (un rango sin
// «hasta» no termina nunca). `exceptoId` es la que se está editando: no se pisa a sí misma.
async function haySolape(
  propertyId: string,
  desde: Date,
  hasta: Date | null,
  exceptoId?: string,
): Promise<boolean> {
  const otra = await db.administracion.findFirst({
    where: {
      propertyId,
      ...(exceptoId ? { id: { not: exceptoId } } : {}),
      OR: [{ hasta: null }, { hasta: { gte: desde } }],
      ...(hasta ? { desde: { lte: hasta } } : {}),
    },
    select: { id: true },
  });
  return otra !== null;
}

const MENSAJE_SOLAPE =
  "Esta propiedad ya tiene una administración en esas fechas. Edítala o termínala antes de poner otra.";

export async function ponerEnAdministracion(
  _prev: AdministracionFormState,
  formData: FormData,
): Promise<AdministracionFormState> {
  await equipoEnAccion();
  const propertyId = String(formData.get("propertyId") ?? "");
  if (!propertyId) return { error: "Falta la propiedad." };

  const parsed = ponerSchema.safeParse({
    desde: formData.get("desde") ?? "",
    comisionPct: formData.get("comisionPct") ?? "",
  });
  if (!parsed.success) {
    return { error: "Revisa los campos.", fieldErrors: toFieldErrors(parsed.error) };
  }

  const orgId = await espacioParaEscribirEnPropiedad(propertyId);
  if (!orgId) return { error: "Propiedad no encontrada." };

  if (await haySolape(propertyId, parsed.data.desde, null)) return { error: MENSAJE_SOLAPE };

  await db.administracion.create({
    data: {
      organizationId: orgId,
      propertyId,
      desde: parsed.data.desde,
      comisionPct: parsed.data.comisionPct,
    },
  });

  revalidatePath(`/propiedades/${propertyId}`);
  revalidatePath("/administracion");
  return {};
}

export async function editarAdministracion(
  _prev: AdministracionFormState,
  formData: FormData,
): Promise<AdministracionFormState> {
  await equipoEnAccion();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Falta la administración." };

  const parsed = editarSchema.safeParse({
    desde: formData.get("desde") ?? "",
    hasta: formData.get("hasta") ?? "",
    comisionPct: formData.get("comisionPct") ?? "",
  });
  if (!parsed.success) {
    return { error: "Revisa los campos.", fieldErrors: toFieldErrors(parsed.error) };
  }
  const { desde, hasta, comisionPct } = parsed.data;
  if (hasta && hasta < desde) {
    return { error: "Revisa los campos.", fieldErrors: { hasta: "No puede ser anterior al inicio" } };
  }

  const actual = await db.administracion.findUnique({
    where: { id },
    select: { organizationId: true, propertyId: true },
  });
  const orgId = await espacioParaEscribirEnRegistro(actual);
  if (!actual || !orgId) return { error: "Administración no encontrada." };

  if (await haySolape(actual.propertyId, desde, hasta, id)) return { error: MENSAJE_SOLAPE };

  await db.administracion.update({
    where: { id },
    data: { desde, hasta, comisionPct },
  });

  revalidatePath(`/propiedades/${actual.propertyId}`);
  revalidatePath("/administracion");
  return {};
}

// Terminar es poner la fecha «hasta». La comisión del mes en que termina se cobra completa
// (los meses se cuentan enteros). Terminar no borra nada: el historial queda.
export async function terminarAdministracion(
  _prev: AdministracionFormState,
  formData: FormData,
): Promise<AdministracionFormState> {
  await equipoEnAccion();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Falta la administración." };

  const parsed = terminarSchema.safeParse({ hasta: formData.get("hasta") ?? "" });
  if (!parsed.success) {
    return { error: "Revisa los campos.", fieldErrors: toFieldErrors(parsed.error) };
  }

  const actual = await db.administracion.findUnique({
    where: { id },
    select: { organizationId: true, propertyId: true, desde: true },
  });
  const orgId = await espacioParaEscribirEnRegistro(actual);
  if (!actual || !orgId) return { error: "Administración no encontrada." };

  if (parsed.data.hasta < actual.desde) {
    return { error: "Revisa los campos.", fieldErrors: { hasta: "No puede ser anterior al inicio" } };
  }

  await db.administracion.update({ where: { id }, data: { hasta: parsed.data.hasta } });

  revalidatePath(`/propiedades/${actual.propertyId}`);
  revalidatePath("/administracion");
  return {};
}
