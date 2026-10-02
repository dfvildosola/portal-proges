import { Download, FileText, X } from "lucide-react";
import type { Document as PropertyDocument } from "@/generated/prisma/client";
import { Badge } from "@/components/ui/badge";
import { documentTypeLabels, papelLabels } from "@/lib/domain";
import { formatDate } from "@/lib/format";
import type { EstadoPapel } from "@/lib/papeles";
import { UploadDocumentDialog } from "./documents-forms";
import { PapelesList } from "./papeles-list";
import { deleteDocument } from "../documents-actions";

// Contenido de la pestaña «Documentos» de la ficha: arriba la lista de papeles de
// la propiedad y abajo todos los documentos agrupados por tipo.
export function DocumentsTab({
  propertyId,
  documents,
  papeles,
}: {
  propertyId: string;
  documents: PropertyDocument[];
  papeles: EstadoPapel[];
}) {
  // Agrupa documentos por categoría (tipo) para mostrarlos en secciones.
  const docsByType = documents.reduce<Record<string, PropertyDocument[]>>(
    (acc, doc) => {
      (acc[doc.tipo] ??= []).push(doc);
      return acc;
    },
    {},
  );

  const today = new Date();
  const in30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  function expiryBadge(fechaVencimiento: Date | null) {
    if (!fechaVencimiento) return null;
    if (fechaVencimiento < today)
      return <Badge variant="destructive">Vencido</Badge>;
    if (fechaVencimiento < in30Days)
      return <Badge variant="secondary">Por vencer</Badge>;
    return null;
  }

  return (
    <div className="space-y-6">
      <PapelesList propertyId={propertyId} papeles={papeles} />

      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <h3 className="text-sm font-medium">Todos los documentos</h3>
          <span className="text-xs text-muted-foreground">
            {documents.length === 0
              ? "ninguno cargado"
              : `${documents.length} ${documents.length === 1 ? "documento" : "documentos"}`}
          </span>
        </div>
        <UploadDocumentDialog propertyId={propertyId} />
      </div>

      {documents.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-muted/30 p-8 text-center">
          <p className="text-sm font-medium">Sin documentos</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Sube escrituras, contratos, avalúos, seguros y más.
          </p>
        </div>
      ) : (
        Object.entries(docsByType).map(([tipo, docs]) => (
          <div key={tipo}>
            <h3 className="mb-2 text-sm font-medium text-muted-foreground uppercase tracking-wide">
              {documentTypeLabels[tipo as keyof typeof documentTypeLabels]}
            </h3>
            <div className="divide-y rounded-lg border">
              {docs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-start justify-between px-3 py-2.5 gap-3"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="truncate text-sm font-medium">
                          {doc.nombre}
                        </p>
                        <Badge variant="secondary" className="text-xs font-normal">
                          {doc.papel
                            ? papelLabels[doc.papel]
                            : documentTypeLabels[doc.tipo]}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {doc.fechaEmision
                          ? `Emisión: ${formatDate(doc.fechaEmision)} · `
                          : ""}
                        Subido: {formatDate(doc.createdAt)}
                        {doc.fechaVencimiento
                          ? ` · Vence: ${formatDate(doc.fechaVencimiento)}`
                          : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {expiryBadge(doc.fechaVencimiento)}
                    <a
                      href={doc.blobKey}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={doc.nombre}
                      className="inline-flex h-7 items-center gap-1 rounded-lg border border-border bg-background px-2 text-xs font-medium transition-colors hover:bg-muted"
                    >
                      <Download className="size-3.5" />
                      Descargar
                    </a>
                    <form action={deleteDocument}>
                      <input type="hidden" name="documentId" value={doc.id} />
                      <input type="hidden" name="propertyId" value={propertyId} />
                      <button
                        type="submit"
                        aria-label="Eliminar documento"
                        className="text-muted-foreground transition-colors hover:text-destructive"
                      >
                        <X className="size-4" />
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
