// Un contrato de arriendo: quién arrienda qué, por cuánto, hasta cuándo, y lo que se puede hacer
// con él (corregirlo, renovarlo, terminarlo). Los plazos los calcula la API; aquí solo se escriben.
import type { Contrato } from "@proges/contrato";
import { Fecha } from "@/componentes/comunes/fecha";
import { Monto } from "@/componentes/comunes/monto";
import { Insignia } from "@/componentes/ui/insignia";
import { Tarjeta } from "@/componentes/ui/tarjeta";
import { AccionesDeContrato } from "./acciones-contrato";
import { ETIQUETA_ESTADO_CONTRATO, ETIQUETA_REAJUSTE } from "./etiquetas";
import { FormularioContrato } from "./formulario-contrato";

export function TarjetaContrato({ contrato, hoy }: { contrato: Contrato; hoy: string }) {
  const estado = ETIQUETA_ESTADO_CONTRATO[contrato.estado];
  const terminado = contrato.estado === "TERMINADO";
  return (
    <Tarjeta tono="item" className="gap-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-bold text-balance">{contrato.propiedadDireccion}</p>
          <p className="text-xs text-soft">{contrato.arrendatarioNombre}</p>
        </div>
        <div className="flex items-center gap-2">
          <Monto valor={contrato.monto} className="text-sm font-bold" />
          <span className="text-xs text-soft">al mes</span>
          <Insignia tono={estado.tono}>{estado.texto}</Insignia>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
        <div>
          <dt className="text-soft">Desde</dt>
          <dd className="font-semibold">
            <Fecha valor={contrato.fechaInicio} formato="conAnio" />
          </dd>
        </div>
        <div>
          <dt className="text-soft">{contrato.fechaSalida ? "Sale el" : "Plazo actual hasta"}</dt>
          <dd className="font-semibold">
            <Fecha valor={contrato.fechaSalida ?? contrato.terminoVigente} formato="conAnio" />
          </dd>
        </div>
        <div>
          <dt className="text-soft">Se paga el día</dt>
          <dd className="font-semibold">{contrato.diaPago}</dd>
        </div>
        <div>
          <dt className="text-soft">Reajuste</dt>
          <dd className="font-semibold">
            {contrato.proximoReajuste ? (
              <>
                {ETIQUETA_REAJUSTE[contrato.reajusteTipo]}, el <Fecha valor={contrato.proximoReajuste} formato="conAnio" />
              </>
            ) : (
              ETIQUETA_REAJUSTE[contrato.reajusteTipo]
            )}
          </dd>
        </div>
      </dl>
      {!terminado && !contrato.fechaSalida && (
        <p className="text-xs text-soft">
          {contrato.renovacionAutomatica ? "Se renueva sola; " : "No se renueva sola; "}
          el último día para avisar es el <Fecha valor={contrato.limiteAviso} formato="conAnio" />.
        </p>
      )}
      {!terminado && (
        <div className="-mx-1 flex flex-wrap items-center gap-1">
          <FormularioContrato contrato={contrato} hoy={hoy} />
          <AccionesDeContrato contrato={contrato} hoy={hoy} />
        </div>
      )}
    </Tarjeta>
  );
}
