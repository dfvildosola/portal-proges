// La pestaña «Servicios» de la ficha vista por un CLIENTE: solo lectura. Muestra la etapa
// de cada servicio y deja entrar a su detalle, sin responsable ni formularios de gestión.
// Los datos salen de `src/lib/vista-cliente.ts`, que es lo único que un cliente ve.

import Link from "next/link";
import { ChevronRight, ClipboardList } from "lucide-react";
import type { Usuario } from "@/generated/prisma/client";
import { formatDate } from "@/lib/format";
import { NOMBRES_ESTADO, TIPOS_SERVICIO } from "@/lib/servicios";
import { serviciosDePropiedad, type ServicioDeLaLista } from "@/lib/vista-cliente";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { PedirServicioBoton } from "./solicitud-form";

export async function ServiciosTabCliente({
  usuario,
  propertyId,
}: {
  usuario: Usuario;
  propertyId: string;
}) {
  const servicios = await serviciosDePropiedad(usuario, propertyId);
  const abiertos = servicios.filter((s) => s.estado === "ABIERTO");
  const cerrados = servicios.filter((s) => s.estado !== "ABIERTO");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Lo que Proges hace por esta propiedad. Cada servicio avanza por sus propias etapas.
        </p>
        <PedirServicioBoton propertyId={propertyId} />
      </div>

      {servicios.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Sin servicios todavía"
          description="Cuando Proges empiece a trabajar en esta propiedad, lo verás aquí."
        />
      ) : (
        <>
          {abiertos.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay servicios abiertos.</p>
          ) : (
            <ul className="space-y-3">
              {abiertos.map((s) => (
                <FilaServicio key={s.id} propertyId={propertyId} servicio={s} />
              ))}
            </ul>
          )}

          {cerrados.length > 0 && (
            <details className="group rounded-xl border">
              <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
                <ChevronRight className="size-4 text-muted-foreground transition-transform group-open:rotate-90" />
                Servicios terminados ({cerrados.length})
              </summary>
              <ul className="space-y-3 border-t p-4">
                {cerrados.map((s) => (
                  <FilaServicio key={s.id} propertyId={propertyId} servicio={s} />
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </div>
  );
}

function FilaServicio({
  propertyId,
  servicio: s,
}: {
  propertyId: string;
  servicio: ServicioDeLaLista;
}) {
  const cerrado = s.estado !== "ABIERTO";
  // Las fechas ya vienen como día de Chile desde vista-cliente.
  const desde = formatDate(s.abiertoEl);
  const hasta = s.cerradoEl ? formatDate(s.cerradoEl) : null;

  return (
    <li>
      <Link
        href={`/propiedades/${propertyId}/servicios/${s.id}`}
        className="group/fila block rounded-xl focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <Card size="sm" className="transition-colors group-hover/fila:bg-muted/40">
          <CardContent className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{TIPOS_SERVICIO[s.tipo].nombre}</Badge>
              {cerrado && <Badge variant="success">{NOMBRES_ESTADO[s.estado]}</Badge>}
            </div>
            <p className="text-sm font-medium">{s.nombre}</p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>
                Etapa: <span className="text-foreground">{s.etapa}</span>
              </span>
              <span>{hasta ? `Del ${desde} al ${hasta}` : `Desde el ${desde}`}</span>
            </div>
          </CardContent>
        </Card>
      </Link>
    </li>
  );
}
