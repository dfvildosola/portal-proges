// La bandeja: las solicitudes NUEVA de todos los clientes, una tarjeta por solicitud.
// Cada tarjeta dice quién la pidió, para qué propiedad y qué necesita, y trae sus dos acciones.

import { Inbox } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import { TIPOS_SERVICIO, diaChile, familiasDelTipo } from "@/lib/servicios";
import type { solicitudesNuevas } from "@/lib/operacion";
import {
  AceptarDialogo,
  type OpcionCatalogo,
  type OpcionResponsable,
} from "./solicitud-aceptar";
import { RechazarDialogo } from "./solicitud-rechazar";

type Solicitud = Awaited<ReturnType<typeof solicitudesNuevas>>[number];

export function SolicitudesBandeja({
  solicitudes,
  catalogo,
  responsables,
}: {
  solicitudes: Solicitud[];
  catalogo: (OpcionCatalogo & { familia: string })[];
  responsables: OpcionResponsable[];
}) {
  if (solicitudes.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="No hay solicitudes nuevas"
        description="Cuando un cliente pida un servicio desde la ficha de su propiedad, aparece acá."
      />
    );
  }

  return (
    <div className="space-y-3">
      {solicitudes.map((s) => {
        // Del catálogo solo se ofrecen las familias del tipo pedido (la misma regla del servidor).
        const familias = familiasDelTipo(s.tipo);
        const opciones = catalogo
          .filter((c) => familias.includes(c.familia))
          .map(({ id, codigo, nombre }) => ({ id, codigo, nombre }));
        const tipoNombre = TIPOS_SERVICIO[s.tipo].nombre;
        return (
          <Card key={s.id} className="gap-3 px-4 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="arena">{s.cliente}</Badge>
              <Badge variant="info">{tipoNombre}</Badge>
              <span className="text-xs text-muted-foreground">
                {formatDate(diaChile(s.createdAt))} · pedida por {s.pedidaPor.nombre}
              </span>
            </div>
            <div>
              <p className="font-medium">{s.property.direccion}</p>
              {s.property.comuna && (
                <p className="text-xs text-muted-foreground">{s.property.comuna}</p>
              )}
            </div>
            <p className="text-sm whitespace-pre-line">{s.descripcion}</p>
            <div className="flex flex-wrap gap-2">
              <AceptarDialogo
                solicitudId={s.id}
                tipoNombre={tipoNombre}
                catalogo={opciones}
                responsables={responsables}
              />
              <RechazarDialogo solicitudId={s.id} />
            </div>
          </Card>
        );
      })}
    </div>
  );
}
