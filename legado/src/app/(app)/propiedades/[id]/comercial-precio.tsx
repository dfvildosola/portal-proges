// Sección «Precio» del panel comercial: el precio vigente, quién lo fijó, el
// enlace del aviso, el formulario para cambiarlo y su historial.

import { ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Currency, PrecioOrigen } from "@/generated/prisma/enums";
import { formatDate, formatMoney } from "@/lib/format";
import { NOMBRES_PRECIO_ORIGEN } from "@/lib/servicios";
import { AvisoUrlForm, CambiarPrecioForm } from "./comercial-precio-forms";

// Un cambio de precio ya listo para mostrar (sin Decimal: son textos y números simples).
export type CambioDePrecio = {
  id: string;
  fecha: Date; // día de Chile, a medianoche UTC
  anterior: string | null;
  // Moneda del precio anterior (la del cambio previo), para mostrarlo bien.
  monedaAnterior: Currency | null;
  nuevo: string;
  moneda: Currency | null;
  origen: PrecioOrigen | null;
  motivo: string | null;
  autor: string | null;
};

export function ComercialPrecio({
  servicioId,
  abierto,
  precio,
  moneda,
  origenVigente,
  avisoUrl,
  historial,
}: {
  servicioId: string;
  abierto: boolean;
  precio: string | null;
  moneda: Currency | null;
  origenVigente: PrecioOrigen | null;
  avisoUrl: string | null;
  // Del más reciente al más antiguo.
  historial: CambioDePrecio[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Precio</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-2xl font-semibold tabular-nums">
            {precio === null ? "Sin precio" : formatMoney(precio, moneda ?? undefined)}
          </span>
          {origenVigente && <Badge variant="info">{NOMBRES_PRECIO_ORIGEN[origenVigente]}</Badge>}
        </div>

        {avisoUrl ? (
          <a
            href={avisoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex max-w-full items-center gap-1.5 text-sm text-primary underline-offset-4 hover:underline"
          >
            <ExternalLink className="size-3.5 shrink-0" />
            <span className="truncate">Ver el aviso publicado</span>
          </a>
        ) : (
          <p className="text-sm text-muted-foreground">Sin enlace del aviso.</p>
        )}

        {abierto && (
          <>
            <div className="border-t pt-4">
              <CambiarPrecioForm servicioId={servicioId} habiaPrecio={precio !== null} />
            </div>
            <div className="border-t pt-4">
              <AvisoUrlForm servicioId={servicioId} avisoUrl={avisoUrl} />
            </div>
          </>
        )}

        {historial.length > 0 && (
          <div className="border-t pt-4">
            <h3 className="mb-2 text-sm font-medium">Historial de precio</h3>
            <ul className="divide-y rounded-lg border">
              {historial.map((c) => (
                <li key={c.id} className="space-y-0.5 px-3 py-2 text-sm">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <span className="tabular-nums">
                      {c.anterior !== null && (
                        <span className="text-muted-foreground">
                          {formatMoney(c.anterior, c.monedaAnterior ?? undefined)} →{" "}
                        </span>
                      )}
                      <span className="font-medium">{formatMoney(c.nuevo, c.moneda ?? undefined)}</span>
                    </span>
                    <span className="text-xs text-muted-foreground">{formatDate(c.fecha)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {c.origen ? NOMBRES_PRECIO_ORIGEN[c.origen] : "Sin origen"}
                    {c.autor ? ` · registró ${c.autor}` : ""}
                  </p>
                  {c.motivo && <p className="text-xs">{c.motivo}</p>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
