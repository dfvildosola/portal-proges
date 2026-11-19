// El precio vigente y cómo ha cambiado. Muestra quién lo fijó (el propietario o
// Proges lo sugirió), pero no la persona del equipo ni el motivo del cambio.
import type { CambioDePrecio } from "@/lib/cliente";
import type { Currency } from "@/generated/prisma/enums";
import { formatDate, formatMoney } from "@/lib/format";
import { NOMBRES_PRECIO_ORIGEN } from "@/lib/servicios";

export function ComercialPrecio({
  precio,
  cambios,
}: {
  precio: { monto: number; moneda: Currency } | null;
  cambios: CambioDePrecio[];
}) {
  return (
    <section>
      <h3 className="mb-2 text-sm font-medium">Precio</h3>
      <p className="font-mono text-xl font-semibold">
        {precio ? formatMoney(precio.monto, precio.moneda) : "Sin precio todavía"}
      </p>

      {cambios.length > 0 && (
        <ol className="mt-3 space-y-2 text-sm">
          {/* El más reciente arriba. */}
          {[...cambios].reverse().map((c, i) => (
            <li key={i} className="flex gap-3">
              <span className="w-24 shrink-0 font-mono text-xs leading-5 text-muted-foreground">
                {formatDate(c.fecha)}
              </span>
              <div className="min-w-0">
                <p className="font-mono">
                  {c.anterior === null ? "" : `${formatMoney(c.anterior, c.moneda)} → `}
                  {formatMoney(c.nuevo, c.moneda)}
                </p>
                {c.origen && (
                  <p className="text-xs text-muted-foreground">{NOMBRES_PRECIO_ORIGEN[c.origen]}</p>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
