// La obra como la ve el dueño: la orden (lo que se le cobra), cómo va el avance y qué partidas ya
// se recibieron. Nada del maestro, ni presupuestos, ni facturas, ni márgenes: la API ya no se los
// entrega y este componente tampoco tiene dónde dibujarlos.
import type { ObraDueno } from "@proges/contrato";
import { Monto } from "@/componentes/comunes/monto";
import { Seccion } from "@/componentes/comunes/seccion";
import { Vacio } from "@/componentes/comunes/vacio";
import { Insignia } from "@/componentes/ui/insignia";
import { Tarjeta, TarjetaTitulo } from "@/componentes/ui/tarjeta";
import { BarraAvance } from "./barra-avance";
import { ETIQUETA_RECEPCION_DUENO, TONO_RECEPCION } from "./etiquetas-obra";

export function VistaObraDueno({ obra }: { obra: ObraDueno }) {
  const { recepcion } = obra;
  return (
    <Seccion titulo="Obra" derecha={<span className="text-xs text-soft">avance de tu propiedad</span>}>
      <div className="flex flex-col gap-3">
        <Tarjeta>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm font-semibold">Avance de la obra</span>
            <b className="text-lg">{Math.round(obra.avance)} %</b>
          </div>
          <BarraAvance valor={obra.avance} />
          <p className="text-xs text-soft">
            {recepcion.total === 0
              ? "Todavía no hay partidas."
              : `${recepcion.conformes} de ${recepcion.total} partidas recibidas` +
                (recepcion.observadas > 0 ? ` · ${recepcion.observadas} con observaciones` : "") +
                (recepcion.pendientes > 0 ? ` · ${recepcion.pendientes} por recibir` : "")}
          </p>
          {obra.orden && (
            <dl className="mt-1 grid grid-cols-2 gap-2 text-sm">
              <div>
                <dt className="text-xs text-soft">Orden {obra.orden.numero}</dt>
                <dd><Monto valor={obra.orden.total} /></dd>
              </div>
              <div>
                <dt className="text-xs text-soft">Ya pagado como anticipo</dt>
                <dd><Monto valor={obra.orden.anticipado} /></dd>
              </div>
            </dl>
          )}
        </Tarjeta>

        {obra.recintos.length === 0 ? (
          <Vacio texto="Todavía no hay partidas de obra para mostrar." />
        ) : (
          obra.recintos.map((recinto) => (
            <Tarjeta key={recinto.nombre ?? "sin-recinto"}>
              <TarjetaTitulo>
                <span>{recinto.nombre ?? "Otras partidas"}</span>
                <span>{Math.round(recinto.avance)} %</span>
              </TarjetaTitulo>
              <BarraAvance valor={recinto.avance} />
              <ul className="flex flex-col gap-1.5">
                {recinto.partidas.map((partida) => (
                  <li key={partida.id}>
                    <Tarjeta tono="item" className="flex-row items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold">{partida.descripcion}</p>
                        {partida.cantidad && (
                          <p className="text-xs text-soft">
                            {partida.cantidad} {partida.unidad ?? ""}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className="font-mono text-sm tabular-nums">{partida.avance} %</span>
                        <Insignia tono={TONO_RECEPCION[partida.recepcion]}>{ETIQUETA_RECEPCION_DUENO[partida.recepcion]}</Insignia>
                      </div>
                    </Tarjeta>
                  </li>
                ))}
              </ul>
            </Tarjeta>
          ))
        )}
      </div>
    </Seccion>
  );
}
