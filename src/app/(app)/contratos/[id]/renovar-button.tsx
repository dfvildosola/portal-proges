"use client";

import { useActionState, useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { renovarContrato, type CicloFormState } from "../ciclo-actions";

export function RenovarButton({
  id,
  terminoActual,
  terminoNuevo,
}: {
  id: string;
  terminoActual: string;
  terminoNuevo: string;
}) {
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const [state, formAction, pending] = useActionState(
    async () => {
      const r = await renovarContrato(id);
      if (r.ok) setOpen(false);
      return r;
    },
    {} as CicloFormState,
  );

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button variant="outline" />}>
        <RefreshCw className="size-4" />
        Renovar
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Renovar este contrato?</AlertDialogTitle>
          <AlertDialogDescription>
            El término pasa del {terminoActual} al {terminoNuevo}.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {state.error && <p className="text-sm text-destructive">{state.error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <Button
            disabled={pending}
            onClick={() => startTransition(formAction)}
          >
            {pending ? "Renovando…" : "Renovar"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
