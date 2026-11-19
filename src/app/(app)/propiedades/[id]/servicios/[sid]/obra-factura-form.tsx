"use client";

// Formularios de las facturas del maestro (solo equipo):
//  - AsignarFacturaForm: «Asignar a este proyecto» una factura de Odoo, con el monto (por defecto
//    lo que queda por asignar de esa factura).
//  - FacturaManualForm: botón + diálogo «Factura fuera de Odoo».
//  - QuitarFacturaBoton: quita una asignación.

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useFormAction } from "@/hooks/use-form-action";
import { Field } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  anotarFacturaManual,
  asignarFactura,
  quitarFactura,
  type FacturaFormState,
} from "./obra-facturas-actions";

export function AsignarFacturaForm({
  servicioEnCursoId,
  maestroId,
  odooMoveId,
  restante,
}: {
  servicioEnCursoId: string;
  maestroId: string;
  odooMoveId: number;
  restante: number;
}) {
  const [state, formProps, pending] = useFormAction(asignarFactura, {} as FacturaFormState);
  const idCampo = `asignar-${odooMoveId}`;
  const error = state?.fieldErrors?.monto ?? state?.error;

  return (
    <form {...formProps} className="flex flex-col gap-1">
      <input type="hidden" name="servicioEnCursoId" value={servicioEnCursoId} />
      <input type="hidden" name="maestroId" value={maestroId} />
      <input type="hidden" name="odooMoveId" value={odooMoveId} />
      <div className="flex flex-wrap items-center gap-2">
        <Label htmlFor={idCampo} className="sr-only">
          Monto a asignar
        </Label>
        <Input
          id={idCampo}
          name="monto"
          inputMode="numeric"
          defaultValue={String(restante)}
          className="h-9 w-32"
          aria-invalid={error ? true : undefined}
        />
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Asignando…" : "Asignar a este proyecto"}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </form>
  );
}

export type MaestroOpcion = { id: string; nombre: string };

function ManualForm({
  servicioEnCursoId,
  maestros,
  onListo,
}: {
  servicioEnCursoId: string;
  maestros: MaestroOpcion[];
  onListo: () => void;
}) {
  const [state, formProps, pending] = useFormAction(anotarFacturaManual, {} as FacturaFormState);
  const err = (f: string) => state?.fieldErrors?.[f];
  const [maestroId, setMaestroId] = useState("");
  const [pagada, setPagada] = useState(false);
  const items = Object.fromEntries(maestros.map((m) => [m.id, m.nombre]));

  const guardado = state?.ok === true;
  useEffect(() => {
    if (guardado) onListo();
  }, [guardado, onListo]);

  return (
    <form {...formProps} className="flex flex-col gap-4">
      <input type="hidden" name="servicioEnCursoId" value={servicioEnCursoId} />
      <input type="hidden" name="maestroId" value={maestroId} />
      <input type="hidden" name="pagada" value={pagada ? "1" : ""} />

      <Field label="Maestro" error={err("maestroId")}>
        <Select items={items} value={maestroId || null} onValueChange={(v) => setMaestroId(v ?? "")}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Elige el maestro" />
          </SelectTrigger>
          <SelectContent>
            {maestros.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Número (optativo)" htmlFor="fm-numero" error={err("numero")}>
          <Input id="fm-numero" name="numero" />
        </Field>
        <Field label="Fecha" htmlFor="fm-fecha" error={err("fecha")}>
          <Input id="fm-fecha" name="fecha" type="date" />
        </Field>
      </div>

      <Field label="Monto (pesos)" htmlFor="fm-monto" error={err("monto")}>
        <Input id="fm-monto" name="monto" inputMode="numeric" placeholder="1.500.000" />
      </Field>

      <div className="flex items-center gap-2">
        <Checkbox id="fm-pagada" checked={pagada} onCheckedChange={setPagada} />
        <Label htmlFor="fm-pagada">Ya está pagada</Label>
      </div>

      <Field label="Nota (optativa)" htmlFor="fm-nota" error={err("nota")}>
        <Textarea id="fm-nota" name="nota" rows={2} />
      </Field>

      {state?.error && !state.fieldErrors && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Guardando…" : "Anotar factura"}
      </Button>
    </form>
  );
}

export function FacturaManualForm(props: { servicioEnCursoId: string; maestros: MaestroOpcion[] }) {
  const [abierto, setAbierto] = useState(false);
  const cerrar = useCallback(() => setAbierto(false), []);

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <Plus className="size-4" />
        Factura fuera de Odoo
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Factura fuera de Odoo</DialogTitle>
          <DialogDescription>
            Para una factura o pago que no está en Odoo. Se anota a mano y queda marcada «fuera de Odoo».
          </DialogDescription>
        </DialogHeader>
        <ManualForm {...props} onListo={cerrar} />
      </DialogContent>
    </Dialog>
  );
}

export function QuitarFacturaBoton({ id }: { id: string }) {
  const [state, formProps, pending] = useFormAction(quitarFactura, {} as FacturaFormState);
  return (
    <form {...formProps} className="flex flex-col items-start gap-1">
      <input type="hidden" name="id" value={id} />
      <Button type="submit" size="sm" variant="ghost" disabled={pending}>
        <Trash2 className="size-4" />
        {pending ? "Quitando…" : "Quitar"}
      </Button>
      {state?.error && <p className="text-xs text-destructive">{state.error}</p>}
    </form>
  );
}
