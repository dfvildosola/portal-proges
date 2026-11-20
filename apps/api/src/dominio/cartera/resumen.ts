// El resumen del mes del dueño autónomo: su inicio en una llamada. Cuántos arriendos del mes se
// pagaron, cuánto se esperaba y cuánto se cobró, cuánto gastó y cuánto está atrasado.
//
// Funciones puras: reciben las filas ya leídas. Las cuentas son por moneda (nunca se mezclan
// CLP y UF), con el mismo redondeo que la administración (sumarPorMoneda).
import type { Currency } from "@proges/db/enums";
import { saldoCobro } from "./cobros";
import { sumarPorMoneda, type MontoEnMoneda } from "./administracion";

type Decimal = { toString(): string };

export type CobroParaResumen = {
  estado: "PENDIENTE" | "PAGADO" | "ATRASADO";
  montoEsperado: Decimal;
  montoPagado: Decimal | null;
  moneda: Currency;
};

export type GastoParaResumen = {
  estado: "PENDIENTE" | "PAGADA";
  monto: Decimal | null;
  moneda: Currency;
};

export type ResumenDelMes = {
  arriendos: { pagados: number; total: number; esperado: MontoEnMoneda[]; cobrado: MontoEnMoneda[] };
  gastos: { cantidad: number; sinPagar: number; total: MontoEnMoneda[] };
  atrasados: { cantidad: number; saldo: MontoEnMoneda[] };
};

const aNumero = (d: Decimal): number => Number(d.toString());

// `cobrosDelMes`: los cobros del período. `gastosDelMes`: las cuentas del período. `atrasados`:
// todos los cobros atrasados de hoy, de cualquier mes (el llamador ya los filtró).
export function resumenDelMes(datos: {
  cobrosDelMes: CobroParaResumen[];
  gastosDelMes: GastoParaResumen[];
  atrasados: CobroParaResumen[];
}): ResumenDelMes {
  const { cobrosDelMes, gastosDelMes, atrasados } = datos;
  return {
    arriendos: {
      pagados: cobrosDelMes.filter((c) => c.estado === "PAGADO").length,
      total: cobrosDelMes.length,
      esperado: sumarPorMoneda(cobrosDelMes.map((c) => ({ moneda: c.moneda, monto: aNumero(c.montoEsperado) }))),
      cobrado: sumarPorMoneda(
        cobrosDelMes
          .filter((c) => c.montoPagado !== null)
          .map((c) => ({ moneda: c.moneda, monto: aNumero(c.montoPagado as Decimal) })),
      ),
    },
    gastos: {
      cantidad: gastosDelMes.length,
      sinPagar: gastosDelMes.filter((g) => g.estado === "PENDIENTE").length,
      total: sumarPorMoneda(
        gastosDelMes
          .filter((g) => g.monto !== null)
          .map((g) => ({ moneda: g.moneda, monto: aNumero(g.monto as Decimal) })),
      ),
    },
    atrasados: {
      cantidad: atrasados.length,
      saldo: sumarPorMoneda(
        atrasados.map((c) => ({
          moneda: c.moneda,
          monto: saldoCobro(c),
        })),
      ),
    },
  };
}
