// Tarjeta de una propiedad en el panel: dirección, y debajo cada servicio abierto
// con su etapa (y el precio si es venta o arriendo). Toda la tarjeta es un enlace
// al detalle.
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { propertyTypeLabels } from "@/lib/domain";
import { formatMoney } from "@/lib/format";
import type { PropiedadDelPanel } from "@/lib/cliente";
import { TIPOS_SERVICIO } from "@/lib/servicios";

export function PropiedadTarjeta({ propiedad }: { propiedad: PropiedadDelPanel }) {
  return (
    <Link
      href={`/cliente/${propiedad.id}`}
      className="block rounded-xl outline-none transition-shadow hover:ring-2 hover:ring-ring/40 focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="break-words">{propiedad.direccion}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {propertyTypeLabels[propiedad.tipo]} · {propiedad.comuna}
          </p>
        </CardHeader>
        <CardContent>
          {propiedad.servicios.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin servicios abiertos.</p>
          ) : (
            <ul className="divide-y">
              {propiedad.servicios.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{TIPOS_SERVICIO[s.tipo].nombre}</p>
                    <p className="truncate text-xs text-muted-foreground">{s.nombre}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant="info">{s.etapa}</Badge>
                    {s.precio && (
                      <span className="font-mono text-xs">
                        {formatMoney(s.precio.monto, s.precio.moneda)}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
