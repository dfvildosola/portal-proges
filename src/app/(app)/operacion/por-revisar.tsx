// «Por revisar»: los proyectos que abrió solo el pedido de un cliente y que la jefatura todavía
// no repartió. Una tarjeta por proyecto: quién lo pidió, para qué propiedad, qué necesita, y
// sus dos acciones (Revisar y Rechazar).

import { Inbox } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import { TIPOS_SERVICIO, diaChile, familiasDelTipo } from "@/lib/servicios";
import type { proyectosPorRevisar } from "@/lib/operacion";
import { RechazarDialogo } from "./rechazar-dialogo";
import {
  RevisarDialogo,
  type OpcionCatalogo,
  type OpcionResponsable,
} from "./revisar-dialogo";

type Proyecto = Awaited<ReturnType<typeof proyectosPorRevisar>>[number];

export function PorRevisar({
  proyectos,
  catalogo,
  responsables,
}: {
  proyectos: Proyecto[];
  catalogo: (OpcionCatalogo & { familia: string })[];
  responsables: OpcionResponsable[];
}) {
  if (proyectos.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="No hay pedidos por revisar"
        description="Cuando un cliente pida un servicio desde su portal, el proyecto aparece acá con una tarea para repartirlo."
      />
    );
  }

  return (
    <div className="space-y-3">
      {proyectos.map((p) => {
        // Del catálogo solo se ofrecen las familias del tipo pedido (la misma regla del servidor).
        const familias = familiasDelTipo(p.tipo);
        const opciones = catalogo
          .filter((c) => familias.includes(c.familia))
          .map(({ id, codigo, nombre }) => ({ id, codigo, nombre }));
        const tipoNombre = TIPOS_SERVICIO[p.tipo].nombre;
        return (
          <Card key={p.id} className="gap-3 px-4 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="arena">{p.cliente}</Badge>
              <Badge variant="info">{tipoNombre}</Badge>
              <span className="text-xs text-muted-foreground">
                {formatDate(diaChile(p.abiertoEl))}
                {p.solicitud ? ` · pedido por ${p.solicitud.pedidaPor.nombre}` : ""}
              </span>
            </div>
            <div>
              <p className="font-medium">{p.property.direccion}</p>
              {p.property.comuna && <p className="text-xs text-muted-foreground">{p.property.comuna}</p>}
            </div>
            {p.solicitud && <p className="text-sm whitespace-pre-line break-words">{p.solicitud.descripcion}</p>}
            <div className="flex flex-wrap gap-2">
              <RevisarDialogo
                servicioEnCursoId={p.id}
                servicioActualId={p.servicioId}
                tipoNombre={tipoNombre}
                catalogo={opciones}
                responsables={responsables}
              />
              <RechazarDialogo servicioEnCursoId={p.id} />
            </div>
          </Card>
        );
      })}
    </div>
  );
}
