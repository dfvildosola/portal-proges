// La ficha entrega «a quién se espera» con el detalle opcional y el chip (ChipEsperando) lo pide
// siempre presente: aquí se completa con null para que encajen.
import type { FichaEsperando } from "@proges/contrato";

export function esperandoParaChip(esperando: FichaEsperando | null) {
  return esperando ? { ...esperando, detalle: esperando.detalle ?? null } : null;
}
