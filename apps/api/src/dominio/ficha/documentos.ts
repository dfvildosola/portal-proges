// Cómo se agrupan los documentos de la ficha y en qué estado está cada uno.
//
// Cinco cajones a la vista (dominio, municipales, planos, informes, otros) y, dentro de cada
// uno, cada documento con su estado: vigente, vence (en los próximos 45 días), vencido o falta
// (un papel que la propiedad necesita según papeles.ts y que nadie ha cargado). Funciones puras.
import type { Document as DocumentoDB } from "@proges/db";
import type { DocumentoEstado, DocumentoGrupo } from "@proges/contrato";
import type { Papel, PropertyStatus, PropertyType, DocumentType } from "@proges/db/enums";
import { diasHasta } from "../../util/fechas";
import { papelLabels } from "../comun/domain";
import { papelesRequeridos, sacarReemplazados } from "./papeles";
import { PAPELES_DIAS } from "./alertas";

export const GRUPOS: { grupo: DocumentoGrupo; nombre: string }[] = [
  { grupo: "dominio", nombre: "Dominio" },
  { grupo: "municipales", nombre: "Municipales" },
  { grupo: "planos", nombre: "Planos" },
  { grupo: "informes", nombre: "Informes" },
  { grupo: "otros", nombre: "Otros" },
];

const GRUPO_DEL_PAPEL: Record<Papel, DocumentoGrupo> = {
  ESCRITURA: "dominio",
  DOMINIO_VIGENTE: "dominio",
  HIPOTECAS_GRAVAMENES: "dominio",
  DERECHOS_AGUA: "dominio",
  CERTIFICADO_AVALUO: "informes",
  PLANO: "planos",
  CIP: "municipales",
  RECEPCION_FINAL: "municipales",
  PERMISO_EDIFICACION: "municipales",
  CERTIFICADO_NUMERO: "municipales",
  SUBDIVISION_SAG: "municipales",
  POLIZA_SEGURO: "otros",
  REGLAMENTO_COPROPIEDAD: "otros",
  CONTRATO_ARRIENDO: "otros",
};

// Sin papel, manda el cajón donde se archivó.
const GRUPO_DEL_TIPO: Record<DocumentType, DocumentoGrupo> = {
  ESCRITURA_TITULO: "dominio",
  MUNICIPAL: "municipales",
  AVALUO_TASACION: "informes",
  MANTENCION: "informes",
  CONTRATO: "otros",
  LEGAL_JUDICIAL: "otros",
  SEGURO: "otros",
  CONTRIBUCION: "otros",
  OTRO: "otros",
};

export function grupoDeDocumento(papel: Papel | null, tipo: DocumentType): DocumentoGrupo {
  return papel ? GRUPO_DEL_PAPEL[papel] : GRUPO_DEL_TIPO[tipo];
}

// Sin fecha de vencimiento, el documento no vence nunca.
export function estadoDeDocumento(fechaVencimiento: Date | null, hoy: Date): Exclude<DocumentoEstado, "falta"> {
  if (fechaVencimiento === null) return "vigente";
  const dias = diasHasta(fechaVencimiento, hoy);
  if (dias < 0) return "vencido";
  return dias <= PAPELES_DIAS ? "vence" : "vigente";
}

export type DocumentoAgrupable = Pick<
  DocumentoDB,
  "id" | "nombre" | "tipo" | "papel" | "fechaEmision" | "fechaVencimiento" | "createdAt"
>;

export type ItemAgrupado<T extends DocumentoAgrupable> = {
  papel: Papel | null;
  papelNombre: string | null;
  estado: DocumentoEstado;
  documento: T | null;
};

const ORDEN_ESTADO: Record<DocumentoEstado, number> = { falta: 0, vencido: 1, vence: 2, vigente: 3 };

export function agruparDocumentos<T extends DocumentoAgrupable>(entrada: {
  tipo: PropertyType;
  estado: PropertyStatus;
  documentos: T[];
  hoy: Date;
}): { grupos: { grupo: DocumentoGrupo; nombre: string; items: ItemAgrupado<T>[] }[]; faltan: number; vencenPronto: number } {
  const { tipo, estado, documentos, hoy } = entrada;
  const porGrupo = new Map<DocumentoGrupo, ItemAgrupado<T>[]>(GRUPOS.map((g) => [g.grupo, []]));

  // Un papel renovado deja de contar el documento vencido: queda solo el vigente.
  for (const d of sacarReemplazados(documentos, hoy)) {
    porGrupo.get(grupoDeDocumento(d.papel, d.tipo))!.push({
      papel: d.papel,
      papelNombre: d.papel ? papelLabels[d.papel] : null,
      estado: estadoDeDocumento(d.fechaVencimiento, hoy),
      documento: d,
    });
  }
  // Los papeles que la propiedad necesita y no tienen ningún documento.
  let faltan = 0;
  for (const papel of papelesRequeridos(tipo, estado)) {
    if (documentos.some((d) => d.papel === papel)) continue;
    faltan += 1;
    porGrupo.get(GRUPO_DEL_PAPEL[papel])!.push({ papel, papelNombre: papelLabels[papel], estado: "falta", documento: null });
  }

  let vencenPronto = 0;
  const grupos = GRUPOS.map(({ grupo, nombre }) => {
    const items = porGrupo.get(grupo)!.sort((a, b) => {
      const porEstado = ORDEN_ESTADO[a.estado] - ORDEN_ESTADO[b.estado];
      if (porEstado !== 0) return porEstado;
      return (a.papelNombre ?? a.documento?.nombre ?? "").localeCompare(b.papelNombre ?? b.documento?.nombre ?? "", "es");
    });
    vencenPronto += items.filter((i) => i.estado === "vence" || i.estado === "vencido").length;
    return { grupo, nombre, items };
  });
  return { grupos, faltan, vencenPronto };
}
