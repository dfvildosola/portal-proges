"use client";
// Un botón que abre una ventana con un formulario adentro. El formulario va como contenido y, al
// guardar bien, llama a `useCerrarDialogo()` para cerrar la ventana. El contenido solo existe
// mientras la ventana está abierta, así que cada vez que se abre el formulario parte limpio (sin
// errores ni textos de la vez anterior).
import { createContext, useContext, useState, type ReactNode } from "react";
import { Boton, type PropsDeBoton } from "@/componentes/ui/boton";
import { Dialogo, DialogoContenido, DialogoDescripcion, DialogoDisparador, DialogoTitulo } from "@/componentes/ui/dialogo";

const CerrarContexto = createContext<() => void>(() => {});

/** Para los formularios que viven dentro de un `DialogoDeFormulario`: cierra la ventana. */
export function useCerrarDialogo(): () => void {
  return useContext(CerrarContexto);
}

export function DialogoDeFormulario({
  etiqueta,
  titulo,
  descripcion,
  variante = "fantasma",
  tamano = "chico",
  children,
}: {
  etiqueta: ReactNode;
  titulo: string;
  descripcion?: string;
  variante?: PropsDeBoton["variante"];
  tamano?: PropsDeBoton["tamano"];
  children: ReactNode;
}) {
  const [abierto, setAbierto] = useState(false);
  return (
    <Dialogo open={abierto} onOpenChange={setAbierto}>
      <DialogoDisparador render={<Boton variante={variante} tamano={tamano} />}>{etiqueta}</DialogoDisparador>
      <DialogoContenido>
        <DialogoTitulo>{titulo}</DialogoTitulo>
        {descripcion && <DialogoDescripcion>{descripcion}</DialogoDescripcion>}
        <CerrarContexto.Provider value={() => setAbierto(false)}>{children}</CerrarContexto.Provider>
      </DialogoContenido>
    </Dialogo>
  );
}
