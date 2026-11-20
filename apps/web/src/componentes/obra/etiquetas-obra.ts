// Los nombres en pantalla de las listas de la obra (la API entrega «CONFORME»; la persona lee
// «Conforme») y el color que lleva cada uno. Un solo lugar: así «Observada» se llama igual en
// la partida, en el cierre y en el resumen.
import type { ObraRecepcion, PresupuestoEstado, PresupuestoTipo } from "@proges/contrato";
import type { TonoDeInsignia } from "@/componentes/ui/insignia";

/** Los avances que se pueden marcar: de a cuartos, para que nadie discuta si fue 63 % o 65 %. */
export const AVANCES = [0, 25, 50, 75, 100] as const;

export const ETIQUETA_RECEPCION: Record<ObraRecepcion, string> = {
  PENDIENTE: "Por recibir",
  CONFORME: "Conforme",
  OBSERVADA: "Observada",
};

export const TONO_RECEPCION: Record<ObraRecepcion, TonoDeInsignia> = {
  PENDIENTE: "neutro",
  CONFORME: "ok",
  OBSERVADA: "warn",
};

// El dueño lee lo mismo con otras palabras: no «recibe» él, le cuentan cómo va.
export const ETIQUETA_RECEPCION_DUENO: Record<ObraRecepcion, string> = {
  PENDIENTE: "Por recibir",
  CONFORME: "Recibida",
  OBSERVADA: "Con observaciones",
};

export const ETIQUETA_PRESUPUESTO_ESTADO: Record<PresupuestoEstado, string> = {
  RECIBIDO: "Por aprobar",
  APROBADO: "Aprobado",
  RECHAZADO: "Rechazado",
};

export const TONO_PRESUPUESTO_ESTADO: Record<PresupuestoEstado, TonoDeInsignia> = {
  RECIBIDO: "warn",
  APROBADO: "ok",
  RECHAZADO: "bad",
};

export const ETIQUETA_PRESUPUESTO_TIPO: Record<PresupuestoTipo, string> = {
  ORIGINAL: "Original",
  ADICIONAL: "Adicional",
};

export const ETIQUETA_ESTADO_FACTURA = {
  borrador: "Borrador en Odoo",
  publicada: "Publicada",
  anulada: "Anulada",
} as const;

/** El signo de un monto sin pasarlo a número (la plata viaja como texto): -1, 0 o 1. */
export function signoDeMonto(valor: string): -1 | 0 | 1 {
  if (/^-?0+(\.0+)?$/.test(valor)) return 0;
  return valor.startsWith("-") ? -1 : 1;
}
