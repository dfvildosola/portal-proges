// Panel comercial de un servicio de VENTA o ARRIENDO: indicadores, precio con
// su historial, visitas, ofertas y la recomendación al propietario.
//
// Es un Server Component que carga sus propios datos: la página del servicio
// solo le pasa el id. Los indicadores salen de `indicadoresComerciales` (el
// mismo cálculo que usa el panel del cliente), no se calculan acá.

import { db } from "@/lib/db";
import { espaciosQueLee, ORG_PROGES } from "@/lib/org";
import { usuarioActual } from "@/lib/sesion";
import { hoyChile } from "@/lib/fechas";
import { toDateInputValue } from "@/lib/format";
import { diaChile, esComercial, indicadoresComerciales } from "@/lib/servicios";
import { Card, CardContent } from "@/components/ui/card";
import { ComercialPrecio, type CambioDePrecio } from "./comercial-precio";
import { ComercialVisitas } from "./comercial-visitas";
import { ComercialOfertas } from "./comercial-ofertas";
import { ComercialRecomendacion } from "./comercial-recomendacion";

function Indicador({ titulo, valor, detalle }: { titulo: string; valor: string; detalle?: string }) {
  return (
    <Card size="sm">
      <CardContent>
        <p className="text-xs text-muted-foreground">{titulo}</p>
        <p className="text-xl font-semibold tabular-nums">{valor}</p>
        {detalle && <p className="text-xs text-muted-foreground">{detalle}</p>}
      </CardContent>
    </Card>
  );
}

export async function ComercialPanel({ servicioId }: { servicioId: string }) {
  const orgIds = await espaciosQueLee();
  const usuario = await usuarioActual();

  const servicio = await db.servicioEnCurso.findFirst({
    where: { id: servicioId, organizationId: { in: orgIds } },
    include: {
      eventos: {
        orderBy: { fecha: "asc" },
        include: {
          // La marca «propiedad publicada» sale de la etapa del evento. Si la
          // etapa ya no existe (SetNull), el evento cuenta como no publicado.
          etapa: { select: { propiedadPublicada: true } },
          autor: { select: { nombre: true } },
        },
      },
      visitas: {
        orderBy: [{ fecha: "desc" }, { createdAt: "desc" }],
        include: { realizadaPor: { select: { nombre: true } } },
      },
      ofertas: { orderBy: [{ fecha: "desc" }, { createdAt: "desc" }] },
    },
  });
  if (!servicio || !esComercial(servicio.tipo)) return null;

  const abierto = servicio.estado === "ABIERTO";
  const hoy = hoyChile();

  // Los cambios de precio, del más antiguo al más nuevo (así cada uno sabe la
  // moneda del anterior).
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
    visitas: servicio.visitas.map((v) => ({ fecha: v.fecha })),
    hoy,
    cerradoEl: servicio.cerradoEl,
  });

  const historial: CambioDePrecio[] = eventosDePrecio
    .map((e, i) => ({
      id: e.id,
      fecha: diaChile(e.fecha),
      anterior: e.anterior,
      monedaAnterior: i > 0 ? eventosDePrecio[i - 1].moneda : null,
      nuevo: e.nuevo,
      moneda: e.moneda,
      origen: e.origen,
      motivo: e.motivo,
      autor: e.autor?.nombre ?? null,
    }))
    .reverse();

  // Quién fijó el precio vigente: el origen del último cambio de precio.
  const origenVigente = eventosDePrecio.at(-1)?.origen ?? null;

  // Las personas que pueden figurar como quien hizo la visita.
  const equipo = abierto
    ? await db.usuario.findMany({
        // El equipo vive en el espacio de Proges, no en el del cliente.
        where: { organizationId: ORG_PROGES, rol: "EQUIPO", activo: true },
        orderBy: { nombre: "asc" },
        select: { id: true, nombre: true },
      })
    : [];

  const hoyTexto = toDateInputValue(hoy);

  return (
    <div className="space-y-4">
      {!abierto && (
        <p className="rounded-lg border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          Este servicio ya está cerrado: se puede mirar, pero no modificar.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador titulo="Días publicada" valor={String(indicadores.diasPublicada)} />
        <Indicador titulo="Visitas, última semana" valor={String(indicadores.visitasUltimaSemana)} />
        <Indicador
          titulo="Visitas por semana"
          valor={indicadores.visitasPorSemana.toLocaleString("es-CL")}
          detalle="promedio de 4 semanas"
        />
        <Indicador
          titulo="Días desde la última rebaja"
          valor={indicadores.diasDesdeUltimaRebaja === null ? "—" : String(indicadores.diasDesdeUltimaRebaja)}
          detalle={indicadores.diasDesdeUltimaRebaja === null ? "sin rebajas" : undefined}
        />
      </div>

      <ComercialPrecio
        servicioId={servicio.id}
        abierto={abierto}
        precio={servicio.precio ? servicio.precio.toFixed() : null}
        moneda={servicio.precioMoneda}
        origenVigente={origenVigente}
        avisoUrl={servicio.avisoUrl}
        historial={historial}
      />

      <ComercialVisitas
        servicioId={servicio.id}
        abierto={abierto}
        visitas={servicio.visitas.map((v) => ({
          id: v.id,
          fecha: v.fecha,
          hechaPor: v.realizadaPor?.nombre ?? null,
          interesadoNombre: v.interesadoNombre,
          interesadoContacto: v.interesadoContacto,
          evaluacion: v.evaluacion,
          comentario: v.comentario,
        }))}
        hoy={hoyTexto}
        equipo={equipo}
        usuarioId={usuario?.id ?? ""}
      />

      <ComercialOfertas
        servicioId={servicio.id}
        abierto={abierto}
        ofertas={servicio.ofertas.map((o) => ({
          id: o.id,
          fecha: o.fecha,
          monto: o.monto.toFixed(),
          moneda: o.moneda,
          oferente: o.oferente,
          estado: o.estado,
          nota: o.nota,
        }))}
        hoy={hoyTexto}
      />

      <ComercialRecomendacion
        servicioId={servicio.id}
        abierto={abierto}
        recomendacion={servicio.recomendacion}
        fecha={servicio.recomendacionFecha}
      />
    </div>
  );
}
