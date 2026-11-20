// La cabecera de la obra para el equipo: avance ponderado de toda la obra, cuántas partidas están
// recibidas y las dos fechas (con aviso si ya pasó la que se le prometió al dueño).
import type { ObraEquipo } from "@proges/contrato";
import { Fecha } from "@/componentes/comunes/fecha";
import { Insignia } from "@/componentes/ui/insignia";
import { Tarjeta } from "@/componentes/ui/tarjeta";
import { hoyChile } from "@/lib/formato";
import { BarraAvance } from "./barra-avance";
import { FormularioFechas } from "./formulario-fechas";

export function ResumenObra({ obra, editable }: { obra: ObraEquipo; editable: boolean }) {
  const { recepcion } = obra;
  // Como las fechas son AAAA-MM-DD, compararlas como texto basta.
  const atrasada = editable && obra.fechaComprometida !== null && obra.fechaComprometida < hoyChile();
  return (
    <Tarjeta>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold">Avance ponderado</span>
        <b className="text-lg">{Math.round(obra.avance)} %</b>
      </div>
      <BarraAvance valor={obra.avance} />
      <p className="text-xs text-soft">
        {recepcion.total === 0
          ? "Todavía no hay partidas."
          : `${recepcion.conformes} de ${recepcion.total} partidas recibidas conformes` +
            (recepcion.observadas > 0 ? ` · ${recepcion.observadas} observadas` : "") +
            (recepcion.pendientes > 0 ? ` · ${recepcion.pendientes} por recibir` : "")}
      </p>
      {editable ? (
        <FormularioFechas
          key={`${obra.inicioObra}|${obra.fechaComprometida}`}
          servicioId={obra.servicioId}
          inicioObra={obra.inicioObra}
          fechaComprometida={obra.fechaComprometida}
        />
      ) : (
        <p className="text-sm">
          Empezó el <Fecha valor={obra.inicioObra} formato="conAnio" /> · se prometió terminar el{" "}
          <Fecha valor={obra.fechaComprometida} formato="conAnio" />
        </p>
      )}
      {atrasada && <Insignia tono="bad">Ya pasó la fecha que se le prometió al dueño</Insignia>}
    </Tarjeta>
  );
}
