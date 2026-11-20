"use client";
// Crea los cobros de un mes para todos los contratos que lo cubren, para poder marcarlos pagados.
// Se puede pedir más de una vez: los contratos que ya tienen su cobro no se tocan.
import { mesConAnio } from "@/lib/formato";
import { generarCobros } from "./acciones";
import { DialogoConfirmar } from "./dialogo-confirmar";

export function BotonGenerarCobros({ mes }: { mes: string }) {
  return (
    <DialogoConfirmar
      boton="Preparar los cobros del mes"
      variante="contorno"
      titulo={`Cobros de ${mesConAnio(mes)}`}
      pregunta="Se crea un cobro por cada contrato vigente en el mes. Los que ya estaban creados no cambian."
      textoDeEnvio="Preparar cobros"
      accion={generarCobros}
      ocultos={{ mes }}
    />
  );
}
