"use client";

// Aprobar o rechazar un presupuesto de maestro. Solo se pinta para la jefatura; la acción del
// servidor lo vuelve a exigir (esto es solo para no mostrar un botón que no va a funcionar).
// Rechazar pide el motivo.

import { useCallback, useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { useFormAction } from "@/hooks/use-form-action";
import { Field } from "@/components/field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  aprobarPresupuesto,
  rechazarPresupuesto,
  type ObraFormState,
} from "./obra-presupuestos-actions";

function RechazarForm({ id, onListo }: { id: string; onListo: () => void }) {
  const [state, formProps, pending] = useFormAction(rechazarPresupuesto, {} as ObraFormState);

  const guardado = state?.ok === true;
  useEffect(() => {
    if (guardado) onListo();
  }, [guardado, onListo]);

  return (
    <form {...formProps} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={id} />
      <Field label="Motivo" htmlFor={`rechazo-${id}`} error={state?.fieldErrors?.motivo}>
        <Textarea id={`rechazo-${id}`} name="motivo" rows={3} />
      </Field>
      {state?.error && !state.fieldErrors && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      <Button type="submit" variant="destructive" disabled={pending}>
        {pending ? "Rechazando…" : "Rechazar presupuesto"}
      </Button>
    </form>
  );
}

export function ObraPresupuestoResolver({ id }: { id: string }) {
  const [abierto, setAbierto] = useState(false);
  const cerrar = useCallback(() => setAbierto(false), []);
  const [state, formProps, pending] = useFormAction(aprobarPresupuesto, {} as ObraFormState);

  return (
    <div className="flex flex-wrap items-start gap-2">
      <form {...formProps} className="flex flex-col items-start gap-1">
        <input type="hidden" name="id" value={id} />
        <Button type="submit" size="sm" disabled={pending}>
          <Check className="size-4" />
          {pending ? "Aprobando…" : "Aprobar"}
        </Button>
        {state?.error && <p className="text-xs text-destructive">{state.error}</p>}
      </form>

      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogTrigger render={<Button variant="outline" size="sm" />}>
          <X className="size-4" />
          Rechazar
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar presupuesto</DialogTitle>
            <DialogDescription>
              Queda anotado el motivo. Si el maestro manda uno corregido, se carga como uno nuevo.
            </DialogDescription>
          </DialogHeader>
          <RechazarForm id={id} onListo={cerrar} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
