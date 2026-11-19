// Los pedidos del cliente, del más nuevo al más antiguo, con su estado.
// Nueva = Proges todavía no responde; Aceptada = ya hay un servicio abierto (con enlace);
// Rechazada = Proges explica el motivo.

import Link from "next/link";
import { ChevronRight, Inbox } from "lucide-react";
import type { ServicioTipo, SolicitudEstado } from "@/generated/prisma/enums";
import { formatDate } from "@/lib/format";
import { TIPOS_SERVICIO, diaChile } from "@/lib/servicios";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";

export type PedidoFila = {
  id: string;
  tipo: ServicioTipo;
  descripcion: string;
  estado: SolicitudEstado;
  motivoRechazo: string | null;
  createdAt: Date;
  servicioEnCursoId: string | null;
  property: { id: string; direccion: string; comuna: string };
};

function EstadoDelPedido({ pedido: p }: { pedido: PedidoFila }) {
  if (p.estado === "NUEVA") {
    return (
      <p className="flex items-center gap-2 text-sm">
        <Badge variant="warning">Nueva</Badge>
        <span className="text-muted-foreground">Esperando respuesta de Proges</span>
      </p>
    );
  }
  if (p.estado === "ACEPTADA") {
    return (
      <p className="flex flex-wrap items-center gap-2 text-sm">
        <Badge variant="success">Aceptada</Badge>
        {p.servicioEnCursoId && (
          <Link
            href={`/propiedades/${p.property.id}/servicios/${p.servicioEnCursoId}`}
            className="inline-flex items-center gap-0.5 font-medium text-primary underline-offset-4 hover:underline"
          >
            Ver el servicio
            <ChevronRight className="size-4" />
          </Link>
        )}
      </p>
    );
  }
  return (
    <div className="space-y-1 text-sm">
      <Badge variant="destructive">Rechazada</Badge>
      {p.motivoRechazo && (
        <p className="text-muted-foreground">
          Motivo: <span className="text-foreground">{p.motivoRechazo}</span>
        </p>
      )}
    </div>
  );
}

export function MisPedidos({ pedidos }: { pedidos: PedidoFila[] }) {
  return (
    <section className="mb-10">
      <h2 className="mb-3 text-lg font-semibold tracking-tight">Mis pedidos</h2>
      {pedidos.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Todavía no has pedido nada"
          description="Cuando necesites algo para una propiedad, pídelo con el botón «Pedir un servicio»."
        />
      ) : (
        <ul className="space-y-3">
          {pedidos.map((p) => (
            <li key={p.id}>
              <Card size="sm">
                <CardContent className="space-y-2">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <Badge variant="secondary">{TIPOS_SERVICIO[p.tipo].nombre}</Badge>
                    <Link
                      href={`/propiedades/${p.property.id}`}
                      className="text-sm font-medium underline-offset-4 hover:underline"
                    >
                      {p.property.direccion}, {p.property.comuna}
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(diaChile(p.createdAt))}
                    </span>
                  </div>
                  <p className="whitespace-pre-line break-words text-sm text-muted-foreground">
                    {p.descripcion}
                  </p>
                  <EstadoDelPedido pedido={p} />
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
