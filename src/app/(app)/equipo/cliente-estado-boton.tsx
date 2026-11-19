"use client";

// Desactiva o reactiva un cliente. Si el servidor responde con un error, se muestra
// debajo del botón.

import { useFormAction } from "@/hooks/use-form-action";
import { Button } from "@/components/ui/button";
import { cambiarActivaCliente } from "./clientes-actions";

export function ClienteEstadoBoton({ id, activa }: { id: string; activa: boolean }) {
  const [state, formProps, pending] = useFormAction(cambiarActivaCliente, {});

  return (
    <form {...formProps} className="flex flex-col items-start gap-1">
      <input type="hidden" name="id" value={id} />
      {/* Lo que se pide: el estado contrario al de hoy. */}
      <input type="hidden" name="activa" value={activa ? "no" : "si"} />
      <Button type="submit" variant="ghost" size="sm" disabled={pending}>
        {activa ? "Desactivar" : "Reactivar"}
      </Button>
      {state?.error && <p className="text-xs text-destructive">{state.error}</p>}
    </form>
  );
}
