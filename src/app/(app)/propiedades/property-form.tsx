"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
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
import {
  propertyTypeLabels,
  propertyStatusLabels,
  propertyGoalLabels,
  currencyLabels,
  enumOptions,
} from "@/lib/domain";
import type { PropertyFormState } from "./actions";
import { PropertyFormEconomic } from "./property-form-economic";

export type PropertyValues = {
  id?: string;
  rolSII?: string;
  tipo?: string;
  direccion?: string;
  comuna?: string;
  region?: string;
  objetivo?: string;
  estado?: string;
  monedaPrincipal?: string;
  m2Terreno?: string;
  m2Construidos?: string;
  anoConstruccion?: string;
  valorComercial?: string;
  valorComercialMoneda?: string;
  valorComercialFecha?: string;
  valorComercialFuente?: string;
  compraFecha?: string;
  compraPrecio?: string;
  compraMoneda?: string;
  deudaSaldo?: string;
  deudaMoneda?: string;
  deudaFecha?: string;
  deudaBanco?: string;
  deudaDividendo?: string;
  deudaTermino?: string;
  exentaContribuciones?: boolean;
};

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function PropertyForm({
  action,
  initial,
  submitLabel,
}: {
  action: (
    prev: PropertyFormState,
    fd: FormData,
  ) => Promise<PropertyFormState>;
  initial?: PropertyValues;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const err = (f: string) => state?.fieldErrors?.[f];

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-4">
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos de la propiedad</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="ROL SII" htmlFor="rolSII" error={err("rolSII")}>
          <Input
            id="rolSII"
            name="rolSII"
            defaultValue={initial?.rolSII}
            placeholder="12345-6"
          />
        </Field>

        <Field label="Tipo" error={err("tipo")}>
          <Select
            name="tipo"
            items={propertyTypeLabels}
            defaultValue={initial?.tipo ?? "DEPARTAMENTO"}
          >
            <SelectTrigger>
              <SelectValue placeholder="Tipo de propiedad" />
            </SelectTrigger>
            <SelectContent>
              {enumOptions(propertyTypeLabels).map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Dirección" htmlFor="direccion" error={err("direccion")}>
          <Input
            id="direccion"
            name="direccion"
            defaultValue={initial?.direccion}
            placeholder="Av. Providencia 123, depto 45"
          />
        </Field>

        <Field label="Comuna" htmlFor="comuna" error={err("comuna")}>
          <Input
            id="comuna"
            name="comuna"
            defaultValue={initial?.comuna}
            placeholder="Providencia"
          />
        </Field>

        <Field label="Región" htmlFor="region" error={err("region")}>
          <Input
            id="region"
            name="region"
            defaultValue={initial?.region}
            placeholder="Metropolitana"
          />
        </Field>

        <Field label="Objetivo" error={err("objetivo")}>
          <Select
            name="objetivo"
            items={propertyGoalLabels}
            defaultValue={initial?.objetivo ?? "INVERSION"}
          >
            <SelectTrigger>
              <SelectValue placeholder="Objetivo" />
            </SelectTrigger>
            <SelectContent>
              {enumOptions(propertyGoalLabels).map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Estado" error={err("estado")}>
          <Select
            name="estado"
            items={propertyStatusLabels}
            defaultValue={initial?.estado ?? "DISPONIBLE"}
          >
            <SelectTrigger>
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              {enumOptions(propertyStatusLabels).map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Moneda principal" error={err("monedaPrincipal")}>
          <Select
            name="monedaPrincipal"
            items={currencyLabels}
            defaultValue={initial?.monedaPrincipal ?? "CLP"}
          >
            <SelectTrigger>
              <SelectValue placeholder="Moneda" />
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

        <Field
          label="M² terreno (opcional)"
          htmlFor="m2Terreno"
          error={err("m2Terreno")}
        >
          <Input
            id="m2Terreno"
            name="m2Terreno"
            type="number"
            step="0.01"
            min="0"
            placeholder="0"
            defaultValue={initial?.m2Terreno}
          />
        </Field>

        <Field
          label="M² construidos (opcional)"
          htmlFor="m2Construidos"
          error={err("m2Construidos")}
        >
          <Input
            id="m2Construidos"
            name="m2Construidos"
            type="number"
            step="0.01"
            min="0"
            placeholder="0"
            defaultValue={initial?.m2Construidos}
          />
        </Field>

        <Field
          label="Año construcción (opcional)"
          htmlFor="anoConstruccion"
          error={err("anoConstruccion")}
        >
          <Input
            id="anoConstruccion"
            name="anoConstruccion"
            type="number"
            step="1"
            min="1800"
            max="2100"
            placeholder="2000"
            defaultValue={initial?.anoConstruccion}
          />
        </Field>

        <div className="flex items-start gap-2 sm:col-span-2">
          <Checkbox
            id="exentaContribuciones"
            name="exentaContribuciones"
            value="true"
            uncheckedValue="false"
            defaultChecked={initial?.exentaContribuciones ?? false}
            className="mt-0.5"
          />
          <div className="flex flex-col gap-1">
            <Label htmlFor="exentaContribuciones">Exenta de contribuciones</Label>
            <p className="text-xs text-muted-foreground">
              No paga contribuciones: la ficha no pedirá las 4 cuotas.
            </p>
          </div>
        </div>
          </div>
        </CardContent>
      </Card>

      <PropertyFormEconomic initial={initial} err={err} />

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : submitLabel}
        </Button>
        <Button variant="outline" nativeButton={false} render={<Link href="/propiedades" />}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
