// De la agenda de pendientes (agenda.ts, ADR 0008) a lo que entrega GET /v1/vencimientos.
//
// agenda.ts calcula QUÉ vence (contratos, cobros, contribuciones, cuentas, papeles). Aquí se
// traduce cada ítem a la forma del contrato y se le suma la gravedad y el servicio que se le
// puede pedir a Proges para resolverlo (el botón «que Proges lo haga»). También se agregan los
// papeles que FALTAN, que la agenda deja afuera a propósito (los muestra la ficha).
import type { PropertyStatus, PropertyType, Papel } from "@proges/db/enums";
import type { Document as DocumentoDB } from "@proges/db";
import type { FichaServicioTipo, VencimientoGravedad, VencimientoItem, VencimientosRespuesta } from "@proges/contrato";
import { aFechaISO, aMonto } from "../../util/al-contrato";
import { papelLabels } from "../comun/domain";
import type { Cuando, ItemAgenda, TipoItem } from "./agenda";
import { papelesRequeridos } from "./papeles";

type TipoVencimiento = TipoItem | "PAPEL_FALTA";

// Qué servicio se le pide a Proges para cada pendiente. Los pendientes de toda la cartera
// (arriendos de la semana, cobros sin generar) no son de una propiedad: no llevan servicio.
// Evaluación es el servicio que estudia los títulos y papeles de una propiedad.
const SERVICIO_SUGERIDO: Record<TipoVencimiento, FichaServicioTipo | null> = {
  ARRIENDO_ATRASADO: "ADMINISTRACION",
  ARRIENDOS_SEMANA: null,
  COBROS_SIN_GENERAR: null,
  AVISO_NO_RENOVACION: "ADMINISTRACION",
  CONTRATO_POR_VENCER: "ARRIENDO",
  CONTRATO_VENCIDO: "ARRIENDO",
  REAJUSTE_PENDIENTE: "ADMINISTRACION",
  CONTRIBUCION: "ADMINISTRACION",
  CUENTA: "ADMINISTRACION",
  PAPEL: "EVALUACION",
  PAPEL_FALTA: "EVALUACION",
  ARRENDADA_SIN_CONTRATO: "ADMINISTRACION",
  DESOCUPADA_PROLONGADA: "ARRIENDO",
};

export function servicioSugeridoDe(tipo: TipoVencimiento): { tipo: FichaServicioTipo } | null {
  const servicio = SERVICIO_SUGERIDO[tipo];
  return servicio ? { tipo: servicio } : null;
}

export function gravedadDe(cuando: Cuando): VencimientoGravedad {
  if (cuando === "ATRASADO") return "alta";
  return cuando === "SEMANA" ? "media" : "baja";
}

export function aVencimiento(item: ItemAgenda): VencimientoItem {
  return {
    clave: item.clave,
    tipo: item.tipo,
    cuando: item.cuando,
    gravedad: gravedadDe(item.cuando),
    fecha: aFechaISO(item.fecha),
    monto: item.montoCLP === null ? null : aMonto(Math.round(item.montoCLP), "CLP"),
    propiedad: item.propiedad
      ? {
          id: item.propiedad.id,
          direccion: item.propiedad.direccion,
          comuna: item.propiedad.comuna,
          clienteId: item.propiedad.organizationId,
        }
      : null,
    contrato: item.contrato,
    texto: item.texto,
    servicioSugerido: servicioSugeridoDe(item.tipo),
  };
}

export type PropiedadParaPapeles = {
  id: string;
  direccion: string;
  comuna: string;
  organizationId: string;
  tipo: PropertyType;
  estado: PropertyStatus;
  documents: Pick<DocumentoDB, "papel">[];
};

// Un pendiente por cada papel requerido que la propiedad no tiene cargado. Sin fecha propia: se
// toma «hoy», y cae en «este mes» con gravedad media (es trabajo por hacer, no algo atrasado).
export function pendientesDePapelesQueFaltan(propiedades: PropiedadParaPapeles[], hoy: Date): VencimientoItem[] {
  return propiedades.flatMap((p) => {
    const cargados = new Set<Papel | null>(p.documents.map((d) => d.papel));
    return papelesRequeridos(p.tipo, p.estado)
      .filter((papel) => !cargados.has(papel))
      .map((papel) => ({
        clave: `PAPEL_FALTA:${p.id}:${papel}`,
        tipo: "PAPEL_FALTA" as const,
        cuando: "MES" as const,
        gravedad: "media" as const,
        fecha: aFechaISO(hoy),
        monto: null,
        propiedad: { id: p.id, direccion: p.direccion, comuna: p.comuna, clienteId: p.organizationId },
        contrato: null,
        texto: `Falta el documento: ${papelLabels[papel]}.`,
        servicioSugerido: servicioSugeridoDe("PAPEL_FALTA"),
      }));
  });
}

// Los números de arriba de la pantalla.
export function resumenDeVencimientos(items: VencimientoItem[]): VencimientosRespuesta["resumen"] {
  let atrasadoCLP = 0;
  let atrasadoSinMonto = 0;
  const cuenta = { ATRASADO: 0, SEMANA: 0, MES: 0, TRIMESTRE: 0 };
  for (const i of items) {
    cuenta[i.cuando] += 1;
    if (i.cuando !== "ATRASADO") continue;
    if (i.monto) atrasadoCLP += Number(i.monto.valor);
    const esDePlata = i.tipo === "ARRIENDO_ATRASADO" || i.tipo === "CUENTA" || i.tipo === "CONTRIBUCION";
    if (esDePlata && !i.monto) atrasadoSinMonto += 1;
  }
  return {
    atrasados: cuenta.ATRASADO,
    estaSemana: cuenta.SEMANA,
    esteMes: cuenta.MES,
    proximos: cuenta.TRIMESTRE,
    atrasadoCLP: aMonto(atrasadoCLP, "CLP"),
    atrasadoSinMonto,
  };
}

// El orden de la agenda: la plata primero (el monto mayor arriba), y después por fecha.
export function ordenarVencimientos(items: VencimientoItem[]): VencimientoItem[] {
  return [...items].sort((a, b) => {
    const ma = a.monto ? Number(a.monto.valor) : null;
    const mb = b.monto ? Number(b.monto.valor) : null;
    if (ma !== null && mb !== null && ma !== mb) return mb - ma;
    if ((ma !== null) !== (mb !== null)) return ma !== null ? -1 : 1;
    return a.fecha.localeCompare(b.fecha) || a.clave.localeCompare(b.clave);
  });
}
