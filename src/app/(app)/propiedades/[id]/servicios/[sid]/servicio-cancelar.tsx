"use client";

// Botón «Cancelar servicio» con un diálogo que pide el motivo (obligatorio).
// Cancelar es una salida de cualquier etapa, no una etapa más.

import { useCallback, useEffect, useState } from "react";
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
import { cancelarServicio } from "../../../servicios-actions";
import type { ServicioFormState } from "../../../servicios-actions";

export function CancelarDialogo({
  propertyId,
  servicioId,
}: {
  propertyId: string;
  servicioId: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const cerrar = useCallback(() => setAbierto(false), []);

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger render={<Button variant="destructive" />}>Cancelar servicio</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cancelar servicio</DialogTitle>
          <DialogDescription>
            El servicio queda cancelado y sale de los abiertos. No se puede reabrir.
          </DialogDescription>
        </DialogHeader>
        <CancelarForm propertyId={propertyId} servicioId={servicioId} onListo={cerrar} />
      </DialogContent>
    </Dialog>
  );
}

function CancelarForm({
  propertyId,
  servicioId,
  onListo,
}: {
  propertyId: string;
  servicioId: string;
  onListo: () => void;
}) {
  const [state, formProps, pending] = useFormAction(cancelarServicio, {} as ServicioFormState);
  const err = (f: string) => state?.fieldErrors?.[f];

  const guardado = state?.ok === true;
  useEffect(() => {
    if (guardado) onListo();
  }, [guardado, onListo]);

  return (
    <form {...formProps} className="flex flex-col gap-4">
      <input type="hidden" name="propertyId" value={propertyId} />
      <input type="hidden" name="servicioId" value={servicioId} />

      <Field label="Motivo" htmlFor="cancelar-motivo" error={err("motivo")}>
        <Textarea id="cancelar-motivo" name="motivo" rows={3} />
      </Field>

      {state?.error && !state.fieldErrors && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      <Button type="submit" variant="destructive" disabled={pending}>
        {pending ? "Cancelando…" : "Cancelar servicio"}
      </Button>
    </form>
  );
}
