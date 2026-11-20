"use client";
// Un botón que pide confirmar antes de hacer algo que no se deshace a la ligera (aprobar un
// presupuesto, quitar una factura). Es la pregunta «¿seguro?» del cajero automático.
import { useState, type ReactNode } from "react";
import { ErrorDeFormulario } from "@/componentes/comunes/error-de-formulario";
import { Boton, type PropsDeBoton } from "@/componentes/ui/boton";
import {
  Dialogo,
  DialogoCerrar,
  DialogoContenido,
  DialogoDescripcion,
  DialogoDisparador,
  DialogoPie,
  DialogoTitulo,
} from "@/componentes/ui/dialogo";
import type { ResultadoAccion } from "@/lib/acciones";
import { useAccionDirecta } from "./usar-accion-directa";

export function DialogoConfirmar({
  boton,
  variante = "contorno",
  tamano = "chico",
  titulo,
  descripcion,
  textoConfirmar,
  varianteConfirmar = "principal",
  accion,
}: {
  boton: ReactNode;
  variante?: PropsDeBoton["variante"];
  tamano?: PropsDeBoton["tamano"];
  titulo: string;
  descripcion: string;
  textoConfirmar: string;
  varianteConfirmar?: PropsDeBoton["variante"];
  accion: () => Promise<ResultadoAccion>;
}) {
  const [abierto, setAbierto] = useState(false);
  const { pendiente, error, ejecutar, limpiarError } = useAccionDirecta();

  function alCambiar(valor: boolean) {
    setAbierto(valor);
    if (!valor) limpiarError();
  }

  return (
    <Dialogo open={abierto} onOpenChange={alCambiar}>
      <DialogoDisparador render={<Boton variante={variante} tamano={tamano} />}>{boton}</DialogoDisparador>
      <DialogoContenido>
        <DialogoTitulo>{titulo}</DialogoTitulo>
        <DialogoDescripcion>{descripcion}</DialogoDescripcion>
        <ErrorDeFormulario mensaje={error} />
        <DialogoPie>
          <DialogoCerrar render={<Boton variante="contorno" />}>Cancelar</DialogoCerrar>
          <Boton variante={varianteConfirmar} disabled={pendiente} onClick={() => ejecutar(accion, () => setAbierto(false))}>
            {pendiente ? "Guardando…" : textoConfirmar}
          </Boton>
        </DialogoPie>
      </DialogoContenido>
    </Dialogo>
  );
}
