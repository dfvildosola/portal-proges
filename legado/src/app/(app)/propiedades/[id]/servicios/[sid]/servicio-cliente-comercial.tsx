// Lo comercial de un servicio de venta o arriendo, visto por el CLIENTE: indicadores, precio
// con sus cambios, recomendación de Proges, visitas y ofertas. Solo muestra, no hay formularios.
// Quedan fuera, a propósito: el nombre y el contacto del interesado, el oferente y su nota,
// quién cambió el precio y por qué, y el enlace del aviso. Esos datos ni siquiera llegan acá:
// `src/lib/vista-cliente.ts` no los entrega.

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatMoney } from "@/lib/format";
import { NOMBRES_OFERTA_ESTADO, NOMBRES_PRECIO_ORIGEN } from "@/lib/servicios";
import type { DatosComerciales } from "@/lib/vista-cliente";
import type { OfertaEstado } from "@/generated/prisma/enums";

const VARIANTE_OFERTA: Record<OfertaEstado, "info" | "success" | "warning" | "secondary"> = {
  RECIBIDA: "info",
  ACEPTADA: "success",
  RECHAZADA: "warning",
  CAIDA: "secondary",
};

const dias = (n: number) => `${n} ${n === 1 ? "día" : "días"}`;

function Indicador({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <Card size="sm">
      <CardContent>
        <p className="text-xs text-muted-foreground">{titulo}</p>
        <p className="text-xl font-semibold tabular-nums">{valor}</p>
      </CardContent>
    </Card>
  );
}

export function ServicioClienteComercial({ comercial }: { comercial: DatosComerciales }) {
  const { indicadores, precio, cambiosDePrecio, recomendacion, visitas, ofertas } = comercial;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador titulo="Días publicada" valor={dias(indicadores.diasPublicada)} />
        <Indicador titulo="Visitas, última semana" valor={String(indicadores.visitasUltimaSemana)} />
        <Indicador
          titulo="Visitas por semana"
          valor={indicadores.visitasPorSemana.toLocaleString("es-CL", { maximumFractionDigits: 1 })}
        />
        <Indicador
          titulo="Desde la última rebaja"
          valor={
            indicadores.diasDesdeUltimaRebaja === null
              ? "Sin rebajas"
              : dias(indicadores.diasDesdeUltimaRebaja)
          }
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Precio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-2xl font-semibold tabular-nums">
            {precio ? formatMoney(precio.monto, precio.moneda) : "Sin precio todavía"}
          </p>
          {cambiosDePrecio.length > 0 && (
            <ul className="divide-y rounded-lg border">
              {/* El más reciente arriba. */}
              {[...cambiosDePrecio].reverse().map((c, i) => (
                <li key={i} className="space-y-0.5 px-3 py-2 text-sm">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <span className="tabular-nums">
                      {c.anterior !== null && (
                        <span className="text-muted-foreground">
                          {formatMoney(c.anterior, c.moneda)} →{" "}
                        </span>
                      )}
                      <span className="font-medium">{formatMoney(c.nuevo, c.moneda)}</span>
                    </span>
                    <span className="text-xs text-muted-foreground">{formatDate(c.fecha)}</span>
                  </div>
                  {c.origen && (
                    <p className="text-xs text-muted-foreground">{NOMBRES_PRECIO_ORIGEN[c.origen]}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {recomendacion && (
        <Card>
          <CardHeader>
            <CardTitle>Recomendación de Proges</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-line break-words text-sm">{recomendacion.texto}</p>
            {recomendacion.fecha && (
              <p className="mt-2 text-xs text-muted-foreground">{formatDate(recomendacion.fecha)}</p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Visitas ({visitas.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {visitas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todavía no hay visitas.</p>
          ) : (
            <ul className="divide-y">
              {visitas.map((v, i) => (
                <li key={i} className="flex gap-3 py-2 text-sm first:pt-0 last:pb-0">
                  <span className="w-24 shrink-0 text-xs leading-5 text-muted-foreground">
                    {formatDate(v.fecha)}
                  </span>
                  <div className="min-w-0 flex-1">
                    {v.evaluacion !== null && (
                      <p className="font-medium">Evaluación {v.evaluacion} de 5</p>
                    )}
                    {v.comentario && (
                      <p className="break-words text-muted-foreground">{v.comentario}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ofertas ({ofertas.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {ofertas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todavía no hay ofertas.</p>
          ) : (
            <ul className="divide-y">
              {ofertas.map((o, i) => (
                <li
                  key={i}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm first:pt-0 last:pb-0"
                >
                  <span className="w-24 shrink-0 text-xs text-muted-foreground">
                    {formatDate(o.fecha)}
                  </span>
                  <span className="tabular-nums">{formatMoney(o.monto, o.moneda)}</span>
                  <Badge variant={VARIANTE_OFERTA[o.estado]} className="ml-auto">
                    {NOMBRES_OFERTA_ESTADO[o.estado]}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
