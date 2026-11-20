import { Prisma } from "@proges/db";
import type { ChargeStatus, Currency } from "@proges/db/enums";

// Un Decimal de Prisma, un número o cualquier cosa que sepa decirse como texto decimal.
type Monto = { toString(): string } | number;

const decimales = (moneda: Currency) => (moneda === "UF" ? 2 : 0);

// «Redondeado a los decimales de su moneda»: CLP entero, UF con 2 decimales (a la mitad, sube).
export function redondearMoneda(monto: Prisma.Decimal, moneda: Currency): Prisma.Decimal {
  return monto.toDecimalPlaces(decimales(moneda), Prisma.Decimal.ROUND_HALF_UP);
}

// Saldo que falta por pagar de un cobro (ADR 0006): entero en CLP, 2 decimales en UF, nunca
// negativo. Se calcula con Decimal, no con número: 15,5 − 10,2 con float daría 5.300000000000001.
export function saldoCobroDecimal(ch: {
  montoEsperado: Monto;
  montoPagado: Monto | null;
  moneda: Currency;
}): Prisma.Decimal {
  const saldo = new Prisma.Decimal(ch.montoEsperado.toString()).minus(new Prisma.Decimal((ch.montoPagado ?? 0).toString()));
  return redondearMoneda(Prisma.Decimal.max(0, saldo), ch.moneda);
}

// Lo mismo como número, solo para quien todavía lo muestra o lo suma como número (la agenda de
// vencimientos). Ya sale redondeado, así que la conversión no arrastra basura.
export function saldoCobro(ch: { montoEsperado: Monto; montoPagado: Monto | null; moneda: Currency }): number {
  return saldoCobroDecimal(ch).toNumber();
}

// «Parcial»: tiene abonos pero el cobro no está pagado entero.
export function esParcial(ch: {
  estado: ChargeStatus;
  montoPagado: Monto | null;
}): boolean {
  return ch.estado !== "PAGADO" && new Prisma.Decimal((ch.montoPagado ?? 0).toString()).gt(0);
}
