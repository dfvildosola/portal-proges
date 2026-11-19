"use client";

// «Rechazar» un pedido: el motivo es obligatorio porque el cliente lo ve en «Mis servicios».

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
import { rechazarProyecto, type RevisionFormState } from "./revisar-actions";

export function RechazarDialogo({ servicioEnCursoId }: { servicioEnCursoId: string }) {
  const [abierto, setAbierto] = useState(false);
  const cerrar = useCallback(() => setAbierto(false), []);

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>Rechazar</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Rechazar pedido</DialogTitle>
          <DialogDescription>
            El proyecto queda cancelado y el cliente verá el motivo en su pedido.
          </DialogDescription>
        </DialogHeader>
        <RechazarForm servicioEnCursoId={servicioEnCursoId} onListo={cerrar} />
      </DialogContent>
    </Dialog>
  );
}

function RechazarForm({
  servicioEnCursoId,
  onListo,
}: {
  servicioEnCursoId: string;
  onListo: () => void;
}) {
  const [state, formProps, pending] = useFormAction(rechazarProyecto, {} as RevisionFormState);
  const err = (f: string) => state?.fieldErrors?.[f];

  const guardado = state?.ok === true;
  useEffect(() => {
    if (guardado) onListo();
  }, [guardado, onListo]);

  return (
    <form {...formProps} className="flex flex-col gap-4">
      <input type="hidden" name="servicioEnCursoId" value={servicioEnCursoId} />

      <Field label="Motivo" htmlFor={`rechazar-motivo-${servicioEnCursoId}`} error={err("motivo")}>
        <Textarea id={`rechazar-motivo-${servicioEnCursoId}`} name="motivo" rows={3} />
      </Field>

      {state?.error && !state.fieldErrors && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" variant="destructive" disabled={pending}>
        {pending ? "Rechazando…" : "Rechazar pedido"}
      </Button>
    </form>
  );
}
