// El bloque de la orden de Odoo: el contrato con el dueño. Si todavía no se enlazó, el formulario
// para enlazarla; si ya está, su número, lo que se le cobra y cuándo se trajo.
import type { ObraEquipo } from "@proges/contrato";
import { Fecha } from "@/componentes/comunes/fecha";
import { Monto } from "@/componentes/comunes/monto";
import { Tarjeta, TarjetaTitulo } from "@/componentes/ui/tarjeta";
import { ActualizarOrden } from "./actualizar-orden";
import { FormularioOrden } from "./formulario-orden";

export function OrdenObra({ servicioId, orden, editable }: { servicioId: string; orden: ObraEquipo["orden"]; editable: boolean }) {
  return (
    <Tarjeta>
      <TarjetaTitulo>
        <span>Orden de Odoo</span>
        {orden && <span className="font-mono normal-case">{orden.numero}</span>}
      </TarjetaTitulo>
      {!orden ? (
        editable ? (
          <>
            <p className="text-sm text-soft">Todavía no se enlaza la orden. Primero se revisa y después se confirma.</p>
            <FormularioOrden servicioId={servicioId} />
          </>
        ) : (
          <p className="text-sm text-soft">Este servicio no tiene una orden de Odoo enlazada.</p>
        )
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs text-soft">Se le cobra al dueño</dt>
              <dd><Monto valor={orden.total} /></dd>
            </div>
            <div>
              <dt className="text-xs text-soft">Ya facturado al dueño</dt>
              <dd><Monto valor={orden.facturadoAlDueno} /></dd>
            </div>
            <div>
              <dt className="text-xs text-soft">Traída de Odoo</dt>
              <dd><Fecha valor={orden.traidaEl} formato="relativa" /></dd>
            </div>
          </dl>
          {editable && <ActualizarOrden servicioId={servicioId} />}
        </>
      )}
    </Tarjeta>
  );
}
