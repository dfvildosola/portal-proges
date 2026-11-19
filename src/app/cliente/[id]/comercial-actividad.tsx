// Las visitas y las ofertas de un servicio de venta o arriendo. Sin el nombre ni
// el contacto del interesado, y sin el nombre de quien ofertó: esos datos no
// salen de src/lib/cliente.ts.
import { Badge } from "@/components/ui/badge";
import type { OfertaDelCliente, VisitaDelCliente } from "@/lib/cliente";
import { formatDate, formatMoney } from "@/lib/format";
import { NOMBRES_OFERTA_ESTADO } from "@/lib/servicios";
import type { OfertaEstado } from "@/generated/prisma/enums";

const VARIANTE_OFERTA: Record<OfertaEstado, "info" | "success" | "warning" | "secondary"> = {
  RECIBIDA: "info",
  ACEPTADA: "success",
  RECHAZADA: "warning",
  CAIDA: "secondary",
};

export function ComercialActividad({
  visitas,
  ofertas,
}: {
  visitas: VisitaDelCliente[];
  ofertas: OfertaDelCliente[];
}) {
  return (
    <>
      <section>
        <h3 className="mb-2 text-sm font-medium">Visitas ({visitas.length})</h3>
        {visitas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no hay visitas.</p>
        ) : (
          <ul className="divide-y">
            {visitas.map((v, i) => (
              <li key={i} className="flex gap-3 py-2 text-sm first:pt-0 last:pb-0">
                <span className="w-24 shrink-0 font-mono text-xs leading-5 text-muted-foreground">
                  {formatDate(v.fecha)}
                </span>
                <div className="min-w-0 flex-1">
                  {v.evaluacion !== null && <p className="font-medium">Evaluación {v.evaluacion} de 5</p>}
                  {v.comentario && (
                    <p className="break-words text-muted-foreground">{v.comentario}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="mb-2 text-sm font-medium">Ofertas ({ofertas.length})</h3>
        {ofertas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no hay ofertas.</p>
        ) : (
          <ul className="divide-y">
            {ofertas.map((o, i) => (
              <li key={i} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm first:pt-0 last:pb-0">
                <span className="w-24 shrink-0 font-mono text-xs text-muted-foreground">
                  {formatDate(o.fecha)}
                </span>
                <span className="font-mono">{formatMoney(o.monto, o.moneda)}</span>
                <Badge variant={VARIANTE_OFERTA[o.estado]} className="ml-auto">
                  {NOMBRES_OFERTA_ESTADO[o.estado]}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
