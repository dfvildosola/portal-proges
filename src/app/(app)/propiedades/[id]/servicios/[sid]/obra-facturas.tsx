// Sección «Facturas de maestros» de un proyecto de obra (solo EQUIPO).
//
// Arriba, lo ya asignado a este proyecto con su estado de pago (leído de Odoo, o anotado a mano
// si es una factura «fuera de Odoo»). Abajo, las facturas de proveedor que Odoo tiene de los
// maestros con presupuesto aquí y que todavía no están asignadas por completo: cada una se
// asigna con un monto (nunca más de lo que queda). El portal nunca escribe en Odoo.
//
// El cliente NUNCA ve esto: los costos del maestro no pasan por vista-cliente.ts, y el
// componente se niega a pintarse si quien lo pide no es del equipo.

import { notFound } from "next/navigation";
import { TriangleAlert } from "lucide-react";
import { db } from "@/lib/db";
import { ORG_PROGES, exigirLectura } from "@/lib/org";
import { equipoEnAccion } from "@/lib/sesion";
import { facturasDeProveedor, type FacturaOdoo } from "@/lib/odoo";
import { asignableRestante } from "@/lib/obra";
import { formatDate, formatMoney } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cargarDatosDeObra, type FacturaDeObra } from "./obra-datos";
import { AsignarFacturaForm, FacturaManualForm, QuitarFacturaBoton } from "./obra-factura-form";

const ESTADOS_ODOO = {
  borrador: { texto: "Borrador en Odoo", variante: "warning" },
  publicada: { texto: "Publicada", variante: "success" },
  anulada: { texto: "Anulada", variante: "destructive" },
} as const;

const fmt = (n: number) => formatMoney(n, "CLP");

// Cómo va el pago de una factura asignada, en palabras.
function textoDePago(f: FacturaDeObra): string {
  if (f.origen === "manual") return f.pagada ? "Pagada" : "Sin pagar";
  if (f.sinDatosDeOdoo || f.estado === null || f.totalOdoo === null || f.pendiente === null) return "Pago sin datos de Odoo";
  if (f.estado !== "publicada") return "Sin pagar";
  if (f.pendiente <= 0) return "Pagada";
  if (f.pendiente < f.totalOdoo) return `Pago parcial (falta ${fmt(f.pendiente)})`;
  return "Sin pagar";
}

export async function ObraFacturas({ servicioEnCursoId }: { servicioEnCursoId: string }) {
  // Solo el equipo: aquí hay facturas y pagos del maestro.
  await equipoEnAccion();

  const datos = await cargarDatosDeObra(servicioEnCursoId);
  if (!datos) notFound();
  await exigirLectura(datos.organizationId);

  // Los maestros con un presupuesto vigente en este proyecto: de ellos se ofrecen las facturas.
  const [conPresupuesto, maestrosActivos] = await Promise.all([
    db.presupuestoMaestro.findMany({
      where: { servicioEnCursoId: datos.servicioId, organizationId: datos.organizationId, estado: { not: "RECHAZADO" } },
      select: { maestro: { select: { id: true, nombre: true, odooPartnerId: true } } },
    }),
    db.maestro.findMany({
      where: { organizationId: ORG_PROGES, activo: true },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true },
    }),
  ]);
  const maestros = [...new Map(conPresupuesto.map((p) => [p.maestro.id, p.maestro])).values()];

  // Las facturas de Odoo de cada uno. Si Odoo falla para uno, se dice cuál y se sigue con los demás.
  const lecturas = await Promise.all(
    maestros.map(async (m) => {
      try {
        return { maestro: m, facturas: await facturasDeProveedor(m.odooPartnerId), error: null as string | null };
      } catch (e) {
        return { maestro: m, facturas: [] as FacturaOdoo[], error: e instanceof Error ? e.message : "error desconocido" };
      }
    }),
  );
  const erroresDeOdoo = lecturas.filter((l) => l.error !== null);

  // Lo ya asignado de cada factura entre TODOS los proyectos, y lo asignado en este.
  const idsFacturas = lecturas.flatMap((l) => l.facturas.map((f) => f.id));
  const sumas = await db.facturaMaestro.groupBy({
    by: ["odooMoveId"],
    where: { odooMoveId: { in: idsFacturas } },
    _sum: { montoAsignado: true },
  });
  const asignadoEnTotal = new Map(sumas.map((s) => [s.odooMoveId, Number(s._sum.montoAsignado?.toString() ?? 0)]));
  const idsAsignadosAqui = new Set(datos.facturas.map((f) => f.odooMoveId));

  // Disponibles: no anuladas, con algo por asignar, y no asignadas ya a este proyecto.
  const disponibles = lecturas.flatMap((l) =>
    l.facturas
      .filter((f) => f.estado !== "anulada" && !idsAsignadosAqui.has(f.id))
      .map((f) => ({ maestro: l.maestro, factura: f, restante: asignableRestante(f.total, asignadoEnTotal.get(f.id) ?? 0) }))
      .filter((d) => d.restante > 0),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Facturas de maestros</CardTitle>
        <CardDescription>
          Las facturas de proveedor de Odoo se asignan a este proyecto; su pago se lee de Odoo. El portal no escribe en Odoo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {datos.odooError && (
          <p className="flex items-start gap-2 text-sm text-warning-soft-foreground">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <span>Odoo no respondió ({datos.odooError}). Se muestra lo guardado, sin el estado de pago.</span>
          </p>
        )}

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">
              Asignadas a este proyecto{datos.facturas.length > 0 ? ` (${datos.facturas.length})` : ""}
            </h3>
            <FacturaManualForm servicioEnCursoId={datos.servicioId} maestros={maestrosActivos} />
          </div>

          {datos.facturas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todavía no hay facturas asignadas.</p>
          ) : (
            <ul className="space-y-2">
              {datos.facturas.map((f) => (
                <li key={f.id} className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-medium">{f.maestroNombre}</span>
                      {f.numero && <span className="text-muted-foreground">{f.numero}</span>}
                      {f.origen === "manual" ? (
                        <Badge variant="arena">Fuera de Odoo</Badge>
                      ) : f.estado ? (
                        <Badge variant={ESTADOS_ODOO[f.estado].variante}>{ESTADOS_ODOO[f.estado].texto}</Badge>
                      ) : (
                        <Badge variant="secondary">Odoo sin datos</Badge>
                      )}
                    </p>
                    <p className="text-sm">
                      <span className="font-semibold tabular-nums">{fmt(f.montoAsignado)}</span> asignados
                      {f.totalOdoo !== null && f.totalOdoo !== f.montoAsignado && (
                        <span className="text-muted-foreground"> de {fmt(f.totalOdoo)}</span>
                      )}
                      {f.fecha && <span className="text-muted-foreground"> · {formatDate(f.fecha)}</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">{textoDePago(f)}</p>
                    {f.nota && <p className="whitespace-pre-line text-sm">{f.nota}</p>}
                  </div>
                  <QuitarFacturaBoton id={f.id} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-3 border-t pt-4">
          <h3 className="text-sm font-semibold">Facturas de Odoo por asignar</h3>

          {erroresDeOdoo.map((l) => (
            <p key={l.maestro.id} className="flex items-start gap-2 text-sm text-warning-soft-foreground">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              <span>
                No pude leer las facturas de {l.maestro.nombre} en Odoo ({l.error}).
              </span>
            </p>
          ))}

          {maestros.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Carga el presupuesto de un maestro para ver sus facturas de Odoo.
            </p>
          ) : disponibles.length === 0 && erroresDeOdoo.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay facturas de estos maestros por asignar (o ya están asignadas por completo).
            </p>
          ) : (
            <ul className="max-h-[28rem] space-y-2 overflow-y-auto">
              {disponibles.map(({ maestro, factura, restante }) => (
                <li key={factura.id} className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-medium">{maestro.nombre}</span>
                      <span className="text-muted-foreground">{factura.numero}</span>
                      <Badge variant={ESTADOS_ODOO[factura.estado].variante}>{ESTADOS_ODOO[factura.estado].texto}</Badge>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(factura.fecha)} · total {fmt(factura.total)} · por asignar {fmt(restante)}
                      {factura.estado === "publicada" && factura.pendiente < factura.total
                        ? ` · pendiente de pago ${fmt(factura.pendiente)}`
                        : ""}
                    </p>
                  </div>
                  <AsignarFacturaForm
                    servicioEnCursoId={datos.servicioId}
                    maestroId={maestro.id}
                    odooMoveId={factura.id}
                    restante={restante}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
