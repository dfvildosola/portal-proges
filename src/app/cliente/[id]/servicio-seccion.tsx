// Un servicio de la propiedad: su nombre, su etapa y, si es venta o arriendo,
// todo lo comercial (indicadores, precio, historial, visitas, ofertas y la
// recomendación de Proges). Solo muestra; no hay formularios.
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ServicioDelDetalle } from "@/lib/cliente";
import { formatDate } from "@/lib/format";
import { NOMBRES_ESTADO, TIPOS_SERVICIO } from "@/lib/servicios";
import { ComercialActividad } from "./comercial-actividad";
import { ComercialIndicadores } from "./comercial-indicadores";
import { ComercialPrecio } from "./comercial-precio";

export function ServicioSeccion({ servicio }: { servicio: ServicioDelDetalle }) {
  const { comercial } = servicio;
  const abierto = servicio.estado === "ABIERTO";

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle>{TIPOS_SERVICIO[servicio.tipo].nombre}</CardTitle>
            <CardDescription>{servicio.nombre}</CardDescription>
          </div>
          <Badge variant={abierto ? "info" : "success"}>
            {abierto ? servicio.etapa : NOMBRES_ESTADO[servicio.estado]}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Abierto el {formatDate(servicio.abiertoEl)}
          {servicio.cerradoEl && ` · terminado el ${formatDate(servicio.cerradoEl)}`}
        </p>
      </CardHeader>

      {comercial && (
        <CardContent className="space-y-6">
          <ComercialIndicadores indicadores={comercial.indicadores} />
          <ComercialPrecio
            precio={comercial.precio}
            cambios={comercial.cambiosDePrecio}
          />

          {comercial.recomendacion && (
            <section>
              <h3 className="mb-2 text-sm font-medium">Recomendación de Proges</h3>
              <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                <p className="whitespace-pre-line break-words">{comercial.recomendacion.texto}</p>
                {comercial.recomendacion.fecha && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {formatDate(comercial.recomendacion.fecha)}
                  </p>
                )}
              </div>
            </section>
          )}

          <ComercialActividad visitas={comercial.visitas} ofertas={comercial.ofertas} />

          {comercial.cambiosDeEtapa.length > 0 && (
            <section>
              <h3 className="mb-2 text-sm font-medium">Historial de etapas</h3>
              <ol className="space-y-1 text-sm">
                {comercial.cambiosDeEtapa.map((c, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="w-24 shrink-0 font-mono text-xs leading-5 text-muted-foreground">
                      {formatDate(c.fecha)}
                    </span>
                    <span>{c.etapa}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </CardContent>
      )}
    </Card>
  );
}
