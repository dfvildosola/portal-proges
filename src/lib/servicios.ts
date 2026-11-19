// Reglas de los servicios en curso: nombres para mostrar e indicadores.
//
// Un número vive en un solo lugar: la ficha del equipo y el panel del cliente
// llaman a estas funciones, así los dos ven siempre la misma cifra.
//
// Todo acá son funciones puras: reciben datos ya cargados (fechas, textos,
// números) y devuelven un resultado, sin tocar la base de datos. Por eso se
// pueden probar a mano con `npx tsx scripts/probar-indicadores.ts`.
//
// Los indicadores reciben «hoy» como parámetro (`hoyChile()` de fechas.ts:
// medianoche UTC del día en Chile) y cuentan en días calendario, no en horas.

import type {
  OfertaEstado,
  PrecioOrigen,
  ServicioEstado,
  ServicioTipo,
} from "@/generated/prisma/enums";
import { diasHasta, hoyChile, sumarDias } from "@/lib/fechas";

// ---------------------------------------------------------------------------
// Nombres y familias del catálogo
// ---------------------------------------------------------------------------

// Familia del catálogo que se ofrece en todos los tipos: servicios
// complementarios (por ejemplo, la comisión de corretaje de arriendo, SC-600).
export const FAMILIA_COMPLEMENTARIOS = "SC";

// Por cada tipo: cómo se muestra y qué familias del catálogo ofrece al abrir
// un servicio. La familia SC se suma siempre (ver `familiasDelTipo`).
export const TIPOS_SERVICIO: Record<
  ServicioTipo,
  { nombre: string; familias: readonly string[] }
> = {
  EVALUACION: { nombre: "Evaluación", familias: ["ET"] },
  INSPECCION: { nombre: "Inspección y toma de posesión", familias: ["IRP"] },
  VENTA: { nombre: "Venta", familias: ["NV"] },
  ARRIENDO: { nombre: "Arriendo", familias: ["NV", "SC", "ADMP"] },
  OBRA: { nombre: "Obra", familias: ["RR"] },
  ADMINISTRACION: { nombre: "Administración", familias: ["ADMP"] },
};

// Las familias que ofrece un tipo, con SC incluida (sin repetirla).
export function familiasDelTipo(tipo: ServicioTipo): string[] {
  const propias = TIPOS_SERVICIO[tipo].familias;
  return propias.includes(FAMILIA_COMPLEMENTARIOS)
    ? [...propias]
    : [...propias, FAMILIA_COMPLEMENTARIOS];
}

// Solo la venta y el arriendo son «comerciales»: son los únicos que llevan
// precio, visitas y ofertas. Los demás tipos no los muestran.
export function esComercial(tipo: ServicioTipo): boolean {
  return tipo === "VENTA" || tipo === "ARRIENDO";
}

// Lo que se responde cuando alguien intenta cambiar algo de un proyecto que ya se cerró o canceló:
// un proyecto cerrado queda como registro, no se le agregan avances, facturas ni tareas.
export const PROYECTO_CERRADO = "Este proyecto ya está cerrado.";

// Lo que se responde cuando se intenta cerrar o cancelar un proyecto que viene de un pedido del
// cliente y todavía nadie revisó: primero se acepta o se rechaza el pedido.
export const PROYECTO_POR_REVISAR =
  "Este proyecto viene de un pedido: revísalo o recházalo en Trabajo del equipo.";

export const NOMBRES_ESTADO: Record<ServicioEstado, string> = {
  ABIERTO: "Abierto",
  TERMINADO: "Terminado",
  CANCELADO: "Cancelado",
};

export const NOMBRES_OFERTA_ESTADO: Record<OfertaEstado, string> = {
  RECIBIDA: "Recibida",
  ACEPTADA: "Aceptada",
  RECHAZADA: "Rechazada",
  CAIDA: "Caída",
};

export const NOMBRES_PRECIO_ORIGEN: Record<PrecioOrigen, string> = {
  PROPIETARIO: "Lo fijó el propietario",
  SUGERIDO_PROGES: "Sugerido por Proges",
};

// ---------------------------------------------------------------------------
// Fechas
// ---------------------------------------------------------------------------

// Un Evento guarda fecha Y hora (un instante). Para contar días hay que saber
// en qué día de Chile cayó: 23:30 en Chile ya es el día siguiente en UTC, y si
// leyéramos el día en UTC el evento se correría un día. `hoyChile` hace
// justo eso (instante → día de Chile a medianoche UTC) y da lo mismo en el Mac
// y en producción.
export function diaChile(instante: Date): Date {
  return hoyChile(instante);
}

// Las visitas son «solo fecha»: se guardan a medianoche UTC (convención del
// proyecto, ver fechas.ts). Pasarlas por `diaChile` las correría un día
// atrás, así que solo se les corta la hora por si viniera alguna.
function diaSoloFecha(fecha: Date): Date {
  return new Date(
    Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate()),
  );
}

// ---------------------------------------------------------------------------
// Tipos de entrada: objetos simples, sin depender de Prisma
// ---------------------------------------------------------------------------

// Un cambio de etapa. `publicada` lo arma quien llama desde la Etapa del
// evento (la marca «propiedad publicada»).
export type EventoDeEtapa = { fecha: Date; publicada: boolean };

// Una visita. Solo importa el día.
export type VisitaSimple = { fecha: Date };

// Un cambio de precio. `anterior` es null en el primer precio registrado.
export type EventoDePrecio = {
  fecha: Date;
  anterior: number | null;
  nuevo: number;
  moneda: string;
};

// ---------------------------------------------------------------------------
// Indicadores
// ---------------------------------------------------------------------------

// Días publicada: cuántos días ha pasado el servicio en etapas marcadas
// «propiedad publicada». Se suman todos los tramos, porque una propiedad puede
// despublicarse y volver a publicarse: el indicador no se reinicia.
//
// Un tramo va desde un evento hasta el siguiente. El último tramo llega hasta
// `cerradoEl` si el servicio ya cerró (después de cerrar ya no corre), o hasta
// hoy. Sin tramos publicados da 0.
export function diasPublicada(
  eventosDeEtapa: readonly EventoDeEtapa[],
  hoy: Date,
  cerradoEl?: Date | null,
): number {
  // Se ordena por el instante exacto (antes de pasar a día) para que dos
  // eventos del mismo día queden en el orden en que ocurrieron.
  const orden = [...eventosDeEtapa].sort(
    (a, b) => a.fecha.getTime() - b.fecha.getTime(),
  );
  const fin = cerradoEl ? diaChile(cerradoEl) : hoy;

  let total = 0;
  orden.forEach((evento, i) => {
    if (!evento.publicada) return;
    const inicio = diaChile(evento.fecha);
    const termino = i + 1 < orden.length ? diaChile(orden[i + 1].fecha) : fin;
    // Nunca negativo: si el cierre quedara antes del último evento, ese tramo vale 0.
    total += Math.max(0, diasHasta(termino, inicio));
  });
  return total;
}

// Cuántas visitas cayeron en los últimos `dias` días, contando hoy: con 7, de
// hoy-6 a hoy. Una visita futura no cuenta.
function visitasEnUltimosDias(
  visitas: readonly VisitaSimple[],
  hoy: Date,
  dias: number,
): number {
  const desde = sumarDias(hoy, -(dias - 1));
  return visitas.filter((v) => {
    const dia = diaSoloFecha(v.fecha);
    return dia >= desde && dia <= hoy;
  }).length;
}

// Visitas de la última semana (7 días, hoy incluido).
export function visitasUltimaSemana(
  visitas: readonly VisitaSimple[],
  hoy: Date,
): number {
  return visitasEnUltimosDias(visitas, hoy, 7);
}

// Promedio semanal de visitas de las últimas 4 semanas: visitas de los últimos
// 28 días ÷ 4, con un decimal. Suaviza las semanas sueltas buenas o malas.
export function visitasPorSemana(
  visitas: readonly VisitaSimple[],
  hoy: Date,
): number {
  const total = visitasEnUltimosDias(visitas, hoy, 28);
  return Math.round((total / 4) * 10) / 10;
}

// Días desde la última rebaja de precio, o null si nunca hubo una.
//
// Una rebaja es un evento cuyo valor nuevo es menor que el anterior y en la
// misma moneda. Si el precio pasó de UF a pesos, el número cambia por la
// moneda y no porque se haya rebajado: ese evento no cuenta. Por eso se compara
// también con la moneda del evento que lo precede. Un alza posterior no
// reinicia la cuenta: sigue contando desde la última rebaja.
export function diasDesdeUltimaRebaja(
  eventosDePrecio: readonly EventoDePrecio[],
  hoy: Date,
): number | null {
  const orden = [...eventosDePrecio].sort(
    (a, b) => a.fecha.getTime() - b.fecha.getTime(),
  );
  let ultimaRebaja: Date | null = null;
  orden.forEach((evento, i) => {
    if (evento.anterior === null || evento.nuevo >= evento.anterior) return;
    const mismaMoneda = i === 0 || orden[i - 1].moneda === evento.moneda;
    if (mismaMoneda) ultimaRebaja = diaChile(evento.fecha);
  });
  if (ultimaRebaja === null) return null;
  return Math.max(0, diasHasta(hoy, ultimaRebaja));
}

// Los cuatro indicadores juntos, para que las pantallas llamen una sola función.
export type IndicadoresComerciales = {
  diasPublicada: number;
  visitasUltimaSemana: number;
  visitasPorSemana: number;
  diasDesdeUltimaRebaja: number | null;
};

export function indicadoresComerciales(datos: {
  eventosDeEtapa: readonly EventoDeEtapa[];
  eventosDePrecio: readonly EventoDePrecio[];
  visitas: readonly VisitaSimple[];
  hoy: Date;
  cerradoEl?: Date | null;
}): IndicadoresComerciales {
  const { eventosDeEtapa, eventosDePrecio, visitas, hoy, cerradoEl } = datos;
  return {
    diasPublicada: diasPublicada(eventosDeEtapa, hoy, cerradoEl),
    visitasUltimaSemana: visitasUltimaSemana(visitas, hoy),
    visitasPorSemana: visitasPorSemana(visitas, hoy),
    diasDesdeUltimaRebaja: diasDesdeUltimaRebaja(eventosDePrecio, hoy),
  };
}
