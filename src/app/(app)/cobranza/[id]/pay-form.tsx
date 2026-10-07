"use client";

import { useFormAction } from "@/hooks/use-form-action";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/field";
import { Button } from "@/components/ui/button";
import { registerPayment } from "../actions";
import type { ChargeFormState } from "../actions";

export function PayForm({
  chargeId,
  defaultAmount,
  defaultDate,
}: {
  chargeId: string;
  defaultAmount: string;
  defaultDate: string;
}) {
  const [state, formProps, pending] = useFormAction(
    registerPayment,
    {} as ChargeFormState,
  );
  const err = (f: string) => state?.fieldErrors?.[f];

  return (
    <form {...formProps} className="space-y-4">
      <input type="hidden" name="chargeId" value={chargeId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Fecha de pago" htmlFor="fechaPago" error={err("fechaPago")}>
          <Input
            id="fechaPago"
            name="fechaPago"
            type="date"
            defaultValue={defaultDate}
          />
        </Field>
        <Field label="Monto de este pago" htmlFor="montoPagado" error={err("montoPagado")}>
          <Input
            id="montoPagado"
            name="montoPagado"
            type="number"
            step="0.01"
            min="0.01"
            defaultValue={defaultAmount}
          />
        </Field>
        <Field
          label="Interés mora (opcional)"
          htmlFor="interesMora"
          error={err("interesMora")}
        >
          <Input
            id="interesMora"
            name="interesMora"
            type="number"
            step="0.01"
            min="0"
            placeholder="0"
          />
        </Field>
        <Field label="Notas (opcional)" htmlFor="notas">
          <Input id="notas" name="notas" placeholder="Observaciones" />
        </Field>
      </div>
      {state?.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Registrando…" : "Registrar pago"}
      </Button>
    </form>
  );
}
