// Los textos con que se escriben en pantalla los estados del corretaje (anuncios, ofertas, precio).
// Viven aquí y no en lib/etiquetas.ts porque solo los usa el panel de venta.
import type { VentaAnuncioEstado, VentaOfertaEstado, VentaPrecioOrigen, VentaRespuestaOferta } from "@proges/contrato";
import type { TonoDeInsignia } from "@/componentes/ui/insignia";

export const ETIQUETA_ANUNCIO: Record<VentaAnuncioEstado, { texto: string; tono: TonoDeInsignia }> = {
  ACTIVO: { texto: "Activo", tono: "ok" },
  PAUSADO: { texto: "Pausado", tono: "warn" },
  BAJADO: { texto: "Bajado", tono: "neutro" },
};

export const ETIQUETA_ESTADO_OFERTA: Record<VentaOfertaEstado, { texto: string; tono: TonoDeInsignia }> = {
  RECIBIDA: { texto: "Recibida", tono: "ink" },
  ACEPTADA: { texto: "Aceptada", tono: "ok" },
  RECHAZADA: { texto: "Rechazada", tono: "bad" },
  CAIDA: { texto: "Se cayó", tono: "neutro" },
  CONTRAOFERTADA: { texto: "Contraofertada", tono: "warn" },
};

export const ETIQUETA_RESPUESTA: Record<VentaRespuestaOferta, string> = {
  ACEPTA: "aceptó",
  CONTRAOFERTA: "contraofertó",
  RECHAZA: "rechazó",
};

export const ETIQUETA_ORIGEN_PRECIO: Record<VentaPrecioOrigen, string> = {
  PROPIETARIO: "lo fijó el propietario",
  SUGERIDO_PROGES: "lo sugirió Proges",
};
