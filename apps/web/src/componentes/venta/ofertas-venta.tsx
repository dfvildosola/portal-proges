// Las ofertas recibidas (o las postulaciones, en una búsqueda de arriendo), de la más reciente a la
// más antigua. El equipo ve quién ofertó y las condiciones, y puede mostrar al dueño las que aún no
// ve. El dueño ve solo las que Proges ya le mostró, con la recomendación.
import type { VentaOferta, VentaOfertaEquipo } from "@proges/contrato";
import { Fecha } from "@/componentes/comunes/fecha";
import { Monto } from "@/componentes/comunes/monto";
import { Vacio } from "@/componentes/comunes/vacio";
import { Insignia, type TonoDeInsignia } from "@/componentes/ui/insignia";
import { formatearMonto, haceCuanto } from "@/lib/formato";
import { BotonMostrarOferta } from "./boton-mostrar-oferta";
import { ETIQUETA_ESTADO_OFERTA, ETIQUETA_RESPUESTA } from "./etiquetas-venta";

// Lo que dice la insignia: no solo el estado de la oferta, también en qué paso va con el dueño.
function situacion(o: VentaOferta): { texto: string; tono: TonoDeInsignia } {
  if (o.estado !== "RECIBIDA") return ETIQUETA_ESTADO_OFERTA[o.estado];
  if (!o.mostradaAlDuenoEl) return { texto: "Sin mostrar al dueño", tono: "neutro" };
  if (!o.respuestaDelDueno) return { texto: "Espera al dueño", tono: "warn" };
  return ETIQUETA_ESTADO_OFERTA.RECIBIDA;
}

export function OfertasVenta({
  ofertas,
  servicioId,
  puedeMostrar,
  modo,
  palabra,
}: {
  ofertas: (VentaOferta | VentaOfertaEquipo)[];
  servicioId: string;
  /** El equipo puede mostrar ofertas al dueño mientras el servicio esté abierto. */
  puedeMostrar: boolean;
  modo: "equipo" | "dueno";
  /** «ofertas» o «postulaciones». */
  palabra: string;
}) {
  if (ofertas.length === 0) {
    return <Vacio texto={`Todavía no hay ${palabra} registradas.`} className="py-5" />;
  }
  return (
    <ul className="flex flex-col gap-2">
      {ofertas.map((o) => {
        const equipo = "oferente" in o ? o : null;
        const estado = situacion(o);
        const sinResponder = o.estado === "RECIBIDA" && o.mostradaAlDuenoEl && !o.respuestaDelDueno;
        return (
          <li key={o.id} className="flex flex-col gap-1 rounded-[10px] bg-scr px-3 py-2.5 text-sm">
            <div className="flex items-center justify-between gap-2">
              <Monto valor={o.monto} className="text-base font-bold" />
              <Insignia tono={estado.tono}>{estado.texto}</Insignia>
            </div>
            <p className="text-xs text-soft">
              <Fecha valor={o.fecha} formato="auto" />
              {equipo && ` · ${equipo.oferente}`}
              {equipo?.nota && ` · ${equipo.nota}`}
            </p>
            {o.respuestaDelDueno && (
              <p className="text-[13px]">
                El dueño {ETIQUETA_RESPUESTA[o.respuestaDelDueno.respuesta]}
                {o.respuestaDelDueno.contraoferta && ` ${formatearMonto(o.respuestaDelDueno.contraoferta)}`}
                <span className="text-soft"> · {haceCuanto(o.respuestaDelDueno.respondidaEl)}</span>
                {equipo?.respondidaPor && <span className="text-soft"> · {equipo.respondidaPor.nombre}</span>}
              </p>
            )}
            {o.recomendacion && (
              <p className="text-[13px]">
                <span className="font-bold">{modo === "dueno" ? "Lo que te recomendamos: " : "Recomendación al dueño: "}</span>
                {o.recomendacion}
              </p>
            )}
            {puedeMostrar && !o.mostradaAlDuenoEl && o.estado === "RECIBIDA" && (
              <div className="pt-1">
                <BotonMostrarOferta servicioId={servicioId} ofertaId={o.id} recomendacionActual={o.recomendacion} />
              </div>
            )}
            {/* ETAPA 3 (portal del dueño): aquí van los botones «Aceptar», «Contraofertar» y «Rechazar»
                cuando `modo === "dueno"` y `sinResponder`. Llaman a POST /v1/ofertas/{id}/responder.
                Todavía no se construyen: el equipo no responde por el dueño. */}
            {modo === "dueno" && sinResponder && (
              <p className="text-xs text-soft">Pronto podrás responder esta oferta desde aquí.</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
