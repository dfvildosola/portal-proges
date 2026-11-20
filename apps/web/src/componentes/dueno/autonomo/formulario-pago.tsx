"use client";
// Anotar que el arrendatario pagó (o abonó) un cobro. Parte con el saldo completo y la fecha de
// hoy: lo normal es que pague todo, y si paga menos queda anotado como abono.
import type { Cobro } from "@proges/contrato";
import { CampoFormulario } from "@/componentes/comunes/campo-formulario";
import { DialogoFormulario } from "@/componentes/comunes/dialogo-formulario";
import { AreaTexto } from "@/componentes/ui/area-texto";
import { CampoTexto } from "@/componentes/ui/campo-texto";
import { formatearMonto, mesConAnio } from "@/lib/formato";
import { pagarCobro } from "./acciones";
import { CampoMonto } from "./campo-monto";

export function FormularioPago({ cobro, hoy }: { cobro: Cobro; hoy: string }) {
  return (
    <DialogoFormulario
      boton="Marcar pagado"
      variante="suave"
      titulo="Anotar el pago"
      descripcion={`${cobro.propiedadDireccion}, ${mesConAnio(cobro.periodo)}. Falta pagar ${formatearMonto(cobro.saldo)}.`}
      accion={pagarCobro}
      textoDeEnvio="Anotar pago"
      ocultos={{ id: cobro.id }}
    >
      {(errorDe) => (
        <>
          <CampoFormulario etiqueta="Día en que pagó" error={errorDe("fechaPago")}>
            <CampoTexto name="fechaPago" type="date" defaultValue={hoy} required />
          </CampoFormulario>
          <CampoMonto
            etiqueta="Cuánto pagó"
            nombre="montoPagado"
            error={errorDe("montoPagado")}
            valor={cobro.saldo.valor}
            moneda={cobro.saldo.moneda}
            monedaFija
            obligatorio
            ayuda="Si paga menos de lo que falta, queda como abono."
          />
          <CampoFormulario etiqueta="Nota (opcional)" error={errorDe("notas")}>
            <AreaTexto name="notas" rows={2} />
          </CampoFormulario>
        </>
      )}
    </DialogoFormulario>
  );
}
