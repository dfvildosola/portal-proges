"use client";
// Un botón «Quitar» que pide confirmar antes de borrar algo (una unidad, un avalúo, un documento).
// Borrar no se puede deshacer, así que la ventana dice qué se va a borrar.
import { Trash2 } from "lucide-react";
import { startTransition, useState } from "react";
import { ErrorDeFormulario } from "@/componentes/comunes/error-de-formulario";
import { Boton } from "@/componentes/ui/boton";
import { Dialogo, DialogoContenido, DialogoDescripcion, DialogoDisparador, DialogoPie, DialogoTitulo } from "@/componentes/ui/dialogo";
import type { ResultadoAccion } from "@/lib/acciones";

type Props = {
  /** Qué se va a quitar, para el título («Quitar el estacionamiento 12»). */
  titulo: string;
  descripcion?: string;
  /** Una acción del servidor con el id ya incluido (`.bind`). */
  accion: () => Promise<ResultadoAccion>;
  /** Para lectores de pantalla: «Quitar estacionamiento 12». */
  etiqueta: string;
};

export function BotonQuitar({ titulo, descripcion, accion, etiqueta }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [pendiente, setPendiente] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function confirmar() {
    setPendiente(true);
    setError(null);
    startTransition(async () => {
      try {
        const resultado = await accion();
        if (resultado.ok) setAbierto(false);
        else setError(resultado.error);
      } finally {
        setPendiente(false);
      }
    });
  }

  return (
    <Dialogo
      open={abierto}
      onOpenChange={(valor) => {
        setAbierto(valor);
        if (!valor) setError(null);
      }}
    >
      <DialogoDisparador render={<Boton variante="fantasma" tamano="icono" aria-label={etiqueta} />}>
        <Trash2 />
      </DialogoDisparador>
      <DialogoContenido>
        <DialogoTitulo>{titulo}</DialogoTitulo>
        <DialogoDescripcion>{descripcion ?? "Esto no se puede deshacer."}</DialogoDescripcion>
        <ErrorDeFormulario mensaje={error} />
        <DialogoPie>
          <Boton variante="contorno" onClick={() => setAbierto(false)}>
            Cancelar
          </Boton>
          <Boton variante="peligro" onClick={confirmar} disabled={pendiente}>
            {pendiente ? "Quitando…" : "Quitar"}
          </Boton>
        </DialogoPie>
      </DialogoContenido>
    </Dialogo>
  );
}
