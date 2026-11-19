import { ArrowRight } from "lucide-react";
import type { Currency, EventoTipo, PrecioOrigen } from "@/generated/prisma/enums";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/format";
import { NOMBRES_PRECIO_ORIGEN } from "@/lib/servicios";

export type EventoFila = {
  id: string;
  tipo: EventoTipo;
  anterior: string | null;
  nuevo: string;
  moneda: Currency | null;
  origen: PrecioOrigen | null;
  motivo: string | null;
  fecha: Date;
  autor: { nombre: string } | null;
};

// Un Evento guarda fecha y hora (un instante): se muestra en hora de Chile, igual
// en el Mac y en producción (que corre en UTC).
const fechaHoraChile = new Intl.DateTimeFormat("es-CL", {
  timeZone: "America/Santiago",
  dateStyle: "short",
  timeStyle: "short",
});

// En un evento de precio el valor viaja como texto: se le da formato de plata con su moneda.
function textoDeValor(e: EventoFila, valor: string | null): string {
  if (valor === null) return "—";
  return e.tipo === "PRECIO" ? formatMoney(valor, e.moneda ?? undefined) : valor;
}

// El historial del servicio: todos sus eventos (cambios de etapa y de precio), del más
// nuevo al más viejo. Los eventos llegan ya ordenados.
export function ServicioHistorial({ eventos }: { eventos: EventoFila[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Historial</CardTitle>
      </CardHeader>
      <CardContent>
        {eventos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no hay cambios registrados.</p>
        ) : (
          <ol className="divide-y">
            {eventos.map((e) => (
              <li key={e.id} className="space-y-1 py-3 first:pt-0 last:pb-0">
                <p className="text-xs text-muted-foreground">
                  {fechaHoraChile.format(e.fecha)} · {e.autor ? e.autor.nombre : "Sin autor"} ·{" "}
                  {e.tipo === "PRECIO" ? "Precio" : "Etapa"}
                </p>
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                  {e.anterior !== null && (
                    <>
                      <span className="text-muted-foreground">{textoDeValor(e, e.anterior)}</span>
                      <ArrowRight className="size-3.5 text-muted-foreground" />
                    </>
                  )}
                  <span className="font-medium">{textoDeValor(e, e.nuevo)}</span>
                </p>
                {e.tipo === "PRECIO" && e.origen && (
                  <p className="text-xs text-muted-foreground">{NOMBRES_PRECIO_ORIGEN[e.origen]}</p>
                )}
                {e.motivo && <p className="text-sm">{e.motivo}</p>}
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
