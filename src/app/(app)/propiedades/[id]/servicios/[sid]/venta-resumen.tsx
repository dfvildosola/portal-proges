// Resumen de arriba del proyecto de VENTA o ARRIENDO, solo para el EQUIPO: lo que
// hay que saber de un vistazo antes de llamar a alguien. Precio vigente con sus últimos
// cambios, días publicada, visitas, ofertas vigentes y el enlace del aviso.
//
// Es un Server Component que carga lo suyo. Los indicadores salen de
// `indicadoresComerciales` (src/lib/servicios.ts), el mismo cálculo del panel comercial y
// de la vista del cliente: acá no se calcula nada de nuevo.

import { ExternalLink } from "lucide-react";
import { db } from "@/lib/db";
import { espaciosQueLee } from "@/lib/org";
import { usuarioActual } from "@/lib/sesion";
import { hoyChile } from "@/lib/fechas";
import { formatDate, formatMoney } from "@/lib/format";
import { diaChile, esComercial, indicadoresComerciales } from "@/lib/servicios";
import { Card, CardContent } from "@/components/ui/card";

// Cuántos cambios de precio se muestran: el resumen es corto, el historial completo está más abajo.
const CAMBIOS_VISIBLES = 3;

function Dato({ titulo, valor, detalle }: { titulo: string; valor: string; detalle?: string }) {
  return (
    <div className="rounded-lg border px-3 py-2">
      <p className="text-xs text-muted-foreground">{titulo}</p>
      <p className="text-xl font-semibold tabular-nums">{valor}</p>
      {detalle && <p className="text-xs text-muted-foreground">{detalle}</p>}
    </div>
  );
}

// Uso: <VentaResumen servicioEnCursoId={s.id} />. No muestra nada si quien mira no es del
// equipo, si el proyecto no se puede leer o si no es de venta ni de arriendo.
export async function VentaResumen({ servicioEnCursoId }: { servicioEnCursoId: string }) {
  const usuario = await usuarioActual();
  if (!usuario || usuario.rol !== "EQUIPO") return null;

  const servicio = await db.servicioEnCurso.findFirst({
    where: { id: servicioEnCursoId, organizationId: { in: await espaciosQueLee() } },
    select: {
      tipo: true,
      precio: true,
      precioMoneda: true,
      avisoUrl: true,
      cerradoEl: true,
      eventos: {
        orderBy: { fecha: "asc" },
        select: {
          id: true,
          tipo: true,
          fecha: true,
          anterior: true,
          nuevo: true,
          moneda: true,
          // Si la etapa ya no existe, el evento cuenta como no publicado.
          etapa: { select: { propiedadPublicada: true } },
        },
      },
      visitas: { select: { fecha: true } },
      ofertas: {
        where: { estado: "RECIBIDA" },
        orderBy: [{ fecha: "desc" }, { createdAt: "desc" }],
        select: { id: true, fecha: true, monto: true, moneda: true, oferente: true },
      },
    },
  });
  if (!servicio || !esComercial(servicio.tipo)) return null;

  const hoy = hoyChile();
  const eventosDePrecio = servicio.eventos.filter((e) => e.tipo === "PRECIO");
  const indicadores = indicadoresComerciales({
    eventosDeEtapa: servicio.eventos
      .filter((e) => e.tipo === "ETAPA")
      .map((e) => ({ fecha: e.fecha, publicada: e.etapa?.propiedadPublicada ?? false })),
    eventosDePrecio: eventosDePrecio.map((e) => ({
      fecha: e.fecha,
      anterior: e.anterior === null ? null : Number(e.anterior),
      nuevo: Number(e.nuevo),
      moneda: e.moneda ?? "",
    })),
    visitas: servicio.visitas,
    hoy,
    cerradoEl: servicio.cerradoEl,
  });

  // Del cambio más reciente al más antiguo. Un cambio que ya trae «anterior» muestra la flecha.
  const cambios = eventosDePrecio.slice(-CAMBIOS_VISIBLES).reverse();
  const precio =
    servicio.precio === null ? "Sin precio" : formatMoney(servicio.precio.toFixed(), servicio.precioMoneda ?? undefined);

  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p className="text-2xl font-semibold tabular-nums">{precio}</p>
          {servicio.avisoUrl ? (
            <a
              href={servicio.avisoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-9 max-w-full items-center gap-1.5 text-sm text-primary underline-offset-4 hover:underline"
            >
              <ExternalLink className="size-3.5 shrink-0" />
              <span className="truncate">Ver el aviso publicado</span>
            </a>
          ) : (
            <p className="text-sm text-muted-foreground">Sin enlace del aviso.</p>
          )}
        </div>

        {cambios.length > 0 && (
          <ul className="space-y-0.5 text-xs text-muted-foreground">
            {cambios.map((c) => (
              <li key={c.id} className="tabular-nums">
                {formatDate(diaChile(c.fecha))}:{" "}
                {c.anterior !== null && <>{formatMoney(c.anterior, c.moneda ?? undefined)} → </>}
                {formatMoney(c.nuevo, c.moneda ?? undefined)}
              </li>
            ))}
          </ul>
        )}

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Dato titulo="Días publicada" valor={String(indicadores.diasPublicada)} />
          <Dato
            titulo="Visitas, última semana"
            valor={String(indicadores.visitasUltimaSemana)}
            detalle={`${servicio.visitas.length} en total`}
          />
          <Dato
            titulo="Ofertas vigentes"
            valor={String(servicio.ofertas.length)}
            detalle={servicio.ofertas.length === 0 ? "sin ofertas recibidas" : undefined}
          />
          <Dato
            titulo="Desde la última rebaja"
            valor={indicadores.diasDesdeUltimaRebaja === null ? "—" : `${indicadores.diasDesdeUltimaRebaja} d`}
            detalle={indicadores.diasDesdeUltimaRebaja === null ? "sin rebajas" : undefined}
          />
        </div>

        {servicio.ofertas.length > 0 && (
          <ul className="divide-y rounded-lg border text-sm">
            {servicio.ofertas.map((o) => (
              <li key={o.id} className="flex flex-wrap items-baseline justify-between gap-x-3 px-3 py-2">
                <span className="font-medium tabular-nums">{formatMoney(o.monto.toFixed(), o.moneda)}</span>
                <span className="text-xs text-muted-foreground">
                  {o.oferente} · {formatDate(o.fecha)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
