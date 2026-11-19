// Sección «Visitas» del panel comercial: la lista y el formulario corto.

import { Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { borrarVisita } from "../comercial-actions";
import { RegistrarVisitaForm } from "./comercial-visita-form";

export type VisitaFila = {
  id: string;
  fecha: Date;
  hechaPor: string | null;
  interesadoNombre: string | null;
  interesadoContacto: string | null;
  evaluacion: number | null;
  comentario: string | null;
};

// Estrellas llenas y vacías; el texto «3/5» va aparte para quien no ve el color.
function Estrellas({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center gap-1" title={`Evaluación ${n} de 5`}>
      <span aria-hidden className="text-warning">
        {"★".repeat(n)}
        <span className="text-muted-foreground/40">{"★".repeat(5 - n)}</span>
      </span>
      <span className="text-xs text-muted-foreground">{n}/5</span>
    </span>
  );
}

export function ComercialVisitas({
  servicioId,
  abierto,
  visitas,
  hoy,
  equipo,
  usuarioId,
}: {
  servicioId: string;
  abierto: boolean;
  // De la más reciente a la más antigua.
  visitas: VisitaFila[];
  hoy: string;
  equipo: { id: string; nombre: string }[];
  usuarioId: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Visitas ({visitas.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {abierto && <RegistrarVisitaForm servicioId={servicioId} hoy={hoy} equipo={equipo} usuarioId={usuarioId} />}

        {visitas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no hay visitas registradas.</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {visitas.map((v) => (
              <li key={v.id} className="flex items-start justify-between gap-3 px-3 py-2 text-sm">
                <div className="min-w-0 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                    <span className="font-medium tabular-nums">{formatDate(v.fecha)}</span>
                    {v.evaluacion !== null && <Estrellas n={v.evaluacion} />}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {v.hechaPor ? `La hizo ${v.hechaPor}` : "Sin responsable"}
                    {v.interesadoNombre ? ` · interesado: ${v.interesadoNombre}` : ""}
                    {v.interesadoContacto ? ` (${v.interesadoContacto})` : ""}
                  </p>
                  {v.comentario && <p className="text-sm break-words">{v.comentario}</p>}
                </div>
                {abierto && (
                  <form action={borrarVisita}>
                    <input type="hidden" name="servicioId" value={servicioId} />
                    <input type="hidden" name="visitaId" value={v.id} />
                    <Button
                      type="submit"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Borrar la visita del ${formatDate(v.fecha)}`}
                      title="Borrar visita mal ingresada"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
