"use client";
// Un botón que abre una ventana con un formulario adentro y la cierra sola cuando se guarda bien.
// Lo usan casi todos los formularios de la ficha (editar datos, agregar una unidad, subir un
// documento…), para que todos se vean y se comporten igual.
//
// El formulario vive dentro de la ventana: al cerrarla se descarta, y al abrirla otra vez parte
// limpio, sin el error de la vez anterior. Si algo falla, la ventana queda abierta con el mensaje
// de la API y lo que la persona escribió.
import { useState, type ReactNode } from "react";
import { ErrorDeFormulario } from "@/componentes/comunes/error-de-formulario";
import { Boton, type PropsDeBoton } from "@/componentes/ui/boton";
import { Dialogo, DialogoContenido, DialogoDescripcion, DialogoDisparador, DialogoTitulo } from "@/componentes/ui/dialogo";
import type { ResultadoAccion } from "@/lib/acciones";
import { useFormulario } from "@/lib/usar-formulario";
import { cn } from "@/lib/utils";

type Accion = (anterior: ResultadoAccion | null, datos: FormData) => Promise<ResultadoAccion>;

type Props = {
  titulo: string;
  descripcion?: string;
  /** El texto del botón que abre la ventana. */
  textoBoton: ReactNode;
  variante?: PropsDeBoton["variante"];
  tamano?: PropsDeBoton["tamano"];
  textoGuardar?: string;
  accion: Accion;
  /** Los campos. Recibe `errorDe` para mostrar el error de cada campo. */
  campos: (errorDe: (campo: string) => string | undefined) => ReactNode;
  /** Ventana más ancha, para formularios con varias columnas. */
  ancho?: boolean;
};

export function DialogoDeFormulario({ textoBoton, variante = "contorno", tamano = "chico", ...resto }: Props) {
  const [abierto, setAbierto] = useState(false);
  return (
    <Dialogo open={abierto} onOpenChange={setAbierto}>
      <DialogoDisparador render={<Boton variante={variante} tamano={tamano} />}>{textoBoton}</DialogoDisparador>
      <DialogoContenido className={cn(resto.ancho && "max-w-xl")}>
        <Cuerpo {...resto} cerrar={() => setAbierto(false)} />
      </DialogoContenido>
    </Dialogo>
  );
}

function Cuerpo({
  titulo,
  descripcion,
  textoGuardar = "Guardar",
  accion,
  campos,
  cerrar,
}: Omit<Props, "textoBoton" | "variante" | "tamano" | "ancho"> & { cerrar: () => void }) {
  const { formProps, pendiente, errorGeneral, errorDe } = useFormulario(accion, { alExito: cerrar, vaciarAlExito: false });
  return (
    <>
      <DialogoTitulo>{titulo}</DialogoTitulo>
      {descripcion && <DialogoDescripcion>{descripcion}</DialogoDescripcion>}
      <form {...formProps} className="flex flex-col gap-3">
        {campos(errorDe)}
        <ErrorDeFormulario mensaje={errorGeneral} />
        <Boton type="submit" disabled={pendiente}>
          {pendiente ? "Guardando…" : textoGuardar}
        </Boton>
      </form>
    </>
  );
}
