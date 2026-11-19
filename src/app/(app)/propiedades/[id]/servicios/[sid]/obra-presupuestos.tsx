// Sección «Presupuestos de maestros» de un proyecto de obra (solo EQUIPO).
//
// Muestra lo que cada maestro cobra por el trabajo: tipo (original o adicional), total, plazo,
// estado, su PDF y qué partidas cubre. La jefatura aprueba o rechaza desde aquí. También se
// anotan las dos fechas de la obra. El cliente NUNCA ve esto: los costos del maestro no pasan
// por vista-cliente.ts, y el componente se niega a pintarse si quien lo pide no es del equipo.

import { notFound } from "next/navigation";
import { FileText } from "lucide-react";
import { db } from "@/lib/db";
import { ORG_PROGES, exigirLectura } from "@/lib/org";
import { equipoEnAccion, esJefatura } from "@/lib/sesion";
import { formatMoney, toDateInputValue } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ObraFechasForm } from "./obra-fechas-form";
import { ObraPresupuestoForm } from "./obra-presupuesto-form";
import { ObraPresupuestoResolver } from "./obra-presupuesto-resolver";

const ESTADOS = {
  RECIBIDO: { texto: "Recibido", variante: "warning" },
  APROBADO: { texto: "Aprobado", variante: "success" },
  RECHAZADO: { texto: "Rechazado", variante: "destructive" },
} as const;

// Un presupuesto se carga con fecha y hora (un instante): se muestra en hora de Chile, igual en
// el Mac y en producción (que corre en UTC).
const fechaChile = new Intl.DateTimeFormat("es-CL", { timeZone: "America/Santiago", dateStyle: "short" });

// «Cocina (3), Baño (1)»: cuántas partidas cubre en cada recinto.
function resumenDePartidas(partidas: { recinto: string | null }[]): string {
  if (partidas.length === 0) return "Sin partidas asignadas todavía";
  const porRecinto = new Map<string, number>();
  for (const p of partidas) {
    const recinto = p.recinto ?? "Sin recinto";
    porRecinto.set(recinto, (porRecinto.get(recinto) ?? 0) + 1);
  }
  return [...porRecinto].map(([recinto, n]) => `${recinto} (${n})`).join(", ");
}

export async function ObraPresupuestos({ servicioEnCursoId }: { servicioEnCursoId: string }) {
  // Solo el equipo: si un cliente llegara a pintar esto por error, se corta aquí.
  const usuario = await equipoEnAccion();

  const servicio = await db.servicioEnCurso.findUnique({
    where: { id: servicioEnCursoId },
    select: { id: true, organizationId: true, inicioObra: true, fechaComprometida: true },
  });
  if (!servicio) notFound();
  await exigirLectura(servicio.organizationId);

  const [presupuestos, partidas, maestros] = await Promise.all([
    db.presupuestoMaestro.findMany({
      where: { servicioEnCursoId: servicio.id, organizationId: servicio.organizationId },
      orderBy: { createdAt: "asc" },
      include: {
        maestro: { select: { nombre: true } },
        partidas: { select: { id: true, recinto: true } },
        cargadoPor: { select: { nombre: true } },
        resueltoPor: { select: { nombre: true } },
      },
    }),
    db.partida.findMany({
      where: { servicioEnCursoId: servicio.id, quitadaEnOdoo: false },
      orderBy: { posicion: "asc" },
      select: { id: true, recinto: true, codigo: true, descripcion: true },
    }),
    db.maestro.findMany({
      where: { organizationId: ORG_PROGES, activo: true },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true, especialidad: true },
    }),
  ]);

  const puedeResolver = esJefatura(usuario);
  const inicio = toDateInputValue(servicio.inicioObra);
  const comprometida = toDateInputValue(servicio.fechaComprometida);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Presupuestos de maestros</CardTitle>
        <CardDescription>
          Lo que cobra cada maestro. El aprobado es el plan de costo y plazo de la obra.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <ObraFechasForm
          key={`${inicio}|${comprometida}`}
          servicioEnCursoId={servicio.id}
          inicioObra={inicio}
          fechaComprometida={comprometida}
        />

        <div className="space-y-3 border-t pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">
              Presupuestos{presupuestos.length > 0 ? ` (${presupuestos.length})` : ""}
            </h3>
            <ObraPresupuestoForm
              servicioEnCursoId={servicio.id}
              maestros={maestros}
              partidas={partidas}
            />
          </div>

          {presupuestos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todavía no hay presupuestos cargados.</p>
          ) : (
            <ul className="space-y-3">
              {presupuestos.map((p) => {
                const estado = ESTADOS[p.estado];
                return (
                  <li key={p.id} className="space-y-2 rounded-lg border p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{p.maestro.nombre}</span>
                      <Badge variant={p.tipo === "ADICIONAL" ? "info" : "secondary"}>
                        {p.tipo === "ADICIONAL" ? "Adicional" : "Original"}
                      </Badge>
                      <Badge variant={estado.variante}>{estado.texto}</Badge>
                    </div>

                    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                      <span className="font-semibold tabular-nums">{formatMoney(p.total, "CLP")}</span>
                      <span className="text-muted-foreground">
                        {p.plazoDias ? `${p.plazoDias} días` : "Sin plazo"}
                      </span>
                      {p.pdfDriveFileId && (
                        <a
                          href={`/archivos/${p.pdfDriveFileId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
                        >
                          <FileText className="size-3.5" />
                          PDF
                        </a>
                      )}
                    </p>

                    <p className="text-sm text-muted-foreground">{resumenDePartidas(p.partidas)}</p>
                    {p.nota && <p className="whitespace-pre-line text-sm">{p.nota}</p>}

                    <p className="text-xs text-muted-foreground">
                      Cargado por {p.cargadoPor.nombre} el {fechaChile.format(p.createdAt)}
                      {p.resueltoPor && p.resueltoEl
                        ? ` · ${estado.texto.toLowerCase()} por ${p.resueltoPor.nombre} el ${fechaChile.format(p.resueltoEl)}`
                        : ""}
                    </p>

                    {p.estado === "RECIBIDO" && puedeResolver && <ObraPresupuestoResolver id={p.id} />}
                    {p.estado === "RECIBIDO" && !puedeResolver && (
                      <p className="text-xs text-muted-foreground">Espera la aprobación de la jefatura.</p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
