"use client";
// Un botón que pide confirmar antes de hacer algo (borrar, terminar un contrato, renovar). Es el
// mismo diálogo de los formularios, pero sin campos: solo la pregunta y dos botones.
import type { ReactNode } from "react";
import { DialogoFormulario } from "@/componentes/comunes/dialogo-formulario";
import type { PropsDeBoton } from "@/componentes/ui/boton";
import type { ResultadoAccion } from "@/lib/acciones";

type Accion = (anterior: ResultadoAccion | null, datos: FormData) => Promise<ResultadoAccion>;

export function DialogoConfirmar({
  boton,
  variante = "fantasma",
  titulo,
  pregunta,
  textoDeEnvio,
  accion,
  ocultos,
}: {
  boton: ReactNode;
  variante?: PropsDeBoton["variante"];
  titulo: string;
  pregunta: string;
  textoDeEnvio: string;
  accion: Accion;
  ocultos: Record<string, string>;
}) {
  return (
    <DialogoFormulario
      boton={boton}
      variante={variante}
      titulo={titulo}
      descripcion={pregunta}
      accion={accion}
      textoDeEnvio={textoDeEnvio}
      ocultos={ocultos}
    >
      {() => null}
    </DialogoFormulario>
  );
}
