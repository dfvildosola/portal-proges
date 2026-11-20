// Los nombres con que el dueño autónomo ve las listas de valores de su cartera (el contrato las
// trae en MAYÚSCULAS: «GASTO_COMUN», «TERMINA»). Un solo lugar, para que todas sus pantallas digan
// lo mismo y sin jerga.
import type {
  EstadoCobro,
  EstadoContrato,
  TipoCuenta,
  VencimientoGravedad,
  VencimientoTipo,
} from "@proges/contrato";
import type { TonoDeInsignia } from "@/componentes/ui/insignia";

export const ETIQUETA_CUENTA: Record<TipoCuenta, string> = {
  GASTO_COMUN: "Gasto común",
  LUZ: "Luz",
  AGUA: "Agua",
  GAS: "Gas",
  OTRO: "Otra cuenta",
};

export const ETIQUETA_ESTADO_CONTRATO: Record<EstadoContrato, { texto: string; tono: TonoDeInsignia }> = {
  POR_EMPEZAR: { texto: "Aún no empieza", tono: "neutro" },
  VIGENTE: { texto: "Vigente", tono: "ok" },
  TERMINA: { texto: "Con salida fijada", tono: "warn" },
  TERMINADO: { texto: "Terminado", tono: "neutro" },
  VENCIDO: { texto: "Venció", tono: "bad" },
};

export const ETIQUETA_ESTADO_COBRO: Record<EstadoCobro, { texto: string; tono: TonoDeInsignia }> = {
  PENDIENTE: { texto: "Por pagar", tono: "neutro" },
  PAGADO: { texto: "Pagado", tono: "ok" },
  ATRASADO: { texto: "Atrasado", tono: "bad" },
};

export const ETIQUETA_REAJUSTE = { NINGUNO: "No se reajusta", IPC: "Con el IPC", UF: "Con la UF" } as const;

/** Qué tan urgente es un vencimiento, con las palabras de la pantalla. */
export const ETIQUETA_GRAVEDAD: Record<VencimientoGravedad, { texto: string; tono: TonoDeInsignia }> = {
  alta: { texto: "Atrasado", tono: "bad" },
  media: { texto: "Esta semana", tono: "warn" },
  baja: { texto: "Más adelante", tono: "neutro" },
};

export type CategoriaDeVencimiento = "arriendos" | "contratos" | "cuentas" | "documentos" | "propiedades";

export const ETIQUETA_CATEGORIA: Record<CategoriaDeVencimiento, string> = {
  arriendos: "Arriendos",
  contratos: "Contratos",
  cuentas: "Cuentas e impuestos",
  documentos: "Documentos",
  propiedades: "Propiedades",
};

/** En qué cajón de la pantalla de Vencimientos cae cada clase de pendiente. */
export const CATEGORIA_DEL_TIPO: Record<VencimientoTipo, CategoriaDeVencimiento> = {
  ARRIENDO_ATRASADO: "arriendos",
  ARRIENDOS_SEMANA: "arriendos",
  COBROS_SIN_GENERAR: "arriendos",
  AVISO_NO_RENOVACION: "contratos",
  CONTRATO_POR_VENCER: "contratos",
  CONTRATO_VENCIDO: "contratos",
  REAJUSTE_PENDIENTE: "contratos",
  ARRENDADA_SIN_CONTRATO: "contratos",
  CONTRIBUCION: "cuentas",
  CUENTA: "cuentas",
  PAPEL: "documentos",
  PAPEL_FALTA: "documentos",
  DESOCUPADA_PROLONGADA: "propiedades",
};
