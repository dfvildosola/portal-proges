"use client";
// Un botón que abre un diálogo con un formulario y lo cierra solo cuando se guardó bien. Los
// formularios de la obra y de la venta comparten esta forma: lo único que cambia son los campos,
// que llegan como función para poder mostrar el error de cada uno.
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
import { useFormulario } from "@/lib/usar-formulario";

type Accion = (anterior: ResultadoAccion | null, datos: FormData) => Promise<ResultadoAccion>;

export function DialogoFormulario({
  boton,
  variante = "contorno",
  tamano = "chico",
  titulo,
  descripcion,
  accion,
  textoDeEnvio,
  ocultos,
  bloqueado = false,
  children,
}: {
  /** El texto del botón que abre el diálogo. */
  boton: ReactNode;
  variante?: PropsDeBoton["variante"];
  tamano?: PropsDeBoton["tamano"];
  titulo: string;
  descripcion?: string;
  accion: Accion;
  textoDeEnvio: string;
  /** Datos que viajan sin que la persona los vea (el id del servicio, de la partida…). */
  ocultos: Record<string, string>;
  /** true mientras algo del formulario no está listo (por ejemplo, fotos que se están achicando). */
  bloqueado?: boolean;
  /** Los campos. Recibe la función que da el error de cada campo. */
  children: (errorDe: (campo: string) => string | undefined) => ReactNode;
}) {
  const [abierto, setAbierto] = useState(false);
  const { formProps, pendiente, errorGeneral, errorDe } = useFormulario(accion, { alExito: () => setAbierto(false) });

  return (
    <Dialogo open={abierto} onOpenChange={setAbierto}>
      <DialogoDisparador render={<Boton variante={variante} tamano={tamano} />}>{boton}</DialogoDisparador>
      <DialogoContenido>
        <DialogoTitulo>{titulo}</DialogoTitulo>
        {descripcion && <DialogoDescripcion>{descripcion}</DialogoDescripcion>}
        <form {...formProps} className="flex flex-col gap-3">
          {Object.entries(ocultos).map(([nombre, valor]) => (
            <input key={nombre} type="hidden" name={nombre} value={valor} />
          ))}
          {children(errorDe)}
          <ErrorDeFormulario mensaje={errorGeneral} />
          <DialogoPie>
            <DialogoCerrar render={<Boton variante="contorno" />}>Cancelar</DialogoCerrar>
            <Boton type="submit" disabled={pendiente || bloqueado}>
              {pendiente ? "Guardando…" : textoDeEnvio}
            </Boton>
          </DialogoPie>
        </form>
      </DialogoContenido>
    </Dialogo>
  );
}
