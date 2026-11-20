"use client";

// Un botón chico que corre una acción sobre una etapa (subir, bajar, desactivar,
// reactivar, borrar). Cada botón es su propio formulario: manda los datos escondidos
// (`campos`) a la acción del servidor, y si el servidor responde con un error se lo
// pasa a la fila (`onError`) para que lo muestre debajo, donde hay lugar para leerlo.

import { useEffect } from "react";
import { useFormAction } from "@/hooks/use-form-action";
import { Button } from "@/components/ui/button";
import type { EtapaFormState } from "./etapas-actions";

export function BotonEtapa({
  accion,
  campos,
  etiqueta,
  variante = "outline",
  tamano = "sm",
  deshabilitado = false,
  onError,
  children,
}: {
  accion: (prev: EtapaFormState, formData: FormData) => Promise<EtapaFormState>;
  campos: Record<string, string>;
  etiqueta: string; // lo que lee un lector de pantalla cuando el botón es solo un ícono
  variante?: "outline" | "ghost" | "destructive";
  tamano?: "sm" | "icon-sm";
  deshabilitado?: boolean;
  onError: (estado: EtapaFormState | null) => void;
  children: React.ReactNode;
}) {
  const [state, formProps, pending] = useFormAction(accion, {});

  // Cada respuesta del servidor llega a la fila: el error nuevo se muestra, y si salió
  // bien se borra el error anterior.
  useEffect(() => {
    if (state?.error) onError(state);
    else if (state?.ok) onError(null);
  }, [state, onError]);

  return (
    <form {...formProps}>
      {Object.entries(campos).map(([nombre, valor]) => (
        <input key={nombre} type="hidden" name={nombre} value={valor} />
      ))}
      <Button
        type="submit"
        variant={variante}
        size={tamano}
        disabled={deshabilitado || pending}
        aria-label={etiqueta}
        title={etiqueta}
      >
        {children}
      </Button>
    </form>
  );
}
