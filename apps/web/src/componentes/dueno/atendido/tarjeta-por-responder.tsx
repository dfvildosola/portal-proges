// Una oferta que Proges le mostró al dueño y espera su respuesta: el monto, lo que Proges
// recomienda y los tres botones. El dueño decide aquí; la lista completa de ofertas está en el
// seguimiento del servicio.
import Link from "next/link";
import { Fecha } from "@/componentes/comunes/fecha";
import { Monto } from "@/componentes/comunes/monto";
import { Insignia } from "@/componentes/ui/insignia";
import { Tarjeta } from "@/componentes/ui/tarjeta";
import { nombreDelServicio } from "./etiquetas-atendido";
import type { OfertaPorResponder } from "./ofertas-pendientes";
import { ResponderOferta } from "./responder-oferta";

export function TarjetaPorResponder({ item, conEnlace }: { item: OfertaPorResponder; conEnlace: boolean }) {
  const { servicio, propiedad, oferta } = item;
  const palabra = servicio.tipo === "ARRIENDO" ? "postulación" : "oferta";
  return (
    <Tarjeta className="border-warn">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-soft">
            {nombreDelServicio(servicio.tipo)} · {propiedad.direccion}
          </p>
          <p className="text-lg font-extrabold">
            <Monto valor={oferta.monto} />
          </p>
          <p className="text-xs text-soft">
            {palabra === "oferta" ? "Oferta" : "Postulación"} del <Fecha valor={oferta.fecha} formato="auto" />
          </p>
        </div>
        <Insignia tono="warn">Espera tu respuesta</Insignia>
      </div>
      {oferta.recomendacion && (
        <p className="rounded-[10px] bg-scr px-3 py-2 text-[13px]">
          <span className="font-bold">Lo que te recomendamos: </span>
          {oferta.recomendacion}
        </p>
      )}
      <ResponderOferta ofertaId={oferta.id} monto={oferta.monto} palabra={palabra} />
      {conEnlace && (
        <Link href={`/mi/servicios/${encodeURIComponent(servicio.id)}`} className="w-fit text-xs font-bold text-ink hover:underline">
          Ver cómo va la venta
        </Link>
      )}
    </Tarjeta>
  );
}
