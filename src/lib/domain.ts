// Etiquetas en español y opciones para los enums del dominio.
// Centralizado para que selects y vistas muestren texto consistente.
import {
  PropertyType,
  PropertyStatus,
  PropertyGoal,
  Currency,
  OwnerType,
  PropertyUnitType,
  ContractStatus,
  AdjustmentType,
  ChargeStatus,
  MovementType,
  MovementCategory,
  TaxStatus,
  BillType,
  BillStatus,
  AlertType,
  AlertSeverity,
  DocumentType,
  Papel,
  ValorFuente,
} from "@/generated/prisma/enums";

export const propertyTypeLabels: Record<PropertyType, string> = {
  DEPARTAMENTO: "Departamento",
  CASA: "Casa",
  OFICINA: "Oficina",
  LOCAL: "Local comercial",
  BODEGA: "Bodega",
  ESTACIONAMIENTO: "Estacionamiento",
  TERRENO: "Terreno",
  PARCELA: "Parcela",
  AGRICOLA: "Agrícola",
};

export const propertyStatusLabels: Record<PropertyStatus, string> = {
  ARRENDADA: "Arrendada",
  DISPONIBLE: "Disponible",
  EN_VENTA: "En venta",
  USO_PROPIO: "Uso propio",
  DESOCUPADA: "Desocupada",
};

export const propertyGoalLabels: Record<PropertyGoal, string> = {
  INVERSION: "Inversión",
  USO_PROPIO: "Uso propio",
  VENTA: "Venta",
};

export const currencyLabels: Record<Currency, string> = {
  CLP: "Pesos (CLP)",
  UF: "UF",
};

export const valorFuenteLabels: Record<ValorFuente, string> = {
  TASACION: "Tasación",
  CORREDOR: "Corredor",
  ESTIMACION_PROPIA: "Estimación propia",
};

export const ownerTypeLabels: Record<OwnerType, string> = {
  PERSONA: "Persona",
  SOCIEDAD: "Sociedad",
};

export const propertyUnitTypeLabels: Record<PropertyUnitType, string> = {
  ESTACIONAMIENTO: "Estacionamiento",
  BODEGA: "Bodega",
};

export const contractStatusLabels: Record<ContractStatus, string> = {
  VIGENTE: "Vigente",
  POR_VENCER: "Por vencer",
  VENCIDO: "Vencido",
  RENOVADO: "Renovado",
  TERMINADO: "Terminado",
};

export const adjustmentTypeLabels: Record<AdjustmentType, string> = {
  NINGUNO: "Sin reajuste",
  IPC: "IPC",
  UF: "UF",
};

export const chargeStatusLabels: Record<ChargeStatus, string> = {
  PENDIENTE: "Pendiente",
  PAGADO: "Pagado",
  ATRASADO: "Atrasado",
};

export const movementTypeLabels: Record<MovementType, string> = {
  INGRESO: "Ingreso",
  GASTO: "Gasto",
};

export const movementCategoryLabels: Record<MovementCategory, string> = {
  ARRIENDO: "Arriendo",
  REPARACION: "Reparación",
  GASTO_COMUN: "Gasto común",
  SEGURO: "Seguro",
  IMPUESTO: "Impuesto",
  OTRO: "Otro",
};

export const taxStatusLabels: Record<TaxStatus, string> = {
  PENDIENTE: "Pendiente",
  PAGADA: "Pagada",
};

export const billTypeLabels: Record<BillType, string> = {
  GASTO_COMUN: "Gasto común",
  LUZ: "Luz",
  AGUA: "Agua",
  GAS: "Gas",
  OTRO: "Otro",
};

export const billStatusLabels: Record<BillStatus, string> = {
  PENDIENTE: "Pendiente",
  PAGADA: "Pagada",
};

export function chargeStatusVariant(
  estado: ChargeStatus,
): "success" | "warning" | "destructive" {
  switch (estado) {
    case "PAGADO":
      return "success";
    case "ATRASADO":
      return "destructive";
    default:
      return "warning";
  }
}

export function taxStatusVariant(
  estado: TaxStatus,
): "success" | "warning" {
  return estado === "PAGADA" ? "success" : "warning";
}

export function billStatusVariant(
  estado: BillStatus,
): "success" | "warning" {
  return estado === "PAGADA" ? "success" : "warning";
}

export function movementTypeVariant(
  tipo: MovementType,
): "success" | "secondary" {
  return tipo === "INGRESO" ? "success" : "secondary";
}

export const alertTypeLabels: Record<AlertType, string> = {
  ARRENDADA_SIN_CONTRATO: "Arrendada sin contrato",
  CONTRATO_POR_VENCER: "Contrato por vencer",
  ARRIENDO_ATRASADO: "Arriendo atrasado",
  CONTRIBUCION_IMPAGA: "Contribución impaga",
  CONTRIBUCION_POR_VENCER: "Contribución por vencer",
  DESOCUPADA_PROLONGADA: "Desocupada prolongada",
  CUENTA_VENCIDA: "Cuenta vencida",
  CUENTA_POR_VENCER: "Cuenta por vencer",
  COBROS_SIN_GENERAR: "Cobros sin generar",
};

export type AlertCategory = "cobranza" | "contribuciones" | "propiedad" | "cuentas";

export const alertTypeCategory: Record<AlertType, AlertCategory> = {
  ARRENDADA_SIN_CONTRATO: "cobranza",
  CONTRATO_POR_VENCER: "cobranza",
  ARRIENDO_ATRASADO: "cobranza",
  CONTRIBUCION_IMPAGA: "contribuciones",
  CONTRIBUCION_POR_VENCER: "contribuciones",
  DESOCUPADA_PROLONGADA: "propiedad",
  CUENTA_VENCIDA: "cuentas",
  CUENTA_POR_VENCER: "cuentas",
  COBROS_SIN_GENERAR: "cobranza",
};

export const alertCategoryLabels: Record<AlertCategory, string> = {
  cobranza: "Cobranza",
  contribuciones: "Contribuciones",
  propiedad: "Propiedad",
  cuentas: "Cuentas",
};

export const alertSeverityLabels: Record<AlertSeverity, string> = {
  INFO: "Info",
  MEDIA: "Media",
  ALTA: "Alta",
};

export function alertSeverityVariant(
  severidad: AlertSeverity,
): "info" | "warning" | "destructive" {
  switch (severidad) {
    case "ALTA":
      return "destructive";
    case "MEDIA":
      return "warning";
    default:
      return "info";
  }
}

export const documentTypeLabels: Record<DocumentType, string> = {
  ESCRITURA_TITULO: "Escrituras y títulos",
  CONTRATO: "Contratos",
  AVALUO_TASACION: "Avalúos y tasaciones",
  LEGAL_JUDICIAL: "Legales y judiciales",
  MUNICIPAL: "Municipalidad",
  SEGURO: "Seguros",
  MANTENCION: "Mantención",
  CONTRIBUCION: "Contribuciones",
  OTRO: "Otros",
};

// El papel concreto que es un documento (el cajón donde se archiva es documentTypeLabels).
export const papelLabels: Record<Papel, string> = {
  ESCRITURA: "Escritura",
  DOMINIO_VIGENTE: "Dominio vigente (CBR)",
  HIPOTECAS_GRAVAMENES: "Hipotecas y gravámenes (CBR)",
  CERTIFICADO_AVALUO: "Certificado de avalúo (SII)",
  PLANO: "Plano",
  CIP: "Certificado de informaciones previas (DOM)",
  RECEPCION_FINAL: "Recepción final (DOM)",
  POLIZA_SEGURO: "Póliza de incendio y sismo",
  PERMISO_EDIFICACION: "Permiso de edificación (DOM)",
  CERTIFICADO_NUMERO: "Certificado de número (DOM)",
  REGLAMENTO_COPROPIEDAD: "Reglamento de copropiedad",
  SUBDIVISION_SAG: "Subdivisión SAG",
  DERECHOS_AGUA: "Derechos de agua (CBR/DGA)",
  CONTRATO_ARRIENDO: "Contrato de arriendo",
};

// Convierte un mapa de etiquetas en opciones { value, label } para un <Select>.
export function enumOptions<T extends Record<string, string>>(
  labels: T,
): { value: string; label: string }[] {
  return Object.entries(labels).map(([value, label]) => ({ value, label }));
}

// Variante de color del badge según el estado de la propiedad.
export function propertyStatusVariant(
  estado: PropertyStatus,
): "success" | "arena" | "outline" {
  switch (estado) {
    case "ARRENDADA":
      return "success";
    case "EN_VENTA":
      return "arena";
    default:
      return "outline";
  }
}

// Variante de color del badge según el estado del contrato.
export function contractStatusVariant(
  estado: ContractStatus,
): "success" | "warning" | "outline" | "destructive" {
  switch (estado) {
    case "VIGENTE":
      return "success";
    case "POR_VENCER":
      return "warning";
    case "VENCIDO":
      return "destructive";
    default:
      return "outline";
  }
}
