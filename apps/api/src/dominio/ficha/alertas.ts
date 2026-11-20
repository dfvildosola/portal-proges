// Las alertas de la ficha de una propiedad: documentos que faltan o vencen y contribuciones por
// vencer. Funciones puras: reciben lo que la ruta ya leyó y devuelven la lista, sin tocar la base.
//
// Los papeles se miden con la misma regla de papeles.ts que usa la lista de documentos (un
// número vive en un solo lugar). Los plazos son los de ADR 0008: papeles 45 días, contribuciones
// 30 días.
import type { Document as DocumentoDB } from "@proges/db";
import type { PropertyStatus, PropertyType } from "@proges/db/enums";
import type { FichaAlerta } from "@proges/contrato";
import { aFechaISO } from "../../util/al-contrato";
import { diasHasta, sumarDias } from "../../util/fechas";
import { formatDate } from "../../util/format";
import { papelLabels } from "../comun/domain";
import { estadoPapeles } from "./papeles";

export const PAPELES_DIAS = 45;
export const CONTRIBUCIONES_DIAS = 30;

export type DocumentoParaAlerta = Pick<
  DocumentoDB,
  "id" | "nombre" | "papel" | "fechaEmision" | "createdAt" | "fechaVencimiento"
>;

export type ContribucionPendiente = { id: string; anio: number; cuota: number; fechaVencimiento: Date };

export function alertasDeFicha(entrada: {
  tipo: PropertyType;
  estado: PropertyStatus;
  documentos: DocumentoParaAlerta[];
  contribuciones: ContribucionPendiente[];
  hoy: Date;
}): FichaAlerta[] {
  const { tipo, estado, documentos, contribuciones, hoy } = entrada;
  const alertas: FichaAlerta[] = [];

  const hoyEstados = estadoPapeles({ tipo, estado, documents: documentos, now: hoy });
  const enElHorizonte = estadoPapeles({ tipo, estado, documents: documentos, now: sumarDias(hoy, PAPELES_DIAS) });

  hoyEstados.forEach((e, i) => {
    const nombre = papelLabels[e.papel];
    if (e.estado === "falta") {
      alertas.push({
        tipo: "DOCUMENTO_FALTA",
        gravedad: "media",
        texto: `Falta el documento: ${nombre}.`,
        fecha: null,
        referenciaId: null,
      });
    } else if (e.estado === "vencido" && e.documento) {
      alertas.push({
        tipo: "DOCUMENTO_VENCIDO",
        gravedad: "alta",
        texto: `${nombre}: venció el ${formatDate(e.documento.fechaVencimiento)}.`,
        fecha: e.documento.fechaVencimiento ? aFechaISO(e.documento.fechaVencimiento) : null,
        referenciaId: e.documento.id,
      });
    } else if (e.estado === "ok" && enElHorizonte[i].estado === "vencido") {
      // Vigente hoy y sin otro documento que lo reemplace: vence dentro del plazo.
      const ultimo = documentos
        .filter((d) => d.papel === e.papel && d.fechaVencimiento)
        .reduce<DocumentoParaAlerta | null>(
          (a, d) => (a === null || (d.fechaVencimiento as Date) > (a.fechaVencimiento as Date) ? d : a),
          null,
        );
      if (ultimo?.fechaVencimiento) {
        alertas.push({
          tipo: "DOCUMENTO_VENCE",
          gravedad: "media",
          texto: `${nombre}: vence el ${formatDate(ultimo.fechaVencimiento)}.`,
          fecha: aFechaISO(ultimo.fechaVencimiento),
          referenciaId: ultimo.id,
        });
      }
    }
  });

  for (const c of contribuciones) {
    const dias = diasHasta(c.fechaVencimiento, hoy);
    if (dias > CONTRIBUCIONES_DIAS) continue;
    alertas.push({
      tipo: dias < 0 ? "CONTRIBUCION_VENCIDA" : "CONTRIBUCION_VENCE",
      gravedad: dias < 0 ? "alta" : "media",
      texto: `Contribución ${c.anio}, cuota ${c.cuota}: ${dias < 0 ? "venció el" : "vence el"} ${formatDate(c.fechaVencimiento)}.`,
      fecha: aFechaISO(c.fechaVencimiento),
      referenciaId: c.id,
    });
  }

  const peso = { alta: 0, media: 1, baja: 2 } as const;
  return alertas.sort((a, b) => peso[a.gravedad] - peso[b.gravedad]);
}
