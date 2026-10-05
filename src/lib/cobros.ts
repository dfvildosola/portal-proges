import type { Prisma } from "@/generated/prisma/client";
import type { ChargeStatus, Currency } from "@/generated/prisma/enums";

type Monto = Prisma.Decimal | number;

// Saldo que falta por pagar de un cobro (ADR 0006): entero en CLP, 2 decimales
// en UF, nunca negativo. Se redondea para no arrastrar basura de punto flotante
// (15,5 − 10,2 daría 5.300000000000001).
export function saldoCobro(ch: {
  montoEsperado: Monto;
  montoPagado: Monto | null;
  moneda: Currency;
}): number {
  const saldo = Math.max(0, Number(ch.montoEsperado) - Number(ch.montoPagado ?? 0));
  return ch.moneda === "UF"
    ? Math.round((saldo + Number.EPSILON) * 100) / 100
    : Math.round(saldo);
}

// «Parcial»: tiene abonos pero el cobro no está pagado entero.
export function esParcial(ch: {
  estado: ChargeStatus;
  montoPagado: Monto | null;
}): boolean {
  return ch.estado !== "PAGADO" && Number(ch.montoPagado ?? 0) > 0;
}
