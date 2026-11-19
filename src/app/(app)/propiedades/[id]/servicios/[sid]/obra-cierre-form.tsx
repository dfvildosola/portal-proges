"use client";

// El botón «Cerrar obra» de la jefatura: pide confirmar y una nota optativa. La acción del servidor
// vuelve a comprobar la jefatura y que todas las partidas estén recibidas conformes.

import { useCallback, useEffect, useState } from "react";
import { Lock } from "lucide-react";
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
import { cerrarObra, type CierreFormState } from "./obra-cierre-actions";

function CerrarForm({ servicioEnCursoId, onListo }: { servicioEnCursoId: string; onListo: () => void }) {
  const [state, formProps, pending] = useFormAction(cerrarObra, {} as CierreFormState);

  const guardado = state?.ok === true;
  useEffect(() => {
    if (guardado) onListo();
  }, [guardado, onListo]);

  return (
    <form {...formProps} className="flex flex-col gap-4">
      <input type="hidden" name="servicioEnCursoId" value={servicioEnCursoId} />
      <Field label="Nota del cierre (optativa)" htmlFor="cierre-motivo" error={state?.fieldErrors?.motivo}>
        <Textarea id="cierre-motivo" name="motivo" rows={3} />
      </Field>
      {state?.error && !state.fieldErrors && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Cerrando…" : "Cerrar la obra"}
      </Button>
    </form>
  );
}

export function ObraCierreBoton({ servicioEnCursoId }: { servicioEnCursoId: string }) {
  const [abierto, setAbierto] = useState(false);
  const cerrar = useCallback(() => setAbierto(false), []);

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger render={<Button />}>
        <Lock className="size-4" />
        Cerrar obra
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cerrar la obra</DialogTitle>
          <DialogDescription>
            Todas las partidas están recibidas. Al cerrar, el proyecto queda terminado y la comparación de plan
            contra real queda como el cierre.
          </DialogDescription>
        </DialogHeader>
        <CerrarForm servicioEnCursoId={servicioEnCursoId} onListo={cerrar} />
      </DialogContent>
    </Dialog>
  );
}
