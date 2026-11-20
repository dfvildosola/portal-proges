// Los nombres con que la ficha escribe en pantalla las listas de valores de las propiedades
// (tipo, estado, papel de un documento…) y el color de cada estado. Un solo lugar para que la lista
// de propiedades y la ficha digan lo mismo.
import type {
  DocumentoEstado,
  DocumentoPapel,
  DocumentoTipo,
  FichaServicioEstado,
  HistorialTipo,
  PropiedadEstado,
  PropiedadObjetivo,
  PropiedadTipo,
  PropiedadValorFuente,
  VencimientoGravedad,
} from "@proges/contrato";
import type { TonoDeInsignia } from "@/componentes/ui/insignia";

export const ETIQUETA_TIPO_PROPIEDAD: Record<PropiedadTipo, string> = {
  DEPARTAMENTO: "Departamento",
  CASA: "Casa",
  OFICINA: "Oficina",
  LOCAL: "Local",
  BODEGA: "Bodega",
  ESTACIONAMIENTO: "Estacionamiento",
  TERRENO: "Terreno",
  PARCELA: "Parcela",
  AGRICOLA: "Agrícola",
};

export const ETIQUETA_ESTADO_PROPIEDAD: Record<PropiedadEstado, string> = {
  ARRENDADA: "Arrendada",
  DISPONIBLE: "Disponible",
  EN_VENTA: "En venta",
  USO_PROPIO: "Uso propio",
  DESOCUPADA: "Desocupada",
};

export const TONO_ESTADO_PROPIEDAD: Record<PropiedadEstado, TonoDeInsignia> = {
  ARRENDADA: "ok",
  DISPONIBLE: "ink",
  EN_VENTA: "ink",
  USO_PROPIO: "neutro",
  DESOCUPADA: "warn",
};

export const ETIQUETA_OBJETIVO: Record<PropiedadObjetivo, string> = {
  INVERSION: "Inversión",
  USO_PROPIO: "Uso propio",
  VENTA: "Venta",
};

export const ETIQUETA_FUENTE_VALOR: Record<PropiedadValorFuente, string> = {
  TASACION: "Tasación",
  CORREDOR: "Corredor",
  ESTIMACION_PROPIA: "Estimación propia",
};

export const ETIQUETA_ESTADO_SERVICIO_FICHA: Record<FichaServicioEstado, string> = {
  ABIERTO: "En curso",
  TERMINADO: "Terminada",
  CANCELADO: "Cancelada",
};

export const TONO_ESTADO_SERVICIO_FICHA: Record<FichaServicioEstado, TonoDeInsignia> = {
  ABIERTO: "warn",
  TERMINADO: "ok",
  CANCELADO: "neutro",
};

export const ETIQUETA_PAPEL: Record<DocumentoPapel, string> = {
  ESCRITURA: "Escritura de compraventa",
  DOMINIO_VIGENTE: "Inscripción de dominio con vigencia",
  HIPOTECAS_GRAVAMENES: "Certificado de hipotecas y gravámenes",
  CERTIFICADO_AVALUO: "Certificado de avalúo fiscal",
  PLANO: "Plano",
  CIP: "Certificado de informaciones previas",
  RECEPCION_FINAL: "Recepción final",
  POLIZA_SEGURO: "Póliza de seguro",
  PERMISO_EDIFICACION: "Permiso de edificación",
  CERTIFICADO_NUMERO: "Certificado de número",
  REGLAMENTO_COPROPIEDAD: "Reglamento de copropiedad",
  SUBDIVISION_SAG: "Subdivisión (SAG)",
  DERECHOS_AGUA: "Derechos de agua",
  CONTRATO_ARRIENDO: "Contrato de arriendo",
};

export const ETIQUETA_TIPO_DOCUMENTO: Record<DocumentoTipo, string> = {
  ESCRITURA_TITULO: "Escritura y títulos",
  CONTRATO: "Contrato",
  AVALUO_TASACION: "Avalúo y tasación",
  LEGAL_JUDICIAL: "Legal y judicial",
  MUNICIPAL: "Municipal",
  SEGURO: "Seguro",
  MANTENCION: "Mantención",
  CONTRIBUCION: "Contribuciones",
  OTRO: "Otro",
};

export const ETIQUETA_ESTADO_DOCUMENTO: Record<DocumentoEstado, string> = {
  vigente: "Vigente",
  vence: "Vence pronto",
  vencido: "Vencido",
  falta: "Falta",
};

export const TONO_ESTADO_DOCUMENTO: Record<DocumentoEstado, TonoDeInsignia> = {
  vigente: "ok",
  vence: "warn",
  vencido: "bad",
  falta: "bad",
};

export const TONO_GRAVEDAD: Record<VencimientoGravedad, TonoDeInsignia> = {
  alta: "bad",
  media: "warn",
  baja: "neutro",
};

// El color del punto de cada hecho del historial.
export const TONO_HECHO: Record<HistorialTipo, TonoDeInsignia> = {
  servicio: "ink",
  nota: "neutro",
  precio: "warn",
  espera: "warn",
  visita: "ok",
  oferta: "warn",
  documento: "ok",
  presupuesto: "ink",
  recepcion: "ok",
};

export const ETIQUETA_HECHO: Record<HistorialTipo, string> = {
  servicio: "Servicio",
  nota: "Nota",
  precio: "Precio",
  espera: "Espera",
  visita: "Visita",
  oferta: "Oferta",
  documento: "Documento",
  presupuesto: "Presupuesto",
  recepcion: "Recepción",
};
