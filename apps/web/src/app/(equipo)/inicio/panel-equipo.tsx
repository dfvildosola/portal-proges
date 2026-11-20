// «El equipo esta semana»: una barra por persona con cuántas tareas abiertas tiene; la parte roja
// son las atrasadas. La barra más larga es la de quien tiene más carga (así se comparan entre sí).
import type { CargaDePersona } from "@proges/contrato";
import { Vacio } from "@/componentes/comunes/vacio";
import { Tarjeta, TarjetaTitulo } from "@/componentes/ui/tarjeta";

export function PanelEquipo({ carga }: { carga: CargaDePersona[] }) {
  const mayor = Math.max(1, ...carga.map((c) => c.abiertas));
  return (
    <Tarjeta>
      <TarjetaTitulo>
        <span>El equipo esta semana</span>
        <span className="font-semibold normal-case tracking-normal">abiertas · atrasadas</span>
      </TarjetaTitulo>
      {carga.length === 0 ? (
        <Vacio texto="Todavía no hay personas en el equipo." className="py-6" />
      ) : (
        <ul className="flex flex-col gap-2">
          {carga.map((c) => {
            const normales = c.abiertas - c.atrasadas;
            return (
              <li key={c.persona.id} className="grid grid-cols-[84px_minmax(0,1fr)_auto] items-center gap-2 text-[13px]">
                <span className="truncate font-semibold">{c.persona.nombre}</span>
                <span className="flex h-2.5 overflow-hidden rounded-full bg-line" aria-hidden>
                  <i className="block bg-ink" style={{ width: `${(normales / mayor) * 100}%` }} />
                  <i className="block bg-bad" style={{ width: `${(c.atrasadas / mayor) * 100}%` }} />
                </span>
                <span className="text-xs text-soft tabular-nums">
                  {c.abiertas}
                  {c.atrasadas > 0 && <span className="font-bold text-bad"> · {c.atrasadas}</span>}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Tarjeta>
  );
}
