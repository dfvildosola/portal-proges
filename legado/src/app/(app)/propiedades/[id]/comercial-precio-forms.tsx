"use client";

// Formularios del precio: «Cambiar precio» y el enlace del aviso.

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
import { NOMBRES_PRECIO_ORIGEN } from "@/lib/servicios";
import {
  cambiarAvisoUrl,
  cambiarPrecio,
  type ComercialFormState,
} from "../comercial-actions";

export function CambiarPrecioForm({
  servicioId,
  habiaPrecio,
}: {
  servicioId: string;
  // Desde el segundo precio el motivo es obligatorio.
  habiaPrecio: boolean;
}) {
  const [state, formProps, pending] = useFormAction(cambiarPrecio, {} as ComercialFormState);
  const err = (f: string) => state?.fieldErrors?.[f];

  return (
    <form {...formProps} className="space-y-3">
      <input type="hidden" name="servicioId" value={servicioId} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_1fr]">
        <Field label="Monto" htmlFor="precio-monto" error={err("monto")}>
          <Input
            id="precio-monto"
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
            <SelectTrigger className="w-full sm:w-32">
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
        <Field label="Quién lo fijó" error={err("origen")}>
          <Select name="origen" items={NOMBRES_PRECIO_ORIGEN}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Elige una opción" />
            </SelectTrigger>
            <SelectContent>
              {enumOptions(NOMBRES_PRECIO_ORIGEN).map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <Field
        label={habiaPrecio ? "Motivo del cambio" : "Motivo (opcional)"}
        htmlFor="precio-motivo"
        error={err("motivo")}
        hint={habiaPrecio ? "Queda en el historial y es lo que se le explica al propietario." : undefined}
      >
        <Textarea id="precio-motivo" name="motivo" rows={2} />
      </Field>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Guardando…" : "Cambiar precio"}
      </Button>
    </form>
  );
}

export function AvisoUrlForm({
  servicioId,
  avisoUrl,
}: {
  servicioId: string;
  avisoUrl: string | null;
}) {
  const [state, formProps, pending] = useFormAction(cambiarAvisoUrl, {} as ComercialFormState);

  return (
    <form {...formProps} className="space-y-2">
      <input type="hidden" name="servicioId" value={servicioId} />
      <Field
        label="Enlace del aviso"
        htmlFor="aviso-url"
        error={state?.fieldErrors?.avisoUrl}
        hint="Déjalo vacío para quitarlo."
      >
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id="aviso-url"
            name="avisoUrl"
            type="url"
            inputMode="url"
            defaultValue={avisoUrl ?? ""}
            placeholder="https://…"
          />
          <Button type="submit" size="sm" variant="outline" disabled={pending} className="sm:self-center">
            {pending ? "Guardando…" : "Guardar enlace"}
          </Button>
        </div>
      </Field>
      {state?.error && !state.fieldErrors && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
    </form>
  );
}
