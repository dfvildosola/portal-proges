// La franja de un servicio abierto que dice quién tiene la pelota, en palabras del dueño:
// «Ahora esperamos al Conservador, desde el 6 nov». Si lo que se espera es la respuesta del propio
// dueño se pinta en ámbar y se dice claro, porque ahí el servicio depende de él.
import type { Esperando } from "@proges/contrato";
import { Fecha } from "@/componentes/comunes/fecha";
import { cn } from "@/lib/utils";
import { ESPERAMOS } from "./etiquetas-atendido";

export function BandaDeEspera({ esperando }: { esperando: Esperando | null }) {
  if (!esperando) {
    return (
      <p className="rounded-xl bg-ink-soft p-3.5 text-sm font-semibold text-ink">
        Ahora lo estamos trabajando nosotros. Te avisamos cuando haya novedades.
      </p>
    );
  }
  const aTi = esperando.a === "DUENO";
  const quien = esperando.a === "OTRO" && esperando.detalle ? esperando.detalle : ESPERAMOS[esperando.a];
  return (
    <div className={cn("rounded-xl p-3.5 text-sm font-semibold", aTi ? "bg-warn-soft text-warn" : "bg-ink-soft text-ink")}>
      <p>
        {aTi ? "Estamos esperando tu respuesta" : `Ahora esperamos ${quien}`}
        {", desde el "}
        <Fecha valor={esperando.desde} formato="corta" />
        {esperando.dias > 0 && ` (${esperando.dias} ${esperando.dias === 1 ? "día" : "días"})`}
      </p>
      {esperando.detalle && esperando.a !== "OTRO" && <p className="mt-0.5 font-normal">{esperando.detalle}</p>}
    </div>
  );
}
