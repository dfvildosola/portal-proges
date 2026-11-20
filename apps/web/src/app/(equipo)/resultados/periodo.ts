// Pequeñas ayudas de la pantalla Resultados: restar días a una fecha «AAAA-MM-DD» y escribir
// números con coma decimal. Las fechas se restan en UTC a propósito: así el resultado es el mismo
// en el Mac (hora de Chile) y en producción (UTC).
import { hoyChile } from "@/lib/formato";

/** «2026-11-19» menos `dias` días. */
export function restarDias(fecha: string, dias: number): string {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia - dias)).toISOString().slice(0, 10);
}

/** Los períodos rápidos que se ofrecen: hasta hoy, desde hace tantos días. */
export const PERIODOS_RAPIDOS = [
  { etiqueta: "30 días", dias: 30 },
  { etiqueta: "90 días", dias: 90 },
  { etiqueta: "6 meses", dias: 182 },
  { etiqueta: "1 año", dias: 365 },
] as const;

export function periodoHastaHoy(dias: number): { desde: string; hasta: string } {
  const hasta = hoyChile();
  return { desde: restarDias(hasta, dias - 1), hasta };
}

/** «22,5» (una decimal como máximo, coma decimal). */
export function decimal(valor: number): string {
  return valor.toLocaleString("es-CL", { maximumFractionDigits: 1 });
}
