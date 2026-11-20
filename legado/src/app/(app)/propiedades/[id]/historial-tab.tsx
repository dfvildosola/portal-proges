import Link from "next/link";
import { ChevronRight, FileText, History, StickyNote, UserRound } from "lucide-react";
import { db } from "@/lib/db";
import { espaciosQueLee } from "@/lib/org";
import { usuarioActual } from "@/lib/sesion";
import { formatDate, formatMoney } from "@/lib/format";
import { NOMBRES_ESTADO, TIPOS_SERVICIO, diaChile } from "@/lib/servicios";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";

// Pestaña «Historial» de la ficha (solo EQUIPO): todo lo que Proges ha hecho en esta propiedad,
// del proyecto más reciente al más antiguo, abiertos y cerrados juntos. De cada uno muestra su
// tipo, sus fechas, su orden de Odoo si la tiene y sus últimas notas de la bitácora, y enlaza a
// su página. Es el «qué pasó aquí» de la propiedad: la propiedad es lo que manda (ADR 0012).
//
// Busca sus propios datos para no engordar la página. Para un cliente no pinta nada: las notas
// del equipo y los montos de la obra nunca salen por aquí (lo del cliente sale de vista-cliente.ts).

const NOTAS_POR_PROYECTO = 3;

export async function HistorialTab({ propertyId }: { propertyId: string }) {
  const usuario = await usuarioActual();
  if (!usuario || usuario.rol !== "EQUIPO") return null;

  // La ficha ya comprobó que se puede leer la propiedad; aquí se vuelve a filtrar por espacio.
  const orgIds = await espaciosQueLee();
  const proyectos = await db.servicioEnCurso.findMany({
    where: { propertyId, organizationId: { in: orgIds } },
    orderBy: { abiertoEl: "desc" },
    select: {
      id: true,
      tipo: true,
      estado: true,
      porRevisar: true,
      abiertoEl: true,
      cerradoEl: true,
      motivoCierre: true,
      servicio: { select: { codigo: true, nombre: true } },
      etapa: { select: { nombre: true } },
      responsable: { select: { nombre: true } },
      orden: { select: { numero: true, total: true, moneda: true } },
      _count: { select: { notas: true } },
      notas: {
        orderBy: { createdAt: "desc" },
        take: NOTAS_POR_PROYECTO,
        select: {
          id: true,
          texto: true,
          createdAt: true,
          paraDueno: true,
          autor: { select: { nombre: true } },
        },
      },
    },
  });

  if (proyectos.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="Todavía no hay historial"
        description="Cuando Proges abra un proyecto en esta propiedad, aparecerá aquí con sus notas."
      />
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Todos los proyectos de esta propiedad, abiertos y cerrados, del más reciente al más antiguo.
      </p>
      <ul className="space-y-3">
        {proyectos.map((p) => {
          const cerrado = p.estado !== "ABIERTO";
          // Los instantes se llevan al día de Chile antes de mostrarlos como fecha.
          const desde = formatDate(diaChile(p.abiertoEl));
          const hasta = p.cerradoEl ? formatDate(diaChile(p.cerradoEl)) : null;
          return (
            <li key={p.id}>
              <Card size="sm">
                <CardContent className="space-y-3">
                  <Link
                    href={`/propiedades/${propertyId}/servicios/${p.id}`}
                    className="group/fila block space-y-2 rounded-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{TIPOS_SERVICIO[p.tipo].nombre}</Badge>
                      {p.porRevisar && <Badge variant="warning">Por revisar</Badge>}
                      {cerrado && (
                        <Badge variant={p.estado === "TERMINADO" ? "success" : "outline"}>
                          {NOMBRES_ESTADO[p.estado]}
                        </Badge>
                      )}
                      <ChevronRight className="ml-auto size-4 text-muted-foreground transition-transform group-hover/fila:translate-x-0.5" />
                    </div>
                    <p className="text-sm font-medium">
                      <span className="text-muted-foreground">{p.servicio.codigo}</span> ·{" "}
                      {p.servicio.nombre}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>{hasta ? `Del ${desde} al ${hasta}` : `Desde el ${desde}`}</span>
                      {!cerrado && (
                        <span>
                          Etapa: <span className="text-foreground">{p.etapa.nombre}</span>
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <UserRound className="size-3" />
                        {p.responsable ? p.responsable.nombre : "Sin responsable"}
                      </span>
                      {p.orden && (
                        <span className="inline-flex items-center gap-1">
                          <FileText className="size-3" />
                          Orden {p.orden.numero} ·{" "}
                          <span className="tabular-nums">
                            {formatMoney(p.orden.total.toString(), p.orden.moneda)}
                          </span>
                        </span>
                      )}
                    </div>
                    {cerrado && p.motivoCierre && (
                      <p className="text-xs text-muted-foreground">Motivo: {p.motivoCierre}</p>
                    )}
                  </Link>

                  {p.notas.length > 0 && (
                    <div className="space-y-2 border-t pt-3">
                      <p className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                        <StickyNote className="size-3" />
                        Últimas notas
                        {p._count.notas > p.notas.length && ` (${p.notas.length} de ${p._count.notas})`}
                      </p>
                      <ul className="space-y-2">
                        {p.notas.map((n) => (
                          <li key={n.id} className="text-sm">
                            <p className="line-clamp-2 break-words">{n.texto}</p>
                            <p className="text-xs text-muted-foreground">
                              {n.autor.nombre} · {formatDate(diaChile(n.createdAt))}
                              {n.paraDueno && " · la ve el dueño"}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
