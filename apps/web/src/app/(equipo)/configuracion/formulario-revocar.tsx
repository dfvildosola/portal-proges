"use client";
// La confirmación de revocar una llave: es un diálogo de la página (nunca el confirm del navegador).
// Revocar no se puede deshacer: la llave deja de servir al instante y el sistema que la use se
// queda sin acceso. Queda en la lista como revocada, de registro.
import { ErrorDeFormulario } from "@/componentes/comunes/error-de-formulario";
import { Boton } from "@/componentes/ui/boton";
import { DialogoCerrar } from "@/componentes/ui/dialogo";
import { useFormulario } from "@/lib/usar-formulario";
import { revocarLlave } from "./acciones";
import { useCerrarDialogo } from "./dialogo-de-formulario";

export function FormularioRevocar({ id, nombre }: { id: string; nombre: string }) {
  const cerrar = useCerrarDialogo();
  const { formProps, pendiente, errorGeneral } = useFormulario(revocarLlave, { alExito: cerrar });

  return (
    <form {...formProps} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={id} />
      <p className="text-sm">
        El sistema que use la llave <b>{nombre}</b> dejará de tener acceso al instante, y esto no se puede deshacer. Si lo necesita, habrá que crearle una llave nueva.
      </p>
      <ErrorDeFormulario mensaje={errorGeneral} />
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <DialogoCerrar render={<Boton variante="contorno" />}>Cancelar</DialogoCerrar>
        <Boton type="submit" variante="peligro" disabled={pendiente}>
          {pendiente ? "Revocando…" : "Revocar la llave"}
        </Boton>
      </div>
    </form>
  );
}
