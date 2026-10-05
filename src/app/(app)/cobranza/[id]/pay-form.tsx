"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { registerPayment } from "../actions";
import type { ChargeFormState } from "../actions";

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function PayForm({
  chargeId,
  defaultAmount,
  defaultDate,
}: {
  chargeId: string;
  defaultAmount: string;
  defaultDate: string;
}) {
  const [state, formAction, pending] = useActionState(
    registerPayment,
    {} as ChargeFormState,
  );
  const err = (f: string) => state?.fieldErrors?.[f];

  return (
    <form action={formAction} className="space-y-4">
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
