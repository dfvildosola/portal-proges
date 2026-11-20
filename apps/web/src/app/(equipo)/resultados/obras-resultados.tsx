// Las obras: lo que se aprobó pagarle a los maestros contra lo que ya facturaron, y cuánto queda
// de margen. Arriba va la barra de lo aprobado y abajo la de lo facturado (roja si se pasó).
//
// Los montos se escriben con <Monto>. El largo de las barras sí necesita un número, pero solo para
// dibujar la proporción: ningún total ni comparación que se muestre sale de ahí (eso lo calcula la API).
import type { ResultadosObra } from "@proges/contrato";
import { Monto } from "@/componentes/comunes/monto";
import { Vacio } from "@/componentes/comunes/vacio";
import { Insignia } from "@/componentes/ui/insignia";
import { Tarjeta } from "@/componentes/ui/tarjeta";
import { cn } from "@/lib/utils";

const aNumero = (monto: { valor: string }) => Number(monto.valor);

export function ObrasResultados({ obras }: { obras: ResultadosObra[] }) {
  if (obras.length === 0) return <Vacio texto="No hay obras en este período." />;
  const mayor = Math.max(...obras.flatMap((o) => [aNumero(o.costoAprobado), aNumero(o.facturado)]), 1);

  return (
    <div className="flex flex-col gap-2.5">
      <ul className="flex flex-col gap-2">
        {obras.map((o) => {
          const sePaso = aNumero(o.facturado) > aNumero(o.costoAprobado);
          return (
            <li key={o.servicioId}>
              <Tarjeta tono="item" className="gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[13px] font-bold">
                    {o.propiedad} <span className="font-normal text-soft">· {o.clienteNombre}</span>
                  </span>
                  <Insignia tono={o.estado === "TERMINADO" ? "ok" : "ink"}>{o.estado === "TERMINADO" ? "Terminada" : "En curso"}</Insignia>
                </div>
                <div className="flex flex-col gap-1" aria-hidden>
                  <span className="block h-2 overflow-hidden rounded-full bg-line">
                    <i className="block h-full bg-soft/50" style={{ width: `${(aNumero(o.costoAprobado) / mayor) * 100}%` }} />
                  </span>
                  <span className="block h-2 overflow-hidden rounded-full bg-line">
                    <i className={cn("block h-full", sePaso ? "bg-bad" : "bg-ok")} style={{ width: `${(aNumero(o.facturado) / mayor) * 100}%` }} />
                  </span>
                </div>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs sm:grid-cols-4">
                  <Dato nombre="Aprobado" valor={<Monto valor={o.costoAprobado} />} />
                  <Dato nombre="Facturado" valor={<Monto valor={o.facturado} />} />
                  <Dato nombre="Diferencia" valor={<Monto valor={o.diferencia} className={cn(sePaso && "font-bold text-bad")} />} />
                  <Dato nombre="Margen" valor={<Monto valor={o.margen} />} />
                </dl>
                {o.precioDueno === null && <p className="text-xs text-soft">Todavía no tiene orden de venta al dueño: no se puede calcular el margen.</p>}
              </Tarjeta>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-soft">Barra de arriba: lo aprobado a los maestros. Barra de abajo: lo facturado; roja si se pasó de lo aprobado.</p>
    </div>
  );
}

function Dato({ nombre, valor }: { nombre: string; valor: React.ReactNode }) {
  return (
    <div>
      <dt className="text-soft">{nombre}</dt>
      <dd>{valor}</dd>
    </div>
  );
}
