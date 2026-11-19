// Sección «Recomendación al propietario»: el texto vigente con su fecha y el
// formulario para reemplazarlo.

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import { diaChile } from "@/lib/servicios";
import { RecomendacionForm } from "./comercial-recomendacion-form";

export function ComercialRecomendacion({
  servicioId,
  abierto,
  recomendacion,
  fecha,
}: {
  servicioId: string;
  abierto: boolean;
  recomendacion: string | null;
  // Instante en que se guardó.
  fecha: Date | null;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recomendación al propietario</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {recomendacion ? (
          <div className="space-y-1">
            <p className="text-sm whitespace-pre-wrap break-words">{recomendacion}</p>
            {fecha && (
              <p className="text-xs text-muted-foreground">Escrita el {formatDate(diaChile(fecha))}</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Todavía no hay recomendación.</p>
        )}
        {abierto && (
          <div className={recomendacion ? "border-t pt-4" : undefined}>
            <RecomendacionForm servicioId={servicioId} hayTexto={recomendacion !== null} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
