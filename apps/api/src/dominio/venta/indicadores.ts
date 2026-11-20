// Los cálculos del reporte de venta. Todo son funciones puras: reciben datos ya leídos y
// devuelven un resultado, sin tocar la base. Así se prueban sin nada más (test/venta.test.ts)
// y la ruta solo lee, llama y responde.
//
// Un número vive en un solo lugar: el reporte del dueño y el del equipo salen de estas mismas
// funciones, así los dos ven siempre la misma cifra.
import { diasHasta, hoyChile } from "../../util/fechas";
import { lunesDe } from "./fechas";

// ---------------------------------------------------------------------------
// Días publicada
// ---------------------------------------------------------------------------

// Días calendario desde que salió el primer anuncio hasta hoy (o hasta el día en que se cerró
// el servicio, si ya se cerró). Null si todavía no hay anuncios. Nunca negativo.
export function diasPublicada(desdes: readonly Date[], hoy: Date, cerradoEl?: Date | null): number | null {
  if (desdes.length === 0) return null;
  const primero = desdes.reduce((a, b) => (a.getTime() <= b.getTime() ? a : b));
  const hasta = cerradoEl ? hoyChile(cerradoEl) : hoy;
  return Math.max(0, diasHasta(hasta, primero));
}

// ---------------------------------------------------------------------------
// Cifras de los anuncios
// ---------------------------------------------------------------------------

export type CifraSemana = { semana: Date; vistas: number | null; consultas: number | null };

// Suma de lo anotado: una semana sin anotar (null) no suma ni cuenta como cero «anotado».
export function sumarCifras(cifras: readonly CifraSemana[]): { vistas: number; consultas: number } {
  let vistas = 0;
  let consultas = 0;
  for (const c of cifras) {
    vistas += c.vistas ?? 0;
    consultas += c.consultas ?? 0;
  }
  return { vistas, consultas };
}

export type SemanaAgregada = { semana: Date; vistas: number; consultas: number; visitas: number };

// Semana a semana, de la más antigua a la más nueva: vistas y consultas de TODOS los anuncios
// y las visitas a la propiedad (cada visita cae en el lunes de su semana). Una semana sin nada
// anotado no aparece.
export function seriePorSemana(
  cifras: readonly CifraSemana[],
  fechasDeVisitas: readonly Date[],
): SemanaAgregada[] {
  const porLunes = new Map<number, SemanaAgregada>();
  const de = (lunes: Date): SemanaAgregada => {
    const clave = lunes.getTime();
    let fila = porLunes.get(clave);
    if (!fila) {
      fila = { semana: lunes, vistas: 0, consultas: 0, visitas: 0 };
      porLunes.set(clave, fila);
    }
    return fila;
  };
  for (const c of cifras) {
    const fila = de(lunesDe(c.semana));
    fila.vistas += c.vistas ?? 0;
    fila.consultas += c.consultas ?? 0;
  }
  for (const f of fechasDeVisitas) de(lunesDe(f)).visitas += 1;
  return [...porLunes.values()].sort((a, b) => a.semana.getTime() - b.semana.getTime());
}

// ---------------------------------------------------------------------------
// Ofertas
// ---------------------------------------------------------------------------

export type OfertaParaComparar = {
  id: string;
  monto: { toString(): string }; // Decimal de la base
  moneda: "CLP" | "UF";
  estado: "RECIBIDA" | "ACEPTADA" | "RECHAZADA" | "CAIDA" | "CONTRAOFERTADA";
};

// La oferta vigente de mayor monto. «Vigente» = no rechazada ni caída. Solo se comparan montos
// de una misma moneda (no se mezclan CLP y UF: 3.000 UF no es menos que 100.000.000 pesos, y
// aquí no hay cómo convertirlas): la del precio publicado; si no hay precio, la de la oferta
// vigente más reciente (la primera de la lista, que llega de la más nueva a la más antigua).
export function mejorOferta<T extends OfertaParaComparar>(
  ofertas: readonly T[],
  monedaDelPrecio: "CLP" | "UF" | null,
): T | null {
  const vigentes = ofertas.filter((o) => o.estado !== "RECHAZADA" && o.estado !== "CAIDA");
  if (vigentes.length === 0) return null;
  const moneda = monedaDelPrecio ?? vigentes[0].moneda;
  let mejor: T | null = null;
  for (const o of vigentes) {
    if (o.moneda !== moneda) continue;
    if (mejor === null || Number(o.monto.toString()) > Number(mejor.monto.toString())) mejor = o;
  }
  return mejor;
}

// ¿Se espera respuesta del dueño? Sí si hay una oferta que se le mostró y no ha respondido
// (y sigue vigente), o si Proges marcó en el servicio que espera al dueño.
export function esperaRespuestaDueno(
  ofertas: readonly { estado: string; mostradaAlDuenoEl: Date | null; respuestaDueno: string | null }[],
  esperandoA: string | null,
): boolean {
  if (esperandoA === "DUENO") return true;
  return ofertas.some((o) => o.estado === "RECIBIDA" && o.mostradaAlDuenoEl !== null && o.respuestaDueno === null);
}
