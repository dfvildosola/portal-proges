// Los textos con que Proges le habla al dueño. Son distintos a los del equipo a propósito: el dueño
// no conoce la jerga («esperando a», «por revisar»), así que aquí se dice con palabras de todos los días.
import type { EsperandoA, ServicioTipo, SolicitudEstado } from "@proges/contrato";
import type { TonoDeInsignia } from "@/componentes/ui/insignia";

/** «Ahora esperamos ___»: la frase completa, con su artículo. */
export const ESPERAMOS: Record<EsperandoA, string> = {
  CONSERVADOR: "al Conservador de Bienes Raíces",
  NOTARIA: "a la notaría",
  MUNICIPALIDAD: "a la municipalidad",
  MAESTRO: "al maestro",
  DUENO: "tu respuesta",
  BANCO: "al banco",
  OTRO: "a un tercero",
};

/** Lo que el dueño elige al pedir un servicio: el nombre que entiende y una línea que lo explica. */
export const SERVICIOS_QUE_SE_PUEDEN_PEDIR: { tipo: ServicioTipo; nombre: string; ayuda: string }[] = [
  { tipo: "OBRA", nombre: "Una reparación u obra", ayuda: "Arreglos, remodelaciones o mantenciones." },
  { tipo: "VENTA", nombre: "Vender la propiedad", ayuda: "Publicamos, mostramos y te contamos cómo va." },
  { tipo: "ARRIENDO", nombre: "Arrendar la propiedad", ayuda: "Buscamos arrendatario." },
  { tipo: "ADMINISTRACION", nombre: "Que Proges la administre", ayuda: "Cobros, contratos y el día a día." },
  { tipo: "INSPECCION", nombre: "Una visita para ver cómo está", ayuda: "Vamos, la revisamos y te mandamos fotos." },
  { tipo: "EVALUACION", nombre: "Saber cuánto vale y qué conviene", ayuda: "Un informe con el valor y una recomendación." },
];

/** El nombre de un tipo de servicio, como lo lee el dueño. */
export function nombreDelServicio(tipo: ServicioTipo): string {
  return SERVICIOS_QUE_SE_PUEDEN_PEDIR.find((s) => s.tipo === tipo)?.nombre ?? tipo;
}

export const ESTADO_DEL_PEDIDO: Record<SolicitudEstado, { texto: string; tono: TonoDeInsignia }> = {
  NUEVA: { texto: "Proges lo está revisando", tono: "warn" },
  ACEPTADA: { texto: "Aceptado: ya estamos en esto", tono: "ok" },
  RECHAZADA: { texto: "No lo podemos tomar", tono: "bad" },
};

/** Un cambio de «a quién se espera» contado como novedad: «Ahora esperamos a la notaría». */
export function fraseDeEspera(a: EsperandoA | null, detalle: string | null): string {
  if (a === null) return "Ahora lo estamos trabajando nosotros.";
  if (a === "DUENO") return "Estamos esperando tu respuesta.";
  return `Ahora esperamos ${a === "OTRO" && detalle ? detalle : ESPERAMOS[a]}.`;
}
