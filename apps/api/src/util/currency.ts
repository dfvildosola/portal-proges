// Conversión de moneda para informes. Lee el valor UF más reciente de
// `CurrencyValue` (poblado por el seed / actualizable a futuro) y convierte
// montos UF↔CLP. Nunca se guarda convertido: se calcula en lectura.
import type { Currency } from "@proges/db/enums";
import { db } from "@proges/db";

// Valor UF más reciente registrado (CLP por 1 UF), o null si no hay ninguno.
export async function getLatestUf(): Promise<number | null> {
  const row = await db.currencyValue.findFirst({
    where: { tipo: "UF" },
    orderBy: { fecha: "desc" },
  });
  return row ? Number(row.valor) : null;
}

// Convierte un monto a CLP usando el valor UF dado.
// Devuelve null si el monto es nulo, o si es UF y no hay valor UF disponible.
export function toCLP(
  value: { toString(): string } | number | null | undefined,
  moneda: Currency,
  uf: number | null,
): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value.toString());
  if (Number.isNaN(n)) return null;
  if (moneda === "CLP") return n;
  if (uf === null) return null;
  return n * uf;
}
