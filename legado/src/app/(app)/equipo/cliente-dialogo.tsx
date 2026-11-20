"use client";

// Botón + diálogo para crear un cliente (sin `cliente`) o renombrarlo (con `cliente`).
// El formulario solo existe mientras el diálogo está abierto, así que cada vez parte limpio.

import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { useFormAction } from "@/hooks/use-form-action";
import { Field } from "@/components/field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { guardarCliente } from "./clientes-actions";

function ClienteForm({
  cliente,
  onListo,
}: {
  cliente?: { id: string; nombre: string };
  onListo: () => void;
}) {
  const [state, formProps, pending] = useFormAction(guardarCliente, {});

  // Cuando el servidor confirma que guardó, se avisa al diálogo para que se cierre.
  const guardado = state?.ok === true;
  useEffect(() => {
    if (guardado) onListo();
  }, [guardado, onListo]);

  return (
    <form {...formProps} className="flex flex-col gap-4">
      {cliente && <input type="hidden" name="id" value={cliente.id} />}
      <Field
        label="Nombre del cliente"
        htmlFor="nombre-cliente"
        error={state?.fieldErrors?.nombre}
        hint="Es el espacio donde vive su cartera. Por ejemplo: NPL."
      >
        <Input id="nombre-cliente" name="nombre" defaultValue={cliente?.nombre} />
      </Field>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Guardando…" : cliente ? "Guardar cambios" : "Crear cliente"}
      </Button>
    </form>
  );
}

export function ClienteDialogo({ cliente }: { cliente?: { id: string; nombre: string } }) {
  const [abierto, setAbierto] = useState(false);
  const cerrar = useCallback(() => setAbierto(false), []);

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger render={cliente ? <Button variant="ghost" size="sm" /> : <Button />}>
        {cliente ? (
          <>
            <Pencil className="size-4" />
            Renombrar
          </>
        ) : (
          <>
            <Plus className="size-4" />
            Nuevo cliente
          </>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{cliente ? `Renombrar a ${cliente.nombre}` : "Nuevo cliente"}</DialogTitle>
        </DialogHeader>
        <ClienteForm cliente={cliente} onListo={cerrar} />
      </DialogContent>
    </Dialog>
  );
}
