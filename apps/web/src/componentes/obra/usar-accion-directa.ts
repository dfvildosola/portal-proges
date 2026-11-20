"use client";
// Para lo que no es un formulario: tocar un botón o cambiar una lista y que se guarde al tiro
// (marcar un avance, aprobar, quitar). Llama a una server action, muestra «guardando» mientras
// espera y, si la API rechaza, deja su mensaje en `error` para que la pantalla lo escriba.
//
// Los formularios con campos siguen usando `useFormulario` (lib/usar-formulario.ts).
import { startTransition, useState, useTransition } from "react";

type Resultado<T> = { ok: true; datos?: T } | { ok: false; error: string };

export function useAccionDirecta() {
  const [pendiente, empezar] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function ejecutar<T = unknown>(
    trabajo: () => Promise<Resultado<T>>,
    alExito?: (datos: T | undefined) => void,
    /** Para deshacer lo que la pantalla mostró de antemano (una lista que ya cambió de valor). */
    alFallar?: () => void,
  ) {
    setError(null);
    empezar(async () => {
      const resultado = await trabajo();
      // Lo que viene después de un `await` ya no está dentro de la transición: se vuelve a envolver.
      startTransition(() => {
        if (resultado.ok) alExito?.(resultado.datos);
        else {
          setError(resultado.error);
          alFallar?.();
        }
      });
    });
  }

  return { pendiente, error, ejecutar, limpiarError: () => setError(null) };
}
