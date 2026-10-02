// Helpers compartidos por las server actions (propiedades, cuentas…).
// Viven acá y no en un archivo "use server" porque ese tipo de archivo solo
// puede exportar funciones async.

import { z } from "zod";
import { db } from "@/lib/db";

export function toFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

// Confirma que la propiedad pertenece a la organización activa. Devuelve null si no.
export async function assertProperty(propertyId: string, orgId: string) {
  return db.property.findFirst({
    where: { id: propertyId, organizationId: orgId },
    select: { id: true },
  });
}

// Un campo de dinero opcional: viene como string del form; queda como string (Decimal) o null.
export const moneyField = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === undefined || v === "" ? null : v))
  .refine((v) => v === null || (!Number.isNaN(Number(v)) && Number(v) >= 0), {
    message: "Debe ser un número válido",
  });

export const requiredMoneyField = z
  .string()
  .trim()
  .min(1, "El monto es obligatorio")
  .refine((v) => !Number.isNaN(Number(v)) && Number(v) >= 0, {
    message: "Debe ser un número válido",
  });

// Año opcional: viene como string del form; queda como number o null.
export const optionalYearField = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === undefined || v === "" ? null : Number(v)))
  .refine(
    (v) => v === null || (Number.isInteger(v) && v >= 1800 && v <= 2100),
    { message: "Año inválido" },
  );

// Campo de texto opcional: "" del form queda como null.
export const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === undefined || v === "" ? null : v));

// Preserva el tipo literal del enum (p. ej. PropertyType) en vez de `string`,
// para que el resultado de zod calce con el tipo que Prisma espera.
export const enumField = <T extends Record<string, string>>(e: T) =>
  z.enum(Object.values(e) as [T[keyof T], ...T[keyof T][]]);

// Fecha "AAAA-MM-DD" del form, que queda como Date en UTC. `obligatorio` es el
// mensaje cuando viene vacía.
export const dateField = (obligatorio = "La fecha es obligatoria") =>
  z
    .string()
    .trim()
    .min(1, obligatorio)
    .refine((v) => !Number.isNaN(Date.parse(`${v}T00:00:00Z`)), {
      message: "Fecha inválida",
    })
    .transform((v) => new Date(`${v}T00:00:00Z`));

// Fecha opcional "AAAA-MM-DD": "" queda como null. Con `noFutura`, rechaza
// fechas posteriores a hoy (se compara por día, en UTC).
export const optionalDateField = ({ noFutura = false } = {}) =>
  z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === undefined || v === "" ? null : v))
    .refine((v) => v === null || !Number.isNaN(Date.parse(`${v}T00:00:00Z`)), {
      message: "Fecha inválida",
    })
    .transform((v) => (v === null ? null : new Date(`${v}T00:00:00Z`)))
    .refine(
      (d) => {
        if (!noFutura || d === null) return true;
        const ahora = new Date();
        const hoyUTC = Date.UTC(
          ahora.getUTCFullYear(),
          ahora.getUTCMonth(),
          ahora.getUTCDate(),
        );
        return d.getTime() <= hoyUTC;
      },
      { message: "La fecha no puede ser futura" },
    );
