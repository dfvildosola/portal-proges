// El historial de «esperando a»: cada vez que la pelota cambió de lado, quién lo hizo y cuándo.
// Va plegado (un <details>) porque se consulta pocas veces.
import type { CambioDeEspera, EsperandoA } from "@proges/contrato";
import { diaChile, horaChile } from "@/lib/formato";
import { ETIQUETA_ESPERANDO_A } from "@/lib/etiquetas";
import { Fecha } from "@/componentes/comunes/fecha";

const nombreDe = (a: EsperandoA | null) => (a ? ETIQUETA_ESPERANDO_A[a].toLowerCase() : "nos toca");

export function HistorialDeEspera({ cambios }: { cambios: CambioDeEspera[] }) {
  if (cambios.length === 0) return null;
  return (
    <details className="group rounded-xl border border-line bg-card p-3.5">
      <summary className="cursor-pointer text-xs font-bold tracking-[0.07em] text-soft uppercase">
        Historial de «esperando a» ({cambios.length})
      </summary>
      <ul className="mt-3 flex flex-col gap-2.5">
        {cambios.map((c) => (
          <li key={`${c.fecha}-${c.a ?? "nos-toca"}`} className="text-[13px]">
            <span className="font-semibold">
              De {nombreDe(c.de)} a {nombreDe(c.a)}
            </span>
            {c.detalle ? <span className="text-soft"> · {c.detalle}</span> : null}
            <span className="block text-xs text-soft">
              <Fecha valor={diaChile(c.fecha)} formato="conDia" /> {horaChile(c.fecha)}
              {c.autor ? ` · ${c.autor.nombre}` : ""}
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}
