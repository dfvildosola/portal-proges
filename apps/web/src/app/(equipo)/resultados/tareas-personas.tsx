// Tareas hechas a tiempo, por persona: la barra es el porcentaje y debajo va el detalle
// (a tiempo, tarde y vencidas sin hacer). Por debajo de 70 % la barra se pinta de amarillo.
import type { ResultadosTareasPersona } from "@proges/contrato";
import { Vacio } from "@/componentes/comunes/vacio";
import { cn } from "@/lib/utils";
import { decimal } from "./periodo";

const BAJO_ESTE_PORCENTAJE = 70;

export function TareasPersonas({ personas }: { personas: ResultadosTareasPersona[] }) {
  if (personas.length === 0) return <Vacio texto="Nadie tuvo tareas con fecha en este período." />;

  return (
    <ul className="flex flex-col gap-3">
      {personas.map((p) => (
        <li key={p.usuarioId} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 sm:grid-cols-[110px_minmax(0,1fr)_56px]">
          <span className="truncate text-[13px] font-semibold">{p.nombre}</span>
          <span className="order-3 col-span-2 block h-2.5 overflow-hidden rounded-full bg-line sm:order-none sm:col-span-1" aria-hidden>
            <i
              className={cn("block h-full", p.porcentajeATiempo !== null && p.porcentajeATiempo < BAJO_ESTE_PORCENTAJE ? "bg-warn" : "bg-ink")}
              style={{ width: `${p.porcentajeATiempo ?? 0}%` }}
            />
          </span>
          <span className="text-right font-mono text-xs tabular-nums">{p.porcentajeATiempo === null ? "—" : `${decimal(p.porcentajeATiempo)} %`}</span>
          <span className="order-4 col-span-2 text-[11.5px] text-soft sm:col-span-3 sm:col-start-2">
            {p.porcentajeATiempo === null ? "Ninguna tarea ha vencido todavía. " : ""}
            {p.hechasATiempo} a tiempo · {p.hechasTarde} tarde · {p.vencidasSinHacer} vencidas sin hacer
          </span>
        </li>
      ))}
    </ul>
  );
}
