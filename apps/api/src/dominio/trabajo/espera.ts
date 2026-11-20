// «Esperando a…»: a quién espera Proges para avanzar un servicio, y cuánto lleva esperando.
//
// Son funciones puras: reciben «hoy» como parámetro (hoyChile() de util/fechas.ts) para poder
// probarlas sin depender del reloj.
//
// Cómo se guarda un cambio: el servicio lleva `esperandoA` (a quién), `esperandoDetalle` (texto
// libre) y `esperandoDesde` (el día en que empezó la espera). Cada cambio de a quién se espera
// deja además un Evento de tipo ESPERA con `anterior` y `nuevo`. La columna `nuevo` de la base no
// admite vacío, así que «nos toca a nosotros» se guarda con la palabra NOS_TOCA (y se lee de
// vuelta como null). El detalle de la espera va en la columna `motivo` del Evento.
import type { EsperandoA } from "@proges/db/enums";
import type { Esperando } from "@proges/contrato";
import { ErrorApi } from "../../errores";
import { aFechaISO } from "../../util/al-contrato";
import { diasHasta } from "../../util/fechas";

export const NOS_TOCA = "NOS_TOCA";

const VALORES: readonly string[] = ["CONSERVADOR", "NOTARIA", "MUNICIPALIDAD", "MAESTRO", "DUENO", "BANCO", "OTRO"];

// Lo que se guardó en un Evento (anterior o nuevo) → a quién era. null = «nos toca».
export function esperaDeEvento(valor: string | null): EsperandoA | null {
  if (valor === null || valor === NOS_TOCA) return null;
  if (!VALORES.includes(valor)) {
    throw new Error(`Un Evento de espera guardó «${valor}», que no es un valor de EsperandoA ni NOS_TOCA.`);
  }
  return valor as EsperandoA;
}

export type EsperaGuardada = {
  esperandoA: EsperandoA | null;
  esperandoDetalle: string | null;
  esperandoDesde: Date | null;
};

// La espera de un servicio, como sale en la API: con los días que lleva. null si nos toca a nosotros.
export function esperandoDe(s: EsperaGuardada, hoy: Date): Esperando | null {
  if (s.esperandoA === null || s.esperandoDesde === null) return null;
  return {
    a: s.esperandoA,
    detalle: s.esperandoDetalle,
    desde: aFechaISO(s.esperandoDesde),
    dias: Math.max(0, diasHasta(hoy, s.esperandoDesde)),
  };
}

// Días calendario de espera, o null si no se espera a nadie.
export function diasEsperando(s: EsperaGuardada, hoy: Date): number | null {
  return esperandoDe(s, hoy)?.dias ?? null;
}

export type CambioPedido = { esperandoA?: EsperandoA | null; esperandoDetalle?: string | null };

export type PlanDeEspera = {
  // Lo que se escribe en el servicio (vacío si no hay nada que cambiar).
  datos: Partial<EsperaGuardada>;
  // El Evento que hay que anotar; null si no cambió a quién se espera.
  evento: { anterior: string; nuevo: string; motivo: string | null } | null;
};

// Decide qué hay que escribir cuando alguien cambia la espera de un servicio.
//
// - Cambiar a quién se espera (incluido volver a «nos toca») fija el día de inicio en `hoy` y
//   deja un Evento. Esperar a «OTRO» exige un detalle: sin él el equipo no sabe a quién.
// - Cambiar solo el detalle de la misma espera lo actualiza, sin tocar el día de inicio ni
//   dejar Evento: se sigue esperando a los mismos.
// - Pedir lo mismo que ya hay no cambia nada.
export function planearEspera(actual: EsperaGuardada, pedido: CambioPedido, hoy: Date): PlanDeEspera {
  const sinCambio: PlanDeEspera = { datos: {}, evento: null };
  if (pedido.esperandoA === undefined && pedido.esperandoDetalle === undefined) return sinCambio;

  const nuevaA = pedido.esperandoA === undefined ? actual.esperandoA : pedido.esperandoA;
  const detalle = pedido.esperandoDetalle === undefined ? actual.esperandoDetalle : pedido.esperandoDetalle;
  const detalleLimpio = detalle === null || detalle.trim() === "" ? null : detalle.trim();

  if (nuevaA === null) {
    // «Nos toca»: no hay a quién esperar, así que tampoco detalle.
    if (actual.esperandoA === null) return sinCambio;
    return {
      datos: { esperandoA: null, esperandoDetalle: null, esperandoDesde: null },
      evento: { anterior: actual.esperandoA, nuevo: NOS_TOCA, motivo: null },
    };
  }

  if (nuevaA === "OTRO" && detalleLimpio === null) {
    throw new ErrorApi(400, "Cuenta a quién se espera: con «Otro» el detalle es obligatorio.", {
      esperandoDetalle: "Escribe a quién se espera.",
    });
  }

  if (nuevaA === actual.esperandoA) {
    if (detalleLimpio === actual.esperandoDetalle) return sinCambio;
    return { datos: { esperandoDetalle: detalleLimpio }, evento: null };
  }

  return {
    datos: { esperandoA: nuevaA, esperandoDetalle: detalleLimpio, esperandoDesde: hoy },
    evento: { anterior: actual.esperandoA ?? NOS_TOCA, nuevo: nuevaA, motivo: detalleLimpio },
  };
}
