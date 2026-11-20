// Los servicios abiertos del cliente: propiedad, tipo, nombre del catálogo y etapa en que van.
// Cada uno enlaza a su página con el historial.

import Link from "next/link";
import { ClipboardList } from "lucide-react";
import type { ServicioTipo } from "@/generated/prisma/enums";
import { TIPOS_SERVICIO } from "@/lib/servicios";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";

export type ServicioFilaCliente = {
  id: string;
  tipo: ServicioTipo;
  servicio: { nombre: string };
  etapa: { nombre: string };
  property: { id: string; direccion: string; comuna: string };
};

export function ServiciosEnCurso({ servicios }: { servicios: ServicioFilaCliente[] }) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold tracking-tight">Servicios en curso</h2>
      {servicios.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No hay servicios en curso"
          description="Cuando Proges acepte un pedido, el servicio aparece acá con la etapa en que va."
        />
      ) : (
        <ul className="space-y-3">
          {servicios.map((s) => (
            <li key={s.id}>
              <Link
                href={`/propiedades/${s.property.id}/servicios/${s.id}`}
                className="group/fila block rounded-xl focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <Card size="sm" className="transition-colors group-hover/fila:bg-muted/40">
                  <CardContent className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{TIPOS_SERVICIO[s.tipo].nombre}</Badge>
                      <span className="text-sm font-medium">{s.servicio.nombre}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>
                        {s.property.direccion}, {s.property.comuna}
                      </span>
                      <span>
                        Etapa: <span className="text-foreground">{s.etapa.nombre}</span>
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
