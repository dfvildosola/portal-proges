"use client";
// El botón para un cobro mal generado. Solo aparece en un cobro sin pagos: si tiene alguno, primero
// se deshace el pago (la API tampoco deja borrarlo).
import type { Cobro } from "@proges/contrato";
import { mesConAnio } from "@/lib/formato";
import { borrarCobro } from "./acciones";
import { DialogoConfirmar } from "./dialogo-confirmar";

export function BorrarCobro({ cobro }: { cobro: Cobro }) {
  return (
    <DialogoConfirmar
      boton="Borrar el cobro"
      variante="fantasma"
      titulo="Borrar el cobro"
      pregunta={`${cobro.propiedadDireccion}, ${mesConAnio(cobro.periodo)}. Se borra del todo y no se puede deshacer; si fue un error, puedes volver a prepararlo desde «Cobros».`}
      textoDeEnvio="Sí, borrar"
      accion={borrarCobro}
      ocultos={{ id: cobro.id }}
    />
  );
}
