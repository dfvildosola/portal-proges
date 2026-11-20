// Obras: lo acordado con el maestro contra lo facturado, y el margen para Proges.
//
// Las cuentas del maestro (aprobado, adicionales, facturado) vienen de dominio/obra/obra.ts,
// que es donde vive esa cuenta: acá solo se importan para que la pantalla de la obra y
// Resultados muestren siempre el mismo número. Funciones puras.
import { hayCostoAprobado, planContraReal, type FacturaCuenta, type PresupuestoCuenta } from "../obra/obra";
import { aUnDecimal } from "./semanas";

const centavos = (n: number) => Math.round(n * 100) / 100;

export type ObraParaResultados = {
  servicioId: string;
  clienteId: string;
  clienteNombre: string;
  propiedad: string;
  estado: "ABIERTO" | "TERMINADO";
  presupuestos: PresupuestoCuenta[];
  facturas: FacturaCuenta[];
  // La orden de venta al dueño, si ya existe.
  orden: { total: number; moneda: "CLP" | "UF" } | null;
};

export type ResultadoDeObra = {
  servicioId: string;
  clienteId: string;
  clienteNombre: string;
  propiedad: string;
  estado: "ABIERTO" | "TERMINADO";
  costoAprobado: number; // aprobado + adicionales
  facturado: number;
  diferencia: number; // facturado − aprobado; positivo: costó más de lo acordado
  precioDueno: number | null; // solo si la orden está en pesos
  margen: number | null; // precio al dueño − facturado
};

export function resultadoDeObra(o: ObraParaResultados): ResultadoDeObra {
  const costo = planContraReal({
    presupuestos: o.presupuestos,
    facturas: o.facturas,
    partidas: [],
    inicioObra: null,
    hasta: new Date(0), // el plazo no se usa acá
  }).costo;
  // Una orden en UF no se mezcla con pesos: sin tipo de cambio no hay margen que calcular.
  const precioDueno = o.orden && o.orden.moneda === "CLP" ? centavos(o.orden.total) : null;
  // Sin presupuesto de maestro aprobado el costo no es cero, es desconocido: sin margen (saldría ~100 %)
  // y la obra no entra al margen total.
  const conCostoAprobado = hayCostoAprobado(o.presupuestos);
  return {
    servicioId: o.servicioId,
    clienteId: o.clienteId,
    clienteNombre: o.clienteNombre,
    propiedad: o.propiedad,
    estado: o.estado,
    costoAprobado: costo.planificado,
    facturado: costo.real,
    diferencia: costo.diferencia,
    precioDueno,
    margen: precioDueno === null || !conCostoAprobado ? null : centavos(precioDueno - costo.real),
  };
}

// El margen de todas las obras que tienen orden en pesos y costo aprobado, y qué porcentaje es de lo cobrado.
export function margenDeObras(obras: ResultadoDeObra[]): { margen: number | null; porcentaje: number | null } {
  const conMargen = obras.filter((o) => o.margen !== null && o.precioDueno !== null);
  if (conMargen.length === 0) return { margen: null, porcentaje: null };
  const margen = centavos(conMargen.reduce((s, o) => s + (o.margen ?? 0), 0));
  const cobrado = conMargen.reduce((s, o) => s + (o.precioDueno ?? 0), 0);
  return { margen, porcentaje: cobrado > 0 ? aUnDecimal((margen / cobrado) * 100) : null };
}
