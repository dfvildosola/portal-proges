import type { Currency } from "@proges/db/enums";

// Formatea un monto (Prisma Decimal, número o string) en formato chileno.
// CLP sin decimales; UF con 2. Devuelve "—" si es nulo.
export function formatMoney(
  value: { toString(): string } | number | null | undefined,
  moneda?: Currency,
): string {
  if (value === null || value === undefined) return "—";
  const n = Number(value.toString());
  if (Number.isNaN(n)) return "—";
  const formatted = new Intl.NumberFormat("es-CL", {
    maximumFractionDigits: moneda === "UF" ? 2 : 0,
  }).format(n);
  return moneda ? `${formatted} ${moneda}` : formatted;
}

// Fecha corta en formato chileno (dd-mm-aaaa). "—" si es nula.
// Las fechas del dominio son "solo fecha" (sin hora real): se guardan a medianoche
// UTC y se leen/formatean en UTC para evitar corrimientos de día por zona horaria.
export function formatDate(value: Date | null | undefined): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-CL", { timeZone: "UTC" }).format(value);
}

// Valor "YYYY-MM-DD" para un <input type="date"> a partir de una fecha guardada.
export function toDateInputValue(value: Date | null | undefined): string {
  if (!value) return "";
  const y = value.getUTCFullYear();
  const m = String(value.getUTCMonth() + 1).padStart(2, "0");
  const d = String(value.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Formatea metros cuadrados con hasta 2 decimales. "—" si es nulo.
export function formatM2(
  value: { toString(): string } | number | null | undefined,
): string {
  if (value === null || value === undefined) return "—";
  const n = Number(value.toString());
  if (Number.isNaN(n)) return "—";
  return `${new Intl.NumberFormat("es-CL", { maximumFractionDigits: 2 }).format(n)} m²`;
}

// Formatea "YYYY-MM" → "mayo 2026" en español.
export function formatPeriodo(periodo: string): string {
  const [year, month] = periodo.split("-").map(Number);
  if (!year || !month) return periodo;
  const date = new Date(Date.UTC(year, month - 1, 1));
  const monthName = new Intl.DateTimeFormat("es-CL", {
    month: "long",
    timeZone: "UTC",
  }).format(date);
  return `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`;
}
