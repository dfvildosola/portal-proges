// El cierre de la obra (solo EQUIPO): lo planificado contra lo real, y para la jefatura el botón de
// cerrar. Un cierre ya hecho se sigue viendo aquí, en solo lectura.
//
// Las cuentas salen de `planContraReal` y `resumenRecepcion` (src/lib/obra.ts): acá no se calcula
// nada, solo se muestra. El costo real es lo facturado por los maestros; el plazo real, los días
// desde el inicio de la obra hasta hoy (o hasta el día del cierre). El dueño nunca ve esto.

import { notFound } from "next/navigation";
import { TriangleAlert } from "lucide-react";
import { db } from "@/lib/db";
import { exigirLectura } from "@/lib/org";
import { equipoEnAccion, esJefatura } from "@/lib/sesion";
import { hoyChile } from "@/lib/fechas";
import { formatDate, formatMoney } from "@/lib/format";
import { planContraReal } from "@/lib/obra";
import { diaChile } from "@/lib/servicios";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cargarDatosDeObra } from "./obra-datos";
import { ObraCierreBoton } from "./obra-cierre-form";

const dias = (n: number) => `${n} ${Math.abs(n) === 1 ? "día" : "días"}`;

function Fila({
  titulo,
  planificado,
  real,
  diferencia,
}: {
  titulo: string;
  planificado: string;
  real: string;
  diferencia: { texto: string; malo: boolean } | null;
}) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-1 rounded-lg border p-3 sm:grid-cols-4 sm:items-center">
      <p className="col-span-2 text-sm font-medium sm:col-span-1">{titulo}</p>
      <div>
        <p className="text-xs text-muted-foreground">Planificado</p>
        <p className="tabular-nums">{planificado}</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Real</p>
        <p className="tabular-nums">{real}</p>
      </div>
      <div className="col-span-2 sm:col-span-1">
        <p className="text-xs text-muted-foreground">Diferencia</p>
        <p className={`tabular-nums ${diferencia?.malo ? "text-destructive" : ""}`}>{diferencia?.texto ?? "—"}</p>
      </div>
    </div>
  );
}

export async function ObraCierre({ servicioEnCursoId }: { servicioEnCursoId: string }) {
  // Solo el equipo: aquí hay costos del maestro.
  const usuario = await equipoEnAccion();

  const datos = await cargarDatosDeObra(servicioEnCursoId);
  if (!datos) notFound();
  await exigirLectura(datos.organizationId);

  const servicio = await db.servicioEnCurso.findUnique({
    where: { id: servicioEnCursoId },
    select: { estado: true, cerradoEl: true, motivoCierre: true, porRevisar: true },
  });
  if (!servicio) notFound();
  // Un proyecto cancelado no tiene cierre que mostrar.
  if (servicio.estado === "CANCELADO") return null;

  const cerrado = servicio.estado === "TERMINADO";
  const hasta = cerrado && servicio.cerradoEl ? diaChile(servicio.cerradoEl) : hoyChile();

  const plan = planContraReal({
    presupuestos: datos.presupuestos,
    facturas: datos.facturas.map((f) => f.cuenta),
    partidas: datos.partidas,
    inicioObra: datos.inicioObra,
    hasta,
  });
  const { costo, plazo, partidas } = plan;

  const faltan = partidas.pendientes + partidas.observadas;
  const sePuedeCerrar = partidas.total > 0 && faltan === 0;
  const fmt = (n: number) => formatMoney(n, "CLP");
  const conSigno = (n: number) => (n > 0 ? `+${fmt(n)}` : fmt(n));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          Cierre de la obra
          {cerrado ? <Badge variant="success">Cerrada</Badge> : <Badge variant="outline">Abierta</Badge>}
        </CardTitle>
        <CardDescription>
          {cerrado
            ? `Cerrada el ${formatDate(hasta)}. Lo planificado contra lo real, a esa fecha.`
            : "Lo planificado contra lo real, hasta hoy. Se cierra cuando todas las partidas están recibidas."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Fila
            titulo="Costo"
            planificado={fmt(costo.planificado)}
            real={fmt(costo.real)}
            diferencia={{ texto: conSigno(costo.diferencia), malo: costo.diferencia > 0 }}
          />
          <Fila
            titulo="Plazo"
            planificado={plazo.planificado === null ? "Sin plazo" : dias(plazo.planificado)}
            real={plazo.real === null ? "Sin fecha de inicio" : dias(plazo.real)}
            diferencia={
              plazo.diferencia === null
                ? null
                : { texto: `${plazo.diferencia > 0 ? "+" : ""}${dias(plazo.diferencia)}`, malo: plazo.diferencia > 0 }
            }
          />
          <Fila
            titulo="Partidas"
            planificado={`${partidas.total}`}
            real={`${partidas.conformes} conformes`}
            diferencia={
              faltan === 0
                ? { texto: "Todas recibidas", malo: false }
                : {
                    texto: `${partidas.pendientes} por recibir, ${partidas.observadas} observadas`,
                    malo: true,
                  }
            }
          />
        </div>

        {datos.odooError !== null && (
          <p className="flex items-start gap-2 text-sm text-warning-soft-foreground">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <span>
              Odoo no respondió ({datos.odooError}). El costo real cuenta lo asignado, sin comprobar las facturas.
            </span>
          </p>
        )}

        {cerrado ? (
          servicio.motivoCierre && (
            <p className="text-sm">
              <span className="text-muted-foreground">Nota del cierre: </span>
              {servicio.motivoCierre}
            </p>
          )
        ) : servicio.porRevisar ? (
          <p className="text-sm text-muted-foreground">
            Este proyecto todavía está por revisar: no se puede cerrar.
          </p>
        ) : !esJefatura(usuario) ? (
          <p className="text-sm text-muted-foreground">Solo la jefatura (Cecilia o Álvaro) cierra la obra.</p>
        ) : sePuedeCerrar ? (
          <ObraCierreBoton servicioEnCursoId={servicioEnCursoId} />
        ) : (
          <p className="text-sm text-muted-foreground">
            {partidas.total === 0
              ? "No hay partidas que recibir: enlaza la orden de Odoo para poder cerrar."
              : `No se puede cerrar todavía: quedan ${faltan} ${faltan === 1 ? "partida" : "partidas"} sin recibir conforme.`}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
