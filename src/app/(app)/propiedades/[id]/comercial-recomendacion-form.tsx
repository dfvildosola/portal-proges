"use client";

// Formulario para reemplazar la recomendación al propietario.

import { useFormAction } from "@/hooks/use-form-action";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/field";
import { guardarRecomendacion, type ComercialFormState } from "../comercial-actions";

export function RecomendacionForm({
  servicioId,
  hayTexto,
}: {
  servicioId: string;
  // Si ya hay una recomendación, el formulario la reemplaza entera.
  hayTexto: boolean;
}) {
  const [state, formProps, pending] = useFormAction(guardarRecomendacion, {} as ComercialFormState);

  return (
    <form {...formProps} className="space-y-3">
      <input type="hidden" name="servicioId" value={servicioId} />
      <Field
        label={hayTexto ? "Nueva recomendación" : "Recomendación"}
        htmlFor="recomendacion"
        error={state?.fieldErrors?.recomendacion}
        hint={hayTexto ? "Reemplaza la anterior y queda con la fecha de hoy." : undefined}
      >
        <Textarea id="recomendacion" name="recomendacion" rows={4} />
      </Field>
      {state?.error && !state.fieldErrors && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      <Button type="submit" size="sm" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Guardando…" : "Guardar recomendación"}
      </Button>
    </form>
  );
}
