// El valor de la cartera y las deudas por cliente: la cuenta que hoy muestra «Resumen» en el
// portal viejo (legado/src/app/(app)/resumen/page.tsx), reducida a lo que sirve para
// Resultados y para el dueño: cuánto valen las propiedades, cuánto se debe y cuánto queda.
//
// Todo en pesos: lo que está en UF se pasa con el valor de la UF más reciente (nunca se guarda
// convertido). Sin valor de UF, lo que está en UF no se puede sumar y se cuenta aparte para
// avisarlo, en vez de dar un total que parece completo y no lo es.
//
// Función pura: recibe las propiedades ya leídas.
import type { Currency } from "@proges/db/enums";
import { toCLP } from "../../util/currency";

export type PropiedadParaValor = {
  organizationId: string;
  valorComercial: { toString(): string } | null;
  valorComercialMoneda: Currency;
  deudaSaldo: { toString(): string } | null;
  deudaMoneda: Currency;
};

export type ValorDeUnCliente = {
  clienteId: string;
  propiedades: number;
  propiedadesSinValor: number;
  valorComercial: number; // pesos
  deuda: number; // pesos
  valorNeto: number; // pesos
  deudasSinConvertir: number;
};

export function valorPorCliente(propiedades: PropiedadParaValor[], uf: number | null): ValorDeUnCliente[] {
  const porCliente = new Map<string, ValorDeUnCliente>();
  for (const p of propiedades) {
    const fila =
      porCliente.get(p.organizationId) ??
      {
        clienteId: p.organizationId,
        propiedades: 0,
        propiedadesSinValor: 0,
        valorComercial: 0,
        deuda: 0,
        valorNeto: 0,
        deudasSinConvertir: 0,
      };
    fila.propiedades += 1;

    const valor = toCLP(p.valorComercial, p.valorComercialMoneda, uf);
    if (valor === null) fila.propiedadesSinValor += 1;
    else fila.valorComercial += valor;

    // La deuda cuenta aunque la propiedad no tenga valor comercial.
    const deuda = toCLP(p.deudaSaldo, p.deudaMoneda, uf);
    if (deuda !== null && deuda > 0) fila.deuda += deuda;
    else if (deuda === null && Number(p.deudaSaldo ?? 0) > 0) fila.deudasSinConvertir += 1;

    porCliente.set(p.organizationId, fila);
  }
  return [...porCliente.values()].map((f) => ({
    ...f,
    valorComercial: Math.round(f.valorComercial),
    deuda: Math.round(f.deuda),
    valorNeto: Math.round(f.valorComercial - f.deuda),
  }));
}

export function totalDelValor(filas: ValorDeUnCliente[]): {
  propiedades: number;
  valorComercial: number;
  deuda: number;
  valorNeto: number;
} {
  return filas.reduce(
    (t, f) => ({
      propiedades: t.propiedades + f.propiedades,
      valorComercial: t.valorComercial + f.valorComercial,
      deuda: t.deuda + f.deuda,
      valorNeto: t.valorNeto + f.valorNeto,
    }),
    { propiedades: 0, valorComercial: 0, deuda: 0, valorNeto: 0 },
  );
}
