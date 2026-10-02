import { CircleAlert, CircleCheck, CircleX } from "lucide-react";
import { papelLabels } from "@/lib/domain";
import { formatDate } from "@/lib/format";
import type { EstadoPapel } from "@/lib/papeles";
import { UploadDocumentDialog } from "./documents-forms";

// Misma correspondencia que data-freshness.tsx (segunda copia; se extrae si aparece una tercera).
const ICONO = {
  ok: { Icon: CircleCheck, color: "text-success", sr: "Al día" },
  falta: { Icon: CircleAlert, color: "text-warning", sr: "Falta" },
  vencido: { Icon: CircleX, color: "text-destructive", sr: "Vencido" },
} as const;

// Línea de fechas de un papel que está cargado: «Emitido el … · hace 8 meses» si
// el documento tiene fecha de emisión; si no, «Subido el …» en gris.
function FechasPapel({ papel }: { papel: EstadoPapel }) {
  const doc = papel.documento;
  if (!doc) return null;
  if (doc.fechaEmision) {
    return (
      <span>
        Emitido el {formatDate(doc.fechaEmision)}
        {papel.antiguedad ? ` · ${papel.antiguedad}` : ""}
      </span>
    );
  }
  return (
    <span className="text-muted-foreground">
      Subido el {formatDate(doc.createdAt)}
    </span>
  );
}

// Lista de papeles de la propiedad (pestaña «Documentos»): cada papel requerido
// con su estado (al día, falta o vencido), sus fechas y, si falta o venció, un
// botón «Subir» que abre el cuadro con ese papel ya elegido.
export function PapelesList({
  propertyId,
  papeles,
}: {
  propertyId: string;
  papeles: EstadoPapel[];
}) {
  if (papeles.length === 0) return null;

  // Un vencido cuenta como presente, igual que chequeoPapeles.
  const presentes = papeles.filter((e) => e.estado !== "falta").length;

  return (
    <section>
      <div className="mb-2 flex items-baseline gap-2">
        <h3 className="text-sm font-medium">Papeles</h3>
        <span className="text-xs text-muted-foreground">
          {presentes} de {papeles.length}
        </span>
      </div>
      <ul className="divide-y rounded-lg border">
        {papeles.map((e) => {
          const { Icon, color, sr } = ICONO[e.estado];
          return (
            <li
              key={e.papel}
              className="flex items-start justify-between gap-3 px-3 py-2.5"
            >
              <div className="flex min-w-0 items-start gap-2.5">
                <Icon className={`mt-0.5 size-4 shrink-0 ${color}`} />
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    <span className="sr-only">{sr}: </span>
                    {papelLabels[e.papel]}
                  </p>
                  <p className="text-xs">
                    {e.estado === "falta" && (
                      <span className="text-muted-foreground">Falta</span>
                    )}
                    {e.estado === "vencido" && (
                      <>
                        <span className="text-destructive">
                          Venció el {formatDate(e.documento?.fechaVencimiento)}
                        </span>
                        {" · "}
                      </>
                    )}
                    {e.estado !== "falta" && <FechasPapel papel={e} />}
                  </p>
                </div>
              </div>
              {e.estado !== "ok" && (
                <div className="shrink-0">
                  <UploadDocumentDialog
                    propertyId={propertyId}
                    papelInicial={e.papel}
                    compacto
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
