"use client";

// «Rechazar» una solicitud: el motivo es obligatorio porque el cliente lo ve en su ficha.

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
import { rechazarSolicitud, type SolicitudFormState } from "./solicitudes-actions";

export function RechazarDialogo({ solicitudId }: { solicitudId: string }) {
  const [abierto, setAbierto] = useState(false);
  const cerrar = useCallback(() => setAbierto(false), []);

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>Rechazar</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Rechazar solicitud</DialogTitle>
          <DialogDescription>
            El cliente verá el motivo en la ficha de su propiedad.
          </DialogDescription>
        </DialogHeader>
        <RechazarForm solicitudId={solicitudId} onListo={cerrar} />
      </DialogContent>
    </Dialog>
  );
}

function RechazarForm({
  solicitudId,
  onListo,
}: {
  solicitudId: string;
  onListo: () => void;
}) {
  const [state, formProps, pending] = useFormAction(rechazarSolicitud, {} as SolicitudFormState);
  const err = (f: string) => state?.fieldErrors?.[f];

  const guardado = state?.ok === true;
  useEffect(() => {
    if (guardado) onListo();
  }, [guardado, onListo]);

  return (
    <form {...formProps} className="flex flex-col gap-4">
      <input type="hidden" name="solicitudId" value={solicitudId} />

      <Field label="Motivo" htmlFor={`rechazar-motivo-${solicitudId}`} error={err("motivo")}>
        <Textarea id={`rechazar-motivo-${solicitudId}`} name="motivo" rows={3} />
      </Field>

      {state?.error && !state.fieldErrors && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      <Button type="submit" variant="destructive" disabled={pending}>
        {pending ? "Rechazando…" : "Rechazar solicitud"}
      </Button>
    </form>
  );
}
