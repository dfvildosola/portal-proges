// Los nombres con que se escriben en pantalla las listas de valores de la API (las que en el
// contrato son MAYÚSCULAS: «NOTARIA», «DUENO»). Un solo lugar, para que todas las pantallas digan
// lo mismo.
import type { Esperando, EsperandoA, ServicioEstado, ServicioTipo } from "@proges/contrato";

export const ETIQUETA_ESPERANDO_A: Record<EsperandoA, string> = {
  CONSERVADOR: "Conservador",
  NOTARIA: "Notaría",
  MUNICIPALIDAD: "Municipalidad",
  MAESTRO: "Maestro",
  DUENO: "Dueño",
  BANCO: "Banco",
  OTRO: "Otro",
};

// A quién se espera, en minúscula para ir dentro de una frase («Esperando a notaría»). «Otro» no
// dice nada solo: se usa el detalle que escribió el equipo, tal cual.
export function aQuienSeEspera(esperando: Esperando): string {
  return esperando.a === "OTRO" && esperando.detalle ? esperando.detalle : ETIQUETA_ESPERANDO_A[esperando.a].toLowerCase();
}

export const ETIQUETA_TIPO_SERVICIO: Record<ServicioTipo, string> = {
  EVALUACION: "Evaluación",
  INSPECCION: "Inspección",
  VENTA: "Venta",
  ARRIENDO: "Arriendo",
  OBRA: "Obra",
  ADMINISTRACION: "Administración",
};

export const ETIQUETA_ESTADO_SERVICIO: Record<ServicioEstado, string> = {
  ABIERTO: "En curso",
  TERMINADO: "Terminado",
  CANCELADO: "Cancelado",
};

/** Pasados estos días esperando a alguien, el servicio se considera trabado (se pinta de rojo). */
export const DIAS_PARA_TRABADO = 10;
