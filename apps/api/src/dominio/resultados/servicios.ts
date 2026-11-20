// Servicios que entran y que se cierran por semana, y cuánto se demora cada tipo, separando el
// tiempo trabajando del tiempo esperando a otros (conservador, notaría, maestro, dueño…).
//
// Piensa en un trámite en una oficina: el reloj corre todo el tiempo, pero parte del reloj
// el papel está en tu escritorio (trabajando) y parte está en otra oficina (esperando a otros).
// Aquí se separan las dos partes con los eventos ESPERA: el tiempo entre fijar una espera y
// quitarla.
//
// Funciones puras: reciben los datos ya leídos, no tocan la base.
import type { EsperandoA, ServicioTipo } from "@proges/db/enums";
import { aUnDecimal, diaChile, estaEnElRango, lunesDe, MS_POR_DIA, semanasDelRango } from "./semanas";

const ESPERANDO_A: readonly string[] = [
  "CONSERVADOR",
  "NOTARIA",
  "MUNICIPALIDAD",
  "MAESTRO",
  "DUENO",
  "BANCO",
  "OTRO",
] satisfies EsperandoA[];

// Un cambio de «esperando a». `nuevo` es a quién se espera desde ese momento; cualquier otra
// cosa (vacío) significa que ya no se espera a nadie.
export type EventoEspera = { fecha: Date; nuevo: string };

export type ServicioCerrado = {
  tipo: ServicioTipo;
  abiertoEl: Date;
  cerradoEl: Date;
  eventos: EventoEspera[];
};

// Cuántos milisegundos estuvo el servicio esperando a otros entre que se abrió y se cerró.
// Una espera que sigue puesta al cerrar cuenta hasta el cierre. Pasar de esperar a uno a
// esperar a otro es un solo tramo seguido.
export function msEsperando(eventos: EventoEspera[], abiertoEl: Date, cerradoEl: Date): number {
  const ordenados = [...eventos].sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
  const ini = abiertoEl.getTime();
  const fin = cerradoEl.getTime();
  let total = 0;
  let desde: number | null = null; // desde cuándo se espera, si se está esperando

  const cerrarTramo = (hasta: number) => {
    if (desde === null) return;
    const tramo = Math.min(hasta, fin) - Math.max(desde, ini);
    if (tramo > 0) total += tramo;
    desde = null;
  };

  for (const evento of ordenados) {
    const cuando = evento.fecha.getTime();
    if (desde !== null && ESPERANDO_A.includes(evento.nuevo)) continue; // cambió de a quién espera: sigue el tramo
    cerrarTramo(cuando);
    if (ESPERANDO_A.includes(evento.nuevo)) desde = cuando;
  }
  cerrarTramo(fin);
  return total;
}

export type TiempoDeServicio = { tipo: ServicioTipo; dias: number; esperando: number; trabajando: number };

// Días totales, esperando y trabajando de un servicio cerrado (sin redondear).
export function tiempoDeServicio(s: ServicioCerrado): TiempoDeServicio {
  const totalMs = Math.max(s.cerradoEl.getTime() - s.abiertoEl.getTime(), 0);
  const esperandoMs = Math.min(msEsperando(s.eventos, s.abiertoEl, s.cerradoEl), totalMs);
  return {
    tipo: s.tipo,
    dias: totalMs / MS_POR_DIA,
    esperando: esperandoMs / MS_POR_DIA,
    trabajando: (totalMs - esperandoMs) / MS_POR_DIA,
  };
}

const ORDEN_TIPOS: ServicioTipo[] = ["EVALUACION", "INSPECCION", "VENTA", "ARRIENDO", "OBRA", "ADMINISTRACION"];

export type DiasPorTipo = { tipo: ServicioTipo; servicios: number; diasTrabajando: number; diasEsperando: number };

// Días promedio por tipo de servicio (solo los tipos que tuvieron servicios cerrados).
export function diasPorTipo(cerrados: ServicioCerrado[]): DiasPorTipo[] {
  const tiempos = cerrados.map(tiempoDeServicio);
  return ORDEN_TIPOS.flatMap((tipo) => {
    const delTipo = tiempos.filter((t) => t.tipo === tipo);
    if (delTipo.length === 0) return [];
    const promedio = (campo: "trabajando" | "esperando") =>
      aUnDecimal(delTipo.reduce((suma, t) => suma + t[campo], 0) / delTipo.length);
    return [{ tipo, servicios: delTipo.length, diasTrabajando: promedio("trabajando"), diasEsperando: promedio("esperando") }];
  });
}

export type CifrasDeServicios = {
  serviciosCerrados: number;
  duracionPromedioDias: number | null;
  porcentajeEsperando: number | null;
};

// Las cifras de arriba: cuántos se cerraron, cuánto se demoran en promedio y qué parte de ese
// tiempo estuvieron esperando a otros.
export function cifrasDeServicios(cerrados: ServicioCerrado[]): CifrasDeServicios {
  const tiempos = cerrados.map(tiempoDeServicio);
  const totalDias = tiempos.reduce((suma, t) => suma + t.dias, 0);
  const totalEsperando = tiempos.reduce((suma, t) => suma + t.esperando, 0);
  return {
    serviciosCerrados: cerrados.length,
    duracionPromedioDias: tiempos.length > 0 ? aUnDecimal(totalDias / tiempos.length) : null,
    porcentajeEsperando: totalDias > 0 ? aUnDecimal((totalEsperando / totalDias) * 100) : null,
  };
}

// ¿Este servicio cuenta como uno que «entró»? Un servicio cancelado no: ahí caen los pedidos que
// el equipo rechazó (rechazarRevision los deja CANCELADO) y los que se cancelaron a mano.
export function entraAlConteo(servicio: { estado: string }): boolean {
  return servicio.estado !== "CANCELADO";
}

export type Semana = { semana: Date; entran: number; cierran: number };

// Por cada semana del período (de lunes a domingo): cuántos servicios se abrieron y cuántos se
// terminaron. Las semanas sin movimiento salen con ceros, para que el gráfico no tenga huecos.
// Solo cuentan los momentos dentro de [desde, hasta].
export function serviciosPorSemana(abiertosEl: Date[], cerradosEl: Date[], desde: Date, hasta: Date): Semana[] {
  const semanas = new Map(semanasDelRango(desde, hasta).map((lunes) => [lunes.getTime(), { entran: 0, cierran: 0 }]));
  const contar = (momentos: Date[], campo: "entran" | "cierran") => {
    for (const momento of momentos) {
      const dia = diaChile(momento);
      if (!estaEnElRango(dia, desde, hasta)) continue;
      const fila = semanas.get(lunesDe(dia).getTime());
      if (fila) fila[campo] += 1;
    }
  };
  contar(abiertosEl, "entran");
  contar(cerradosEl, "cierran");
  return [...semanas.entries()].map(([lunes, cuenta]) => ({ semana: new Date(lunes), ...cuenta }));
}
