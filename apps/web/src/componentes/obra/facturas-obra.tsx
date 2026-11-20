// Las facturas de los maestros asignadas a esta obra. Las de Odoo se leen de Odoo cada vez que se
// mira (número, total, estado y lo pendiente), para no tener dos versiones de lo mismo; las que
// no están en Odoo se anotan a mano y se marcan «Fuera de Odoo». Las cuentas suman las dos clases.
import type { FacturaDeObra } from "@proges/contrato";
import { Fecha } from "@/componentes/comunes/fecha";
import { Monto } from "@/componentes/comunes/monto";
import { Insignia } from "@/componentes/ui/insignia";
import { Tarjeta, TarjetaTitulo } from "@/componentes/ui/tarjeta";
import { AsignarFactura } from "./asignar-factura";
import { ETIQUETA_ESTADO_FACTURA } from "./etiquetas-obra";
import { FormularioFacturaManual } from "./formulario-factura-manual";
import { LineaVacia } from "./linea-vacia";
import { QuitarFactura } from "./quitar-factura";

export function FacturasObra({
  servicioId,
  facturas,
  maestros,
  editable,
}: {
  servicioId: string;
  facturas: FacturaDeObra[];
  maestros: { id: string; nombre: string }[];
  editable: boolean;
}) {
  const botones = editable && (
    <>
      <AsignarFactura servicioId={servicioId} maestros={maestros} />
      <FormularioFacturaManual servicioId={servicioId} maestros={maestros} />
    </>
  );
  // Sin facturas, la sección es una sola línea con sus botones; con ellas, la tarjeta con la lista.
  if (facturas.length === 0) {
    return (
      <LineaVacia titulo="Facturas de maestros" texto="todavía no hay asignadas a esta obra.">
        {botones}
      </LineaVacia>
    );
  }
  return (
    <Tarjeta>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <TarjetaTitulo>Facturas de maestros</TarjetaTitulo>
        {editable && <div className="flex gap-2">{botones}</div>}
      </div>
      <ul className="flex flex-col gap-2">
        {facturas.map((factura) => (
          <li key={factura.id}>
            <Tarjeta tono="item" className="gap-1.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold">
                    {factura.maestro.nombre}
                    {factura.numero && <span className="font-normal text-soft"> · N° {factura.numero}</span>}
                  </p>
                  <p className="text-xs text-soft">
                    <Fecha valor={factura.fecha} formato="auto" />
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <Monto valor={factura.montoAsignado} className="text-sm font-semibold" />
                  <div className="flex flex-wrap justify-end gap-1">
                    {factura.origen === "manual" ? <Insignia tono="warn">Fuera de Odoo</Insignia> : <Insignia tono="ink">Odoo</Insignia>}
                    {factura.estado && <Insignia tono={factura.estado === "anulada" ? "bad" : "neutro"}>{ETIQUETA_ESTADO_FACTURA[factura.estado]}</Insignia>}
                    {factura.origen === "manual" && (
                      <Insignia tono={factura.pagada ? "ok" : "neutro"}>{factura.pagada ? "Pagada" : "Sin pagar"}</Insignia>
                    )}
                  </div>
                </div>
              </div>
              {factura.origen === "odoo" && !factura.sinDatosDeOdoo && factura.totalOdoo && (
                <p className="text-xs text-soft">
                  Total de la factura en Odoo: <Monto valor={factura.totalOdoo} /> · Por pagar según Odoo: <Monto valor={factura.pendiente} />
                </p>
              )}
              {factura.sinDatosDeOdoo && (
                <p className="text-xs text-warn">No se pudo leer esta factura en Odoo: se cuenta como facturada y no como pagada.</p>
              )}
              {factura.nota && <p className="text-xs">{factura.nota}</p>}
              {editable && (
                <div className="flex justify-end">
                  <QuitarFactura servicioId={servicioId} facturaId={factura.id} />
                </div>
              )}
            </Tarjeta>
          </li>
        ))}
      </ul>
    </Tarjeta>
  );
}
