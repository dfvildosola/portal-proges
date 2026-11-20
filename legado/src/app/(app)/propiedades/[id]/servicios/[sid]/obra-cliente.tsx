// La obra vista por el DUEÑO: cómo va cada recinto, qué partidas están recibidas y las notas de
// la bitácora que el equipo marcó para él (con sus fotos). Solo muestra.
//
// Todo lo que llega acá sale de `src/lib/vista-cliente.ts`, que NO entrega presupuestos, facturas,
// pagos ni nombres de maestros, ni notas sin marcar. Este componente no tiene cómo pedirlos.

import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import type { NotaDelCliente, ObraDelCliente, PartidaDelCliente } from "@/lib/vista-cliente";

const porcentaje = (n: number) => `${n.toLocaleString("es-CL", { maximumFractionDigits: 1 })} %`;

function Barra({ valor, etiqueta }: { valor: number; etiqueta: string }) {
  return (
    <div
      className="h-2 overflow-hidden rounded-full bg-muted"
      role="progressbar"
      aria-valuenow={valor}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={etiqueta}
    >
      <div className="h-full bg-primary" style={{ width: `${valor}%` }} />
    </div>
  );
}

function EstadoRecepcion({ recepcion }: { recepcion: PartidaDelCliente["recepcion"] }) {
  if (recepcion === "CONFORME") return <Badge variant="success">Recibida</Badge>;
  if (recepcion === "OBSERVADA") return <Badge variant="warning">Con observaciones</Badge>;
  return <Badge variant="outline">Por recibir</Badge>;
}

export function ObraAvanceCliente({ obra }: { obra: ObraDelCliente }) {
  const { recepcion } = obra;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Avance de la obra</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm text-muted-foreground">Avance total</p>
            <p className="text-xl font-semibold tabular-nums">{porcentaje(obra.avance)}</p>
          </div>
          <Barra valor={obra.avance} etiqueta="Avance total de la obra" />
          <p className="text-xs text-muted-foreground">
            {recepcion.conformes} de {recepcion.total}{" "}
            {recepcion.total === 1 ? "partida recibida" : "partidas recibidas"}
            {recepcion.observadas > 0 &&
              ` · ${recepcion.observadas} con observaciones que Proges está corrigiendo`}
          </p>
        </div>

        <div className="space-y-3">
          {obra.recintos.map((r, i) => (
            <details key={`${r.nombre ?? "sin"}-${i}`} className="group rounded-lg border">
              <summary className="flex cursor-pointer list-none flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm font-medium break-words">{r.nombre ?? "Trabajos"}</span>
                <span className="flex items-center gap-3 sm:w-56">
                  <span className="min-w-0 flex-1">
                    <Barra valor={r.avance} etiqueta={`Avance de ${r.nombre ?? "los trabajos"}`} />
                  </span>
                  <span className="w-14 shrink-0 text-right text-sm tabular-nums">
                    {porcentaje(r.avance)}
                  </span>
                </span>
              </summary>
              <ul className="divide-y border-t">
                {r.partidas.map((p) => (
                  <li
                    key={p.id}
                    className="flex flex-col gap-1 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="text-sm break-words">
                        {p.codigo && <span className="text-muted-foreground">{p.codigo} · </span>}
                        {p.descripcion}
                      </p>
                      {p.cantidad !== null && (
                        <p className="text-xs text-muted-foreground">
                          {p.cantidad.toLocaleString("es-CL", { maximumFractionDigits: 3 })} {p.unidad ?? ""}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-sm tabular-nums">{p.avance} %</span>
                      <EstadoRecepcion recepcion={p.recepcion} />
                    </div>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function NotasParaElDueno({ notas }: { notas: NotaDelCliente[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Novedades de Proges</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="divide-y">
          {notas.map((n) => (
            <li key={n.id} className="space-y-2 py-3 first:pt-0 last:pb-0">
              <p className="text-xs text-muted-foreground">{formatDate(n.fecha)}</p>
              {n.texto && <p className="text-sm whitespace-pre-wrap">{n.texto}</p>}
              {n.fotos.length > 0 && (
                <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {n.fotos.map((f) => (
                    <li key={f.driveFileId}>
                      <a
                        href={`/archivos/${f.driveFileId}`}
                        target="_blank"
                        rel="noopener"
                        className="relative block aspect-square overflow-hidden rounded-lg bg-muted"
                      >
                        <Image
                          src={`/archivos/${f.driveFileId}?miniatura=1`}
                          alt={f.nombre}
                          fill
                          unoptimized
                          sizes="(min-width: 640px) 160px, 33vw"
                          className="object-cover"
                        />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

// Lo que se pone en la página del dueño: el avance (si hay partidas) y las novedades (si hay
// alguna). Sin partidas ni notas no muestra nada, para no llenar de tarjetas vacías un servicio
// que no es una obra.
export function ObraCliente({ obra, notas }: { obra: ObraDelCliente | null; notas: NotaDelCliente[] }) {
  if (!obra && notas.length === 0) return null;
  return (
    <>
      {obra && <ObraAvanceCliente obra={obra} />}
      {notas.length > 0 && <NotasParaElDueno notas={notas} />}
    </>
  );
}
