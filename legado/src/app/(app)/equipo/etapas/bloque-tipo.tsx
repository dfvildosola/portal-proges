// El bloque de un tipo de servicio: su título, los avisos si la lista está incompleta,
// sus etapas en orden y el botón para agregar una. No guarda nada: solo muestra.

import { TriangleAlert } from "lucide-react";
import { Card } from "@/components/ui/card";
import { esComercial as tipoEsComercial, TIPOS_SERVICIO } from "@/lib/servicios";
import type { ServicioTipo } from "@/generated/prisma/enums";
import { EtapaDialogo } from "./etapa-dialogo";
import { EtapaFila, type EtapaFilaDatos } from "./etapa-fila";

// Avisos de una lista de etapas. Solo cuentan las activas: una desactivada no se ofrece.
function avisosDelTipo(tipo: ServicioTipo, etapas: EtapaFilaDatos[]): string[] {
  const activas = etapas.filter((e) => e.activa);
  const avisos: string[] = [];
  if (!activas.some((e) => e.cierraServicio)) {
    avisos.push(
      "Ninguna etapa activa cierra el servicio: los servicios de este tipo no tendrían cómo terminar al llegar al final. Marca una con «Cierra el servicio».",
    );
  }
  if (tipoEsComercial(tipo) && !activas.some((e) => e.propiedadPublicada)) {
    avisos.push(
      "Ninguna etapa activa está marcada «Propiedad publicada»: los días publicada quedarían en cero.",
    );
  }
  return avisos;
}

export function BloqueTipo({
  tipo,
  etapas,
}: {
  tipo: ServicioTipo;
  etapas: EtapaFilaDatos[];
}) {
  const nombreTipo = TIPOS_SERVICIO[tipo].nombre;
  const comercial = tipoEsComercial(tipo);
  const avisos = avisosDelTipo(tipo, etapas);

  return (
    <section aria-labelledby={`tipo-${tipo}`} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={`tipo-${tipo}`} className="text-lg font-semibold tracking-tight">
          {nombreTipo}
        </h2>
        <EtapaDialogo tipo={tipo} nombreTipo={nombreTipo} esComercial={comercial} />
      </div>

      {avisos.map((aviso) => (
        <div
          key={aviso}
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning-soft/40 px-3 py-2 text-sm text-warning-soft-foreground"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <span>{aviso}</span>
        </div>
      ))}

      <Card className="gap-0 p-0">
        {etapas.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            Este tipo no tiene etapas. Agrega la primera con «Agregar etapa».
          </p>
        ) : (
          <ol className="divide-y">
            {etapas.map((etapa, i) => (
              <EtapaFila
                key={etapa.id}
                etapa={etapa}
                tipo={tipo}
                nombreTipo={nombreTipo}
                esComercial={comercial}
                esPrimera={i === 0}
                esUltima={i === etapas.length - 1}
              />
            ))}
          </ol>
        )}
      </Card>
    </section>
  );
}
