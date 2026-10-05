"use client";

import { useActionState, useState } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { terminarContrato, type CicloFormState } from "../ciclo-actions";

export function TerminarButton({
  id,
  fechaInicio,
  hoy,
  periodosSinPago,
}: {
  id: string;
  fechaInicio: string;
  hoy: string;
  // Períodos "AAAA-MM" de los cobros sin ningún pago.
  periodosSinPago: string[];
}) {
  const [open, setOpen] = useState(false);
  const [fecha, setFecha] = useState(hoy);
  const [state, formAction, pending] = useActionState(
    async (prev: CicloFormState, fd: FormData) => {
      const r = await terminarContrato(id, prev, fd);
      if (r.ok) setOpen(false);
      return r;
    },
    {} as CicloFormState,
  );

  // Se borran los cobros sin pago posteriores al mes de la salida.
  const aBorrar = /^\d{4}-\d{2}-\d{2}$/.test(fecha)
    ? periodosSinPago.filter((p) => p > fecha.slice(0, 7)).length
    : 0;
  const err = state.fieldErrors?.fechaSalida;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>
        <LogOut className="size-4" />
        Terminar
      </DialogTrigger>
      <DialogContent>
        <form action={formAction} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Terminar contrato</DialogTitle>
            <DialogDescription>
              Fija la fecha en que el arrendatario deja la propiedad.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fechaSalida">Fecha de salida</Label>
            <Input
              id="fechaSalida"
              name="fechaSalida"
              type="date"
              min={fechaInicio}
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
            {err && <p className="text-xs text-destructive">{err}</p>}
          </div>
          <p className="text-sm text-muted-foreground">
            {aBorrar === 0
              ? "No se borra ningún cobro."
              : `Se ${aBorrar === 1 ? "borra 1 cobro" : `borran ${aBorrar} cobros`} sin pago de meses posteriores a la salida.`}
          </p>
          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando…" : "Terminar contrato"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
