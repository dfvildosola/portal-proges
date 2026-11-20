// Una cuenta de una propiedad (luz, agua, gasto común…): qué es, de qué mes, cuánto y si ya se pagó.
import type { Gasto } from "@proges/contrato";
import { Fecha } from "@/componentes/comunes/fecha";
import { Monto } from "@/componentes/comunes/monto";
import { Insignia } from "@/componentes/ui/insignia";
import { Tarjeta } from "@/componentes/ui/tarjeta";
import { mesConAnio } from "@/lib/formato";
import { BorrarAnotacion } from "./borrar-anotacion";
import { ETIQUETA_CUENTA } from "./etiquetas";
import { FormularioGasto } from "./formulario-gasto";
import { MarcarPagado } from "./marcar-pagado";

export function FilaGasto({ gasto, direccion, hoy }: { gasto: Gasto; direccion: string; hoy: string }) {
  const pagada = gasto.estado === "PAGADA";
  const nombre = `${ETIQUETA_CUENTA[gasto.tipo]} de ${mesConAnio(gasto.periodo)}`;
  const vencida = !pagada && gasto.fechaVencimiento < hoy;
  return (
    <Tarjeta tono="item" className="gap-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-bold">{nombre}</p>
          <p className="text-xs text-soft">
            {direccion} · {gasto.monto ? <Monto valor={gasto.monto} /> : "sin monto todavía"} ·{" "}
            {pagada && gasto.fechaPago ? (
              <>
                pagada el <Fecha valor={gasto.fechaPago} formato="conAnio" />
              </>
            ) : (
              <>
                vence el <Fecha valor={gasto.fechaVencimiento} formato="conAnio" />
              </>
            )}
          </p>
          {gasto.notas && <p className="mt-0.5 text-xs text-soft">{gasto.notas}</p>}
        </div>
        <Insignia tono={pagada ? "ok" : vencida ? "bad" : "neutro"}>{pagada ? "Pagada" : vencida ? "Vencida" : "Por pagar"}</Insignia>
      </div>
      <div className="-mx-1 flex flex-wrap items-center gap-1">
        {!pagada && <MarcarPagado recurso="gastos" id={gasto.id} descripcion={`${nombre}, ${direccion}.`} hoy={hoy} />}
        <FormularioGasto gasto={gasto} hoy={hoy} />
        <BorrarAnotacion recurso="gastos" id={gasto.id} descripcion={`${nombre}, ${direccion}`} />
      </div>
    </Tarjeta>
  );
}
