"use client";

import { useState, useTransition } from "react";
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
import { renovarContrato } from "../ciclo-actions";

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
  const [pending, startTransition] = useTransition();

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
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <Button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await renovarContrato(id);
                setOpen(false);
              })
            }
          >
            {pending ? "Renovando…" : "Renovar"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
