// Cuánto se demora cada tipo de servicio, separando los días en que Proges está trabajando
// (azul) de los días esperando a otros (amarillo): conservador, notaría, maestro, dueño…
import type { ResultadosDiasPorTipo } from "@proges/contrato";
import { Vacio } from "@/componentes/comunes/vacio";
import { ETIQUETA_TIPO_SERVICIO } from "@/lib/etiquetas";
import { decimal } from "./periodo";

export function DiasPorTipo({ tipos }: { tipos: ResultadosDiasPorTipo[] }) {
  if (tipos.length === 0) return <Vacio texto="No se cerró ningún servicio en este período." />;
  const mayor = Math.max(...tipos.map((t) => t.diasTrabajando + t.diasEsperando), 1);

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2.5">
        {tipos.map((t) => {
          const total = t.diasTrabajando + t.diasEsperando;
          return (
            <li key={t.tipo} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 sm:grid-cols-[130px_minmax(0,1fr)_auto]">
              <span className="text-[13px] font-semibold">
                {ETIQUETA_TIPO_SERVICIO[t.tipo]} <span className="font-normal text-soft">({t.servicios})</span>
              </span>
              <span className="order-3 col-span-2 flex h-2.5 overflow-hidden rounded-full bg-line sm:order-none sm:col-span-1">
                <i className="block bg-ink" style={{ width: `${(t.diasTrabajando / mayor) * 100}%` }} />
                <i className="block bg-warn" style={{ width: `${(t.diasEsperando / mayor) * 100}%` }} />
              </span>
              <span className="text-right font-mono text-xs tabular-nums">
                {decimal(total)} d
                <span className="block text-[11px] text-soft">
                  {decimal(t.diasTrabajando)} trabajando · {decimal(t.diasEsperando)} esperando
                </span>
              </span>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-soft">
        <span className="font-bold text-ink">■</span> Trabajando · <span className="font-bold text-warn">■</span> Esperando a otros. Entre paréntesis, cuántos servicios terminados entran en el promedio.
      </p>
    </div>
  );
}
