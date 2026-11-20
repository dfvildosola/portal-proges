// Fechas del corretaje: leer una fecha «solo fecha» y trabajar con semanas.
//
// Una semana se identifica por su lunes (como las cifras de Nexxos: «semana del lunes 16»).
// Todo en UTC y a medianoche, igual que el resto de las fechas «solo fecha» (ver util/fechas.ts):
// el Mac está en hora de Chile y producción en UTC, y con métodos locales el día se correría.
import { sumarDias } from "../../util/fechas";

// «2026-11-16» → medianoche UTC de ese día. La forma ya la revisó el contrato (FechaISO).
export function deFechaISO(texto: string): Date {
  return new Date(`${texto}T00:00:00.000Z`);
}

// ¿Esa fecha es lunes? (getUTCDay: 0 = domingo, 1 = lunes).
export function esLunes(fecha: Date): boolean {
  return fecha.getUTCDay() === 1;
}

// El lunes de la semana de `fecha` (si ya es lunes, ella misma).
export function lunesDe(fecha: Date): Date {
  const atras = (fecha.getUTCDay() + 6) % 7; // lunes 0, martes 1, … domingo 6
  return sumarDias(new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate())), -atras);
}
