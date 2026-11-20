"use client";
// El botón para un pago mal anotado: borra los pagos del cobro y lo deja pendiente otra vez.
import type { Cobro } from "@proges/contrato";
import { mesConAnio } from "@/lib/formato";
import { deshacerPagoDeCobro } from "./acciones";
import { DialogoConfirmar } from "./dialogo-confirmar";

export function DeshacerPago({ cobro }: { cobro: Cobro }) {
  return (
    <DialogoConfirmar
      boton="Deshacer el pago"
      variante="fantasma"
      titulo="Deshacer el pago"
      pregunta={`${cobro.propiedadDireccion}, ${mesConAnio(cobro.periodo)}. Se borra lo pagado y el cobro vuelve a quedar por pagar. Después puedes anotar el pago de nuevo.`}
      textoDeEnvio="Sí, deshacer"
      accion={deshacerPagoDeCobro}
      ocultos={{ id: cobro.id }}
    />
  );
}
