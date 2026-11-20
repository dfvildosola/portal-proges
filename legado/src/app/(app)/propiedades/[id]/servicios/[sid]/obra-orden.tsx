// La orden de Odoo de un proyecto, para el EQUIPO (el dueño no ve esto: lo suyo sale de
// src/lib/vista-cliente.ts).
//
// Sin orden, el proyecto está «por cotizar»: se puede abrir y repartir tareas igual, y la orden se
// enlaza cuando exista. Con orden, muestra el total, lo facturado y las partidas por recinto, solo
// de lectura: el avance y la recepción se llevan en otra sección (pieza E).

import { db } from "@/lib/db";
import { exigirLectura } from "@/lib/org";
import { exigirEquipo } from "@/lib/sesion";
import { formatMoney } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EnlazarOrdenForm, VolverATraerBoton } from "./obra-orden-form";

// Cuándo se trajo la orden: es un instante real (no una fecha civil), se muestra en hora de Chile.
const cuando = (d: Date) =>
  new Intl.DateTimeFormat("es-CL", { dateStyle: "short", timeStyle: "short", timeZone: "America/Santiago" }).format(d);

const numero = (n: { toString(): string }) =>
  new Intl.NumberFormat("es-CL", { maximumFractionDigits: 3 }).format(Number(n.toString()));

export async function ObraOrden({ servicioEnCursoId }: { servicioEnCursoId: string }) {
  await exigirEquipo();

  const servicio = await db.servicioEnCurso.findUnique({
    where: { id: servicioEnCursoId },
    select: {
      id: true,
      organizationId: true,
      orden: {
        include: { partidas: { orderBy: { posicion: "asc" } } },
      },
    },
  });
  if (!servicio) throw new Error("Sin permiso");
  // El espacio sale del proyecto leído, nunca de lo que mande el navegador.
  await exigirLectura(servicio.organizationId);

  const orden = servicio.orden;

  if (!orden) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Orden de Odoo <Badge variant="secondary">Por cotizar</Badge>
          </CardTitle>
          <CardDescription>
            Este proyecto todavía no tiene orden. Cuando el dueño apruebe la cotización en Odoo, enlázala por su
            número: sus líneas pasan a ser las partidas del proyecto.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EnlazarOrdenForm servicioId={servicio.id} />
        </CardContent>
      </Card>
    );
  }

  // Las partidas agrupadas por recinto, en el orden en que aparecen en Odoo. Sin recinto (un
  // servicio suelto) queda una sola lista para marcar.
  const grupos: { recinto: string | null; partidas: typeof orden.partidas }[] = [];
  for (const p of orden.partidas) {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.recinto === p.recinto) ultimo.partidas.push(p);
    else grupos.push({ recinto: p.recinto, partidas: [p] });
  }
  const sinRecintos = grupos.every((g) => g.recinto === null);
  const quitadas = orden.partidas.filter((p) => p.quitadaEnOdoo).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Orden {orden.numero}</CardTitle>
        <CardDescription>
          Total {formatMoney(orden.total, orden.moneda)} · facturado al dueño {formatMoney(orden.facturado, orden.moneda)}{" "}
          · traída el {cuando(orden.traidaEl)}
        </CardDescription>
        <CardAction>
          <VolverATraerBoton servicioId={servicio.id} />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {quitadas > 0 && (
          <p className="text-sm text-warning-soft-foreground">
            {quitadas === 1 ? "Una partida ya no está" : `${quitadas} partidas ya no están`} en la orden de Odoo. Se
            dejan marcadas, con su avance, para que decidas qué hacer.
          </p>
        )}
        {orden.partidas.length === 0 && <p className="text-sm text-muted-foreground">La orden no tiene líneas.</p>}
        {grupos.map((g, i) => (
          <section key={`${g.recinto ?? "sin"}-${i}`} className="flex flex-col gap-1">
            <h3 className="text-sm font-semibold">{g.recinto ?? (sinRecintos ? "Para marcar" : "Sin recinto")}</h3>
            <ul className="divide-y rounded-md border">
              {g.partidas.map((p) => (
                <li key={p.id} className="flex flex-col gap-0.5 px-3 py-2 sm:flex-row sm:items-baseline sm:gap-4">
                  <p className={`flex-1 text-sm ${p.quitadaEnOdoo ? "text-muted-foreground line-through" : ""}`}>
                    {p.codigo && <span className="mr-1.5 text-xs text-muted-foreground">{p.codigo}</span>}
                    {p.descripcion}
                    {p.quitadaEnOdoo && (
                      <Badge variant="warning" className="ml-2 align-middle no-underline">
                        Quitada en Odoo
                      </Badge>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground sm:text-sm">
                    {p.cantidad !== null ? `${numero(p.cantidad)} ${p.unidad ?? ""}`.trim() : "—"}
                    {" · "}
                    {formatMoney(p.precioDueno, p.moneda)}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </CardContent>
    </Card>
  );
}
