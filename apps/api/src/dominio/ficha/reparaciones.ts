// Las cuentas de las reparaciones de una propiedad: lo cobrado al dueño, el costo de los
// maestros, el margen y el total por recinto. Funciones puras que usan las de la obra
// (dominio/obra/obra.ts, de la pieza E): un número vive en un solo lugar.
//
// Plata: lo cobrado viene de la orden de venta de Odoo (en pesos o en UF); el costo del maestro
// es siempre en pesos. El margen solo se calcula donde las dos cosas están en pesos: restar UF
// con pesos sin un valor de UF sería inventar el número.
import { Prisma, type Currency } from "@proges/db";
import type { Monto } from "@proges/contrato";
import { aMonto } from "../../util/al-contrato";
import { adicionales, aprobado, type PresupuestoCuenta } from "../obra/obra";

type Valor = Prisma.Decimal | number | string;

// Suma montos separándolos por moneda (nunca se mezclan pesos con UF). Los pesos primero.
export function sumarPorMoneda(montos: { valor: Valor; moneda: Currency }[]): Monto[] {
  const totales = new Map<Currency, Prisma.Decimal>();
  for (const m of montos) {
    totales.set(m.moneda, (totales.get(m.moneda) ?? new Prisma.Decimal(0)).plus(m.valor));
  }
  return [...totales.entries()]
    .sort(([a], [b]) => (a === b ? 0 : a === "CLP" ? -1 : 1))
    .map(([moneda, valor]) => aMonto(valor, moneda));
}

// Lo que se acordó con los maestros: el presupuesto original aprobado más los adicionales
// aprobados.
export function costoAprobado(presupuestos: PresupuestoCuenta[]): number {
  return Math.round((aprobado(presupuestos) + adicionales(presupuestos)) * 100) / 100;
}

// Cobrado menos costo, solo si la orden está en pesos. Sin orden, o con orden en UF: null.
export function margenDeObra(orden: { total: Valor; moneda: Currency } | null, costo: number): Monto | null {
  if (!orden || orden.moneda !== "CLP") return null;
  return aMonto(new Prisma.Decimal(orden.total).minus(costo), "CLP");
}

export type ObraParaCifras = { orden: { total: Valor; moneda: Currency } | null; costo: number };

// Las cifras de toda la propiedad. `margen` suma solo las obras con orden en pesos (con su
// propio costo); si ninguna lo es, null.
export function cifrasDeObras(obras: ObraParaCifras[]): { cobrado: Monto[]; costo: Monto; margen: Monto | null } {
  const conOrdenEnPesos = obras.filter((o) => o.orden?.moneda === "CLP");
  const margen = conOrdenEnPesos.length
    ? aMonto(
        conOrdenEnPesos.reduce((acc, o) => acc.plus(o.orden!.total).minus(o.costo), new Prisma.Decimal(0)),
        "CLP",
      )
    : null;
  return {
    cobrado: sumarPorMoneda(obras.flatMap((o) => (o.orden ? [{ valor: o.orden.total, moneda: o.orden.moneda }] : []))),
    costo: aMonto(obras.reduce((acc, o) => acc.plus(o.costo), new Prisma.Decimal(0)), "CLP"),
    margen,
  };
}

export type PartidaParaTotal = {
  recinto: string | null;
  precioDueno: Valor | null;
  moneda: Currency;
  quitadaEnOdoo: boolean;
};

// Lo cobrado por recinto, en el orden en que aparecen. Las líneas que Odoo ya no trae no cuentan.
export function totalPorRecinto(
  partidas: PartidaParaTotal[],
): { recinto: string | null; total: Monto[]; partidas: number }[] {
  const grupos = new Map<string | null, PartidaParaTotal[]>();
  for (const p of partidas) {
    if (p.quitadaEnOdoo) continue;
    grupos.set(p.recinto, [...(grupos.get(p.recinto) ?? []), p]);
  }
  return [...grupos.entries()].map(([recinto, lista]) => ({
    recinto,
    total: sumarPorMoneda(lista.flatMap((p) => (p.precioDueno === null ? [] : [{ valor: p.precioDueno, moneda: p.moneda }]))),
    partidas: lista.length,
  }));
}
