"use client";
// El botón de borrar una cuenta o una cuota anotada. Pide confirmar: borrar no se deshace.
import { borrarAnotacion } from "./acciones";
import { DialogoConfirmar } from "./dialogo-confirmar";

export function BorrarAnotacion({
  recurso,
  id,
  descripcion,
}: {
  recurso: "gastos" | "contribuciones";
  id: string;
  /** Qué se va a borrar, para que la persona confirme que es esa. */
  descripcion: string;
}) {
  return (
    <DialogoConfirmar
      boton="Borrar"
      variante="fantasma"
      titulo="Borrar lo anotado"
      pregunta={`${descripcion}. Se borra del todo y no se puede deshacer.`}
      textoDeEnvio="Sí, borrar"
      accion={borrarAnotacion}
      ocultos={{ recurso, id }}
    />
  );
}
