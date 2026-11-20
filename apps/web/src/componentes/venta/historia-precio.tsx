// La historia del precio publicado: cada cambio con su fecha, de qué precio a cuál, y, para el
// equipo, el motivo y quién lo anotó. Del más nuevo al más antiguo. El dueño ve las fechas y los
// montos; el motivo y el autor vienen solo en lo que la API entrega al equipo.
import type { VentaCambioPrecio, VentaCambioPrecioEquipo } from "@proges/contrato";
import { Fecha } from "@/componentes/comunes/fecha";
import { Monto } from "@/componentes/comunes/monto";
import { Vacio } from "@/componentes/comunes/vacio";
import { ETIQUETA_ORIGEN_PRECIO } from "./etiquetas-venta";

export function HistoriaPrecio({ historia }: { historia: (VentaCambioPrecio | VentaCambioPrecioEquipo)[] }) {
  if (historia.length === 0) return <Vacio texto="Todavía no se ha fijado un precio." className="py-4" />;
  return (
    <ol className="flex flex-col gap-2">
      {[...historia].reverse().map((cambio, i) => {
        const motivo = "motivo" in cambio ? cambio.motivo : null;
        const autor = "autor" in cambio ? cambio.autor : null;
        return (
          <li key={`${cambio.fecha}-${i}`} className="flex flex-col gap-0.5 rounded-[10px] bg-scr px-3 py-2 text-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <span className="font-bold">
                {cambio.anterior && (
                  <>
                    <Monto valor={cambio.anterior} className="font-normal text-soft line-through" /> →{" "}
                  </>
                )}
                <Monto valor={cambio.nuevo} />
              </span>
              <Fecha valor={cambio.fecha} formato="conAnio" className="text-xs text-soft" />
            </div>
            <span className="text-xs text-soft">
              {cambio.origen ? ETIQUETA_ORIGEN_PRECIO[cambio.origen] : null}
              {autor ? ` · anotó ${autor}` : null}
            </span>
            {motivo && <span className="text-[13px]">{motivo}</span>}
          </li>
        );
      })}
    </ol>
  );
}
