// Las cuatro cifras de arriba del panel de venta: precio, días publicada, visitas y consultas, y
// ofertas con la mejor. Y, si el dueño tiene algo pendiente, el aviso de que se le espera.
// Sirve igual para el equipo y para el dueño: todo viene ya recortado por la API.
import type { VentaOferta, VentaReporte } from "@proges/contrato";
import { Monto } from "@/componentes/comunes/monto";
import { Tarjeta } from "@/componentes/ui/tarjeta";
import { formatearMonto, haceCuanto } from "@/lib/formato";

function Cifra({ grande, texto }: { grande: React.ReactNode; texto: string }) {
  return (
    <Tarjeta tono="item" className="gap-1">
      <div className="text-xl font-extrabold tracking-tight">{grande}</div>
      <div className="text-xs text-soft">{texto}</div>
    </Tarjeta>
  );
}

/** La oferta que el dueño ya vio y todavía no responde (la más antigua espera hace más). */
function ofertaEsperandoAlDueno(ofertas: VentaOferta[]): VentaOferta | undefined {
  return ofertas.find((o) => o.estado === "RECIBIDA" && o.mostradaAlDuenoEl && !o.respuestaDelDueno);
}

export function IndicadoresVenta({
  reporte,
  modo,
  palabraOferta,
}: {
  reporte: VentaReporte;
  modo: "equipo" | "dueno";
  /** «ofertas» en una venta, «postulaciones» en una búsqueda de arriendo. */
  palabraOferta: string;
}) {
  const esperando = ofertaEsperandoAlDueno(reporte.ofertas);
  const dias = reporte.diasPublicada;
  return (
    <div className="flex flex-col gap-3">
      {reporte.esperaRespuestaDueno && (
        <p className="rounded-[10px] bg-warn-soft px-3 py-2 text-sm font-semibold text-warn">
          {modo === "dueno"
            ? esperando
              ? `Hay una oferta de ${formatearMonto(esperando.monto)} esperando tu respuesta.`
              : "Hay algo esperando tu respuesta."
            : esperando?.mostradaAlDuenoEl
              ? `Esperando al dueño: responder la oferta de ${formatearMonto(esperando.monto)} (se la mostramos ${haceCuanto(esperando.mostradaAlDuenoEl)}).`
              : "Esperando al dueño."}
        </p>
      )}
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Cifra grande={<Monto valor={reporte.precio} />} texto="precio publicado" />
        <Cifra
          grande={dias === null ? "—" : `${dias} d`}
          texto={dias === null ? "sin anuncios todavía" : "publicada"}
        />
        <Cifra
          grande={reporte.totales.visitas}
          texto={`visitas · ${reporte.totales.consultas} consultas`}
        />
        <Cifra
          grande={reporte.ofertas.length}
          texto={
            reporte.mejorOferta
              ? `${palabraOferta} · la mejor ${formatearMonto(reporte.mejorOferta.monto)}`
              : palabraOferta
          }
        />
      </div>
    </div>
  );
}
