"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import {
  currencyLabels,
  adjustmentTypeLabels,
  enumOptions,
} from "@/lib/domain";
import type { ContractFormState } from "./actions";

export type ContractValues = {
  id?: string;
  propertyId?: string;
  tenantId?: string;
  monto?: string;
  moneda?: string;
  reajusteTipo?: string;
  reajusteFrecuenciaMeses?: string;
  fechaInicio?: string;
  fechaTermino?: string;
  diaPago?: string;
};

type Option = { value: string; label: string };

function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && !error && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function ContractForm({
  action,
  initial,
  submitLabel,
  properties,
  tenants,
}: {
  action: (prev: ContractFormState, fd: FormData) => Promise<ContractFormState>;
  initial?: ContractValues;
  submitLabel: string;
  properties: Option[];
  tenants: Option[];
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const err = (f: string) => state?.fieldErrors?.[f];

  return (
    <form action={formAction} className="max-w-2xl">
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos del contrato</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Partes */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Propiedad" error={err("propertyId")}>
              <Combobox
                name="propertyId"
                options={properties}
                defaultValue={initial?.propertyId}
                placeholder="Elige una propiedad"
                searchPlaceholder="Buscar propiedad…"
              />
            </Field>

            <Field label="Arrendatario" error={err("tenantId")}>
              <Combobox
                name="tenantId"
                options={tenants}
                defaultValue={initial?.tenantId}
                placeholder="Elige un arrendatario"
                searchPlaceholder="Buscar arrendatario…"
              />
            </Field>
          </div>

          {/* Renta */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Monto de arriendo" htmlFor="monto" error={err("monto")}>
              <Input
                id="monto"
                name="monto"
                type="number"
                step="0.01"
                min="0"
                defaultValue={initial?.monto}
                placeholder="650000"
              />
            </Field>

            <Field label="Moneda" error={err("moneda")}>
              <Select name="moneda" defaultValue={initial?.moneda ?? "CLP"}>
                <SelectTrigger>
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

            <Field label="Reajuste" error={err("reajusteTipo")}>
              <Select
                name="reajusteTipo"
                defaultValue={initial?.reajusteTipo ?? "NINGUNO"}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {enumOptions(adjustmentTypeLabels).map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field
              label="Frecuencia de reajuste (meses)"
              htmlFor="reajusteFrecuenciaMeses"
              error={err("reajusteFrecuenciaMeses")}
              hint="Solo aplica si hay reajuste. Ej: 12 = anual."
            >
              <Input
                id="reajusteFrecuenciaMeses"
                name="reajusteFrecuenciaMeses"
                type="number"
                step="1"
                min="1"
                defaultValue={initial?.reajusteFrecuenciaMeses}
                placeholder="12"
              />
            </Field>
          </div>

          {/* Vigencia */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Fecha de inicio"
              htmlFor="fechaInicio"
              error={err("fechaInicio")}
            >
              <Input
                id="fechaInicio"
                name="fechaInicio"
                type="date"
                defaultValue={initial?.fechaInicio}
              />
            </Field>

            <Field
              label="Fecha de término"
              htmlFor="fechaTermino"
              error={err("fechaTermino")}
            >
              <Input
                id="fechaTermino"
                name="fechaTermino"
                type="date"
                defaultValue={initial?.fechaTermino}
              />
            </Field>

            <Field
              label="Día de pago"
              htmlFor="diaPago"
              error={err("diaPago")}
              hint="Día del mes en que vence el arriendo (1–31)."
            >
              <Input
                id="diaPago"
                name="diaPago"
                type="number"
                step="1"
                min="1"
                max="31"
                defaultValue={initial?.diaPago ?? "5"}
              />
            </Field>

          </div>

          {state?.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
        </CardContent>
        <CardFooter className="gap-3 border-t">
          <Button type="submit" disabled={pending}>
            {pending ? "Guardando…" : submitLabel}
          </Button>
          <Button variant="outline" nativeButton={false} render={<Link href="/contratos" />}>
            Cancelar
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
