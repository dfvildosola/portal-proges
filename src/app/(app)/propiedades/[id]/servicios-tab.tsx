import Link from "next/link";
import { ChevronRight, ClipboardList, UserRound } from "lucide-react";
import { db } from "@/lib/db";
import { getOrgId, ORG_PROGES } from "@/lib/org";
import { usuarioActual } from "@/lib/sesion";
import { formatDate } from "@/lib/format";
import { NOMBRES_ESTADO, TIPOS_SERVICIO, diaChile } from "@/lib/servicios";
import type { ServicioEstado } from "@/generated/prisma/enums";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { AbrirServicioDialogo } from "./servicios-form";
import { ServiciosTabCliente } from "./servicios-tab-cliente";

// Un servicio en la lista. Lo que se muestra de cada uno vive en esta forma.
type ServicioFila = {
  id: string;
  tipo: keyof typeof TIPOS_SERVICIO;
  estado: ServicioEstado;
  porConfirmar: boolean;
  abiertoEl: Date;
  cerradoEl: Date | null;
  servicio: { codigo: string; nombre: string };
  etapa: { nombre: string };
  responsable: { nombre: string } | null;
};

// Pestaña «Servicios» de la ficha: los servicios abiertos de la propiedad arriba y
// los cerrados abajo, plegados. Busca sus propios datos para no engordar la página.
// Tiene dos caras: el EQUIPO gestiona (en el cliente activo) y el CLIENTE solo lee, con
// lo que le deja ver `src/lib/vista-cliente.ts`.
export async function ServiciosTab({ propertyId }: { propertyId: string }) {
  const usuario = await usuarioActual();
  if (!usuario) throw new Error("Sin permiso");
  if (usuario.rol === "CLIENTE") {
    return <ServiciosTabCliente usuario={usuario} propertyId={propertyId} />;
  }

  const orgId = await getOrgId();

  const [servicios, catalogo, responsables] = await Promise.all([
    db.servicioEnCurso.findMany({
      where: { propertyId, organizationId: orgId },
      orderBy: { abiertoEl: "desc" },
      select: {
        id: true,
        tipo: true,
        estado: true,
        porConfirmar: true,
        abiertoEl: true,
        cerradoEl: true,
        servicio: { select: { codigo: true, nombre: true } },
        etapa: { select: { nombre: true } },
        responsable: { select: { nombre: true } },
      },
    }),
    // El catálogo completo de servicios activos: el formulario lo filtra por tipo.
    // El catálogo es de Proges (común a todos los clientes), no del cliente activo.
    db.servicio.findMany({
      where: { organizationId: ORG_PROGES, activo: true },
      orderBy: [{ codigo: "asc" }, { nombre: "asc" }],
      select: { id: true, codigo: true, nombre: true, familia: true },
    }),
    // El equipo vive en el espacio de Proges.
    db.usuario.findMany({
      where: { organizationId: ORG_PROGES, rol: "EQUIPO", activo: true },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true },
    }),
  ]);

  const abiertos = servicios.filter((s) => s.estado === "ABIERTO");
  const cerrados = servicios.filter((s) => s.estado !== "ABIERTO");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Lo que Proges hace por esta propiedad. Cada servicio avanza por sus propias
          etapas, y puede haber varios a la vez.
        </p>
        <AbrirServicioDialogo
          propertyId={propertyId}
          catalogo={catalogo}
          responsables={responsables}
        />
      </div>

      {servicios.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Sin servicios todavía"
          description="Abre un servicio cuando la propiedad necesite algo: una inspección, una venta, una obra…"
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
                Servicios cerrados ({cerrados.length})
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
  servicio: ServicioFila;
}) {
  const cerrado = s.estado !== "ABIERTO";
  // Los instantes se llevan al día de Chile antes de mostrarlos como fecha.
  const desde = formatDate(diaChile(s.abiertoEl));
  const hasta = s.cerradoEl ? formatDate(diaChile(s.cerradoEl)) : null;

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
              {s.porConfirmar && <Badge variant="warning">Por confirmar</Badge>}
              {cerrado && (
                <Badge variant={s.estado === "TERMINADO" ? "success" : "outline"}>
                  {NOMBRES_ESTADO[s.estado]}
                </Badge>
              )}
            </div>
            <p className="text-sm font-medium">
              <span className="text-muted-foreground">{s.servicio.codigo}</span> ·{" "}
              {s.servicio.nombre}
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>
                Etapa: <span className="text-foreground">{s.etapa.nombre}</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <UserRound className="size-3" />
                {s.responsable ? s.responsable.nombre : "Sin responsable"}
              </span>
              <span>{hasta ? `Del ${desde} al ${hasta}` : `Desde el ${desde}`}</span>
            </div>
          </CardContent>
        </Card>
      </Link>
    </li>
  );
}
