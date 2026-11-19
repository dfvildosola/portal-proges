"use client";

// Formulario para registrar una oferta recibida.

import { useFormAction } from "@/hooks/use-form-action";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { currencyLabels, enumOptions } from "@/lib/domain";
import { registrarOferta, type ComercialFormState } from "../comercial-actions";

export function RegistrarOfertaForm({
  servicioId,
  hoy,
}: {
  servicioId: string;
  // «AAAA-MM-DD» de hoy en Chile, calculado en el servidor.
  hoy: string;
}) {
  const [state, formProps, pending] = useFormAction(registrarOferta, {} as ComercialFormState);
  const err = (f: string) => state?.fieldErrors?.[f];

  return (
    <form {...formProps} className="space-y-3">
      <input type="hidden" name="servicioId" value={servicioId} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Fecha" htmlFor="oferta-fecha" error={err("fecha")}>
          <Input id="oferta-fecha" name="fecha" type="date" defaultValue={hoy} max={hoy} />
        </Field>
        <Field label="Oferente" htmlFor="oferta-oferente" error={err("oferente")}>
          <Input id="oferta-oferente" name="oferente" autoComplete="off" />
        </Field>
        <Field label="Monto" htmlFor="oferta-monto" error={err("monto")}>
          <Input
            id="oferta-monto"
            name="monto"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            placeholder="0"
          />
        </Field>
        <Field label="Moneda" error={err("moneda")}>
          <Select name="moneda" defaultValue="CLP" items={currencyLabels}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {enumOptions(currencyLabels).map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <Field label="Nota (opcional)" htmlFor="oferta-nota" error={err("nota")}>
        <Textarea id="oferta-nota" name="nota" rows={2} />
      </Field>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" size="sm" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Guardando…" : "Registrar oferta"}
      </Button>
    </form>
  );
}
