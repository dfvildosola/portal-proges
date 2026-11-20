// Días y semanas de Resultados. Todo en días calendario de Chile: un servicio abierto a las
// 23:30 del domingo en Santiago cuenta en esa semana aunque en UTC ya sea lunes.
import { hoyChile, sumarDias } from "../../util/fechas";

export const MS_POR_DIA = 86_400_000;

// El día calendario de Chile de un momento exacto, como medianoche UTC (igual que las fechas
// «solo fecha» de la base, para poder compararlos).
export function diaChile(instante: Date): Date {
  return hoyChile(instante);
}

// El lunes de la semana de una fecha «solo fecha».
export function lunesDe(fecha: Date): Date {
  const diasDesdeLunes = (fecha.getUTCDay() + 6) % 7;
  return sumarDias(fecha, -diasDesdeLunes);
}

// Los lunes de todas las semanas que toca el período, de la primera a la última.
export function semanasDelRango(desde: Date, hasta: Date): Date[] {
  const semanas: Date[] = [];
  for (let lunes = lunesDe(desde); lunes.getTime() <= hasta.getTime(); lunes = sumarDias(lunes, 7)) {
    semanas.push(lunes);
  }
  return semanas;
}

export function estaEnElRango(dia: Date, desde: Date, hasta: Date): boolean {
  return dia.getTime() >= desde.getTime() && dia.getTime() <= hasta.getTime();
}

// Un decimal, para que «12,3 días» no salga como 12.300000000000001.
export function aUnDecimal(n: number): number {
  return Math.round(n * 10) / 10;
}
