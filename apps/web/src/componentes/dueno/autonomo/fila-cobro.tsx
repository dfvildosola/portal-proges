// Un cobro de arriendo (el de un mes de un contrato) con su estado y, si falta pagarlo, el botón
// para anotar el pago. El estado «Atrasado» lo pone la API según la fecha de hoy.
import type { Cobro } from "@proges/contrato";
import { Fecha } from "@/componentes/comunes/fecha";
import { Monto } from "@/componentes/comunes/monto";
import { Insignia } from "@/componentes/ui/insignia";
import { Tarjeta } from "@/componentes/ui/tarjeta";
import { mesConAnio } from "@/lib/formato";
import { ETIQUETA_ESTADO_COBRO } from "./etiquetas";
import { FormularioPago } from "./formulario-pago";

export function FilaCobro({ cobro, hoy }: { cobro: Cobro; hoy: string }) {
  const estado = ETIQUETA_ESTADO_COBRO[cobro.estado];
  const pagado = cobro.estado === "PAGADO";
  return (
    <Tarjeta tono="item" className="gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-sm font-bold text-balance">
          {cobro.propiedadDireccion} · {mesConAnio(cobro.periodo)}
        </span>
        <span className="text-xs text-soft">
          {cobro.arrendatarioNombre} · <Monto valor={cobro.montoEsperado} />
          {pagado && cobro.fechaPago ? (
            <>
              {" · pagado el "}
              <Fecha valor={cobro.fechaPago} formato="conAnio" />
            </>
          ) : (
            <>
              {" · vence el "}
              <Fecha valor={cobro.fechaVencimiento} formato="conAnio" />
            </>
          )}
          {cobro.parcial && cobro.montoPagado && (
            <>
              {" · abonado "}
              <Monto valor={cobro.montoPagado} />, falta <Monto valor={cobro.saldo} />
            </>
          )}
        </span>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Insignia tono={cobro.parcial && !pagado ? "warn" : estado.tono}>{cobro.parcial && !pagado ? "Abono parcial" : estado.texto}</Insignia>
        {!pagado && <FormularioPago cobro={cobro} hoy={hoy} />}
      </div>
    </Tarjeta>
  );
}
