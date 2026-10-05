"use client";

import { useActionState, useState } from "react";
import { TrendingUp } from "lucide-react";
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
import { formatMoney } from "@/lib/format";
import { montoReajustado } from "@/lib/contratos";
import { reajustarContrato, type CicloFormState } from "../ciclo-actions";

export function ReajustarButton({
  id,
  monto,
  moneda,
  fechaSugerida,
}: {
  id: string;
  monto: number;
  moneda: "CLP" | "UF";
  fechaSugerida: string;
}) {
  const [open, setOpen] = useState(false);
  const [porcentaje, setPorcentaje] = useState("");
  const [state, formAction, pending] = useActionState(
    async (prev: CicloFormState, fd: FormData) => {
      const r = await reajustarContrato(id, prev, fd);
      if (r.ok) setOpen(false);
      return r;
    },
    {} as CicloFormState,
  );

  const pct = Number(porcentaje.replace(",", "."));
  const valido = porcentaje.trim() !== "" && Number.isFinite(pct) && pct > 0 && pct <= 100;
  const err = (f: string) => state.fieldErrors?.[f];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>
        <TrendingUp className="size-4" />
        Reajustar
      </DialogTrigger>
      <DialogContent>
        <form action={formAction} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Reajustar arriendo</DialogTitle>
            <DialogDescription>
              Cambia el monto del contrato y el de los cobros sin pago desde el
              mes de la fecha efectiva.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="porcentaje">Porcentaje (%)</Label>
              <Input
                id="porcentaje"
                name="porcentaje"
                inputMode="decimal"
                placeholder="4"
                value={porcentaje}
                onChange={(e) => setPorcentaje(e.target.value)}
              />
              {err("porcentaje") && (
                <p className="text-xs text-destructive">{err("porcentaje")}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fechaEfectiva">Fecha efectiva</Label>
              {/* key: tras reajustar cambia la fecha sugerida; recrea el campo. */}
              <Input
                key={fechaSugerida}
                id="fechaEfectiva"
                name="fechaEfectiva"
                type="date"
                defaultValue={fechaSugerida}
              />
              {err("fechaEfectiva") && (
                <p className="text-xs text-destructive">{err("fechaEfectiva")}</p>
              )}
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {valido
              ? `${formatMoney(monto, moneda)} → ${formatMoney(montoReajustado(monto, pct, moneda), moneda)}`
              : "Ingresa el porcentaje para ver el monto nuevo."}
          </p>
          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando…" : "Aplicar reajuste"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
