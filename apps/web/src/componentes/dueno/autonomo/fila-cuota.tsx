// Una cuota de las contribuciones: el año, cuál de las cuatro es, cuánto y si ya se pagó.
import type { Contribucion } from "@proges/contrato";
import { Fecha } from "@/componentes/comunes/fecha";
import { Monto } from "@/componentes/comunes/monto";
import { Insignia } from "@/componentes/ui/insignia";
import { Tarjeta } from "@/componentes/ui/tarjeta";
import { BorrarAnotacion } from "./borrar-anotacion";
import { FormularioContribucion } from "./formulario-contribucion";
import { MarcarPagado } from "./marcar-pagado";

export function FilaCuota({ cuota, direccion, hoy }: { cuota: Contribucion; direccion: string; hoy: string }) {
  const pagada = cuota.estado === "PAGADA";
  const nombre = `Contribuciones ${cuota.anio}, cuota ${cuota.cuota}`;
  const vencida = !pagada && cuota.fechaVencimiento < hoy;
  return (
    <Tarjeta tono="item" className="gap-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-bold">{nombre}</p>
          <p className="text-xs text-soft">
            {direccion} · {cuota.monto ? <Monto valor={cuota.monto} /> : "sin monto todavía"} ·{" "}
            {pagada && cuota.fechaPago ? (
              <>
                pagada el <Fecha valor={cuota.fechaPago} formato="conAnio" />
              </>
            ) : (
              <>
                vence el <Fecha valor={cuota.fechaVencimiento} formato="conAnio" />
              </>
            )}
          </p>
        </div>
        <Insignia tono={pagada ? "ok" : vencida ? "bad" : "neutro"}>{pagada ? "Pagada" : vencida ? "Vencida" : "Por pagar"}</Insignia>
      </div>
      <div className="-mx-1 flex flex-wrap items-center gap-1">
        {!pagada && <MarcarPagado recurso="contribuciones" id={cuota.id} descripcion={`${nombre}, ${direccion}.`} hoy={hoy} />}
        <FormularioContribucion cuota={cuota} hoy={hoy} />
        <BorrarAnotacion recurso="contribuciones" id={cuota.id} descripcion={`${nombre}, ${direccion}`} />
      </div>
    </Tarjeta>
  );
}
