// «Por tipo y etapa»: para cada tipo con servicios abiertos, sus etapas en
// orden y cuántos servicios hay en cada una. Cada etapa con servicios se abre
// con un <details> (el plegable del propio navegador: no necesita JavaScript).

import { ChevronRight } from "lucide-react";
import type { ServicioTipo } from "@/generated/prisma/enums";
import { TIPOS_SERVICIO } from "@/lib/servicios";
import { Card } from "@/components/ui/card";
import type { FilaServicio } from "./filas";
import { TablaServicios } from "./tabla-servicios";

export type EtapaDelTipo = {
  id: string;
  tipo: ServicioTipo;
  nombre: string;
  activa: boolean;
};

export function PorTipoYEtapa({
  etapas,
  filas,
}: {
  etapas: EtapaDelTipo[]; // ya ordenadas por tipo y por orden
  filas: FilaServicio[];
}) {
  const tipos = (Object.keys(TIPOS_SERVICIO) as ServicioTipo[]).filter((tipo) =>
    filas.some((f) => f.tipo === tipo),
  );

  if (tipos.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No hay servicios abiertos con este filtro.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {tipos.map((tipo) => {
        const delTipo = filas.filter((f) => f.tipo === tipo);
        // Una etapa desactivada solo se muestra si todavía tiene servicios adentro.
        const etapasDelTipo = etapas.filter(
          (e) => e.tipo === tipo && (e.activa || delTipo.some((f) => f.etapaId === e.id)),
        );
        return (
          <Card key={tipo} className="gap-0 py-0">
            <div className="flex items-baseline justify-between gap-3 border-b px-4 py-3">
              <h3 className="font-medium">{TIPOS_SERVICIO[tipo].nombre}</h3>
              <span className="text-sm text-muted-foreground tabular-nums">
                {delTipo.length} {delTipo.length === 1 ? "abierto" : "abiertos"}
              </span>
            </div>
            <div className="divide-y">
              {etapasDelTipo.map((etapa) => {
                const deLaEtapa = delTipo.filter((f) => f.etapaId === etapa.id);
                const nombre = (
                  <>
                    <span>{etapa.nombre}</span>
                    {!etapa.activa && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        (desactivada)
                      </span>
                    )}
                  </>
                );
                // Sin servicios no hay nada que desplegar: solo se muestra la cuenta en 0.
                if (deLaEtapa.length === 0) {
                  return (
                    <div
                      key={etapa.id}
                      className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-muted-foreground"
                    >
                      <span className="pl-6">{nombre}</span>
                      <span className="tabular-nums">0</span>
                    </div>
                  );
                }
                return (
                  <details key={etapa.id} className="group">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-muted/50 [&::-webkit-details-marker]:hidden">
                      <span className="flex items-center gap-2">
                        <ChevronRight className="size-4 text-muted-foreground transition-transform group-open:rotate-90" />
                        <span>{nombre}</span>
                      </span>
                      <span className="font-medium tabular-nums">
                        {deLaEtapa.length}
                      </span>
                    </summary>
                    <div className="border-t bg-muted/20 px-2 pb-2">
                      <TablaServicios filas={deLaEtapa} />
                    </div>
                  </details>
                );
              })}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
