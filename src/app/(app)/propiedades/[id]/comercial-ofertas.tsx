// Sección «Ofertas» del panel comercial: la lista, el cambio de estado y el
// formulario para registrar una nueva.
//
// Cambiar el estado de una oferta NO mueve la etapa del servicio: si una oferta
// se acepta o se cae, una persona mueve la etapa a mano (decisión del plan).

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Currency, OfertaEstado } from "@/generated/prisma/enums";
import { formatDate, formatMoney } from "@/lib/format";
import { NOMBRES_OFERTA_ESTADO } from "@/lib/servicios";
import { cambiarEstadoOferta } from "../comercial-actions";
import { RegistrarOfertaForm } from "./comercial-oferta-form";

export type OfertaFila = {
  id: string;
  fecha: Date;
  monto: string;
  moneda: Currency;
  oferente: string;
  estado: OfertaEstado;
  nota: string | null;
};

const VARIANTE_ESTADO: Record<OfertaEstado, "info" | "success" | "warning" | "secondary"> = {
  RECIBIDA: "info",
  ACEPTADA: "success",
  RECHAZADA: "warning",
  CAIDA: "secondary",
};

export function ComercialOfertas({
  servicioId,
  abierto,
  ofertas,
  hoy,
}: {
  servicioId: string;
  abierto: boolean;
  // De la más reciente a la más antigua.
  ofertas: OfertaFila[];
  hoy: string;
}) {
  const estados = Object.keys(NOMBRES_OFERTA_ESTADO) as OfertaEstado[];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ofertas ({ofertas.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {abierto && <RegistrarOfertaForm servicioId={servicioId} hoy={hoy} />}

        {ofertas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no hay ofertas.</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {ofertas.map((o) => (
              <li key={o.id} className="space-y-2 px-3 py-2 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <span className="font-medium tabular-nums">{formatMoney(o.monto, o.moneda)}</span>
                  <Badge variant={VARIANTE_ESTADO[o.estado]}>{NOMBRES_OFERTA_ESTADO[o.estado]}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {o.oferente} · {formatDate(o.fecha)}
                </p>
                {o.nota && <p className="text-sm break-words">{o.nota}</p>}
                {abierto && (
                  <form action={cambiarEstadoOferta} className="flex flex-wrap items-center gap-1.5">
                    <input type="hidden" name="servicioId" value={servicioId} />
                    <input type="hidden" name="ofertaId" value={o.id} />
                    <span className="text-xs text-muted-foreground">Marcar como:</span>
                    {estados
                      .filter((e) => e !== o.estado)
                      .map((e) => (
                        <Button key={e} type="submit" name="estado" value={e} variant="outline" size="xs">
                          {NOMBRES_OFERTA_ESTADO[e]}
                        </Button>
                      ))}
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
