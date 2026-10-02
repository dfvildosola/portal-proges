"use client";

// Grupos económicos del formulario de propiedad: valor comercial, compra y
// deuda hipotecaria. Van dentro del <form> de property-form.tsx.

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
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
import { enumOptions, valorFuenteLabels } from "@/lib/domain";
import type { PropertyValues } from "./property-form";

// Etiquetas cortas para los selectores de moneda que van junto a un monto.
const monedaCorta = { CLP: "CLP", UF: "UF" };

// Sin fuente: se manda "" y la acción lo guarda como vacío.
const fuenteItems = { "": "Sin fuente", ...valorFuenteLabels };

function Field({
  label,
  htmlFor,
  error,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

// Un monto con su moneda al lado.
function MoneyField({
  label,
  name,
  monedaName,
  monto,
  moneda,
  error,
  className,
}: {
  label: string;
  name: string;
  monedaName: string;
  monto?: string;
  moneda: string;
  error?: string;
  className?: string;
}) {
  return (
    <Field label={label} htmlFor={name} error={error} className={className}>
      <div className="flex gap-2">
        <Input
          id={name}
          name={name}
          type="number"
          step="0.01"
          min="0"
          className="flex-1"
          defaultValue={monto}
        />
        <Select name={monedaName} items={monedaCorta} defaultValue={moneda}>
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {enumOptions(monedaCorta).map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </Field>
  );
}

export function PropertyFormEconomic({
  initial,
  err,
}: {
  initial?: PropertyValues;
  err: (field: string) => string | undefined;
}) {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Valor comercial</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <MoneyField
              label="Valor comercial (opcional)"
              name="valorComercial"
              monedaName="valorComercialMoneda"
              monto={initial?.valorComercial}
              moneda={initial?.valorComercialMoneda ?? "CLP"}
              error={err("valorComercial") ?? err("valorComercialMoneda")}
              className="sm:col-span-2"
            />

            <Field
              label="Fecha del valor"
              htmlFor="valorComercialFecha"
              error={err("valorComercialFecha")}
            >
              <Input
                id="valorComercialFecha"
                name="valorComercialFecha"
                type="date"
                defaultValue={initial?.valorComercialFecha}
              />
            </Field>

            <Field label="Fuente" error={err("valorComercialFuente")}>
              <Select
                name="valorComercialFuente"
                items={fuenteItems}
                defaultValue={initial?.valorComercialFuente ?? ""}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {enumOptions(fuenteItems).map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Compra</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Fecha de compra (opcional)"
              htmlFor="compraFecha"
              error={err("compraFecha")}
            >
              <Input
                id="compraFecha"
                name="compraFecha"
                type="date"
                defaultValue={initial?.compraFecha}
              />
            </Field>

            <MoneyField
              label="Precio de compra (opcional)"
              name="compraPrecio"
              monedaName="compraMoneda"
              monto={initial?.compraPrecio}
              moneda={initial?.compraMoneda ?? "CLP"}
              error={err("compraPrecio") ?? err("compraMoneda")}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Deuda hipotecaria</CardTitle>
          <CardDescription>
            Déjalo vacío si la propiedad no tiene deuda.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <MoneyField
              label="Saldo de la deuda"
              name="deudaSaldo"
              monedaName="deudaMoneda"
              monto={initial?.deudaSaldo}
              moneda={initial?.deudaMoneda ?? "UF"}
              error={err("deudaSaldo") ?? err("deudaMoneda")}
            />

            <Field label="Saldo al" htmlFor="deudaFecha" error={err("deudaFecha")}>
              <Input
                id="deudaFecha"
                name="deudaFecha"
                type="date"
                defaultValue={initial?.deudaFecha}
              />
            </Field>

            <Field label="Banco" htmlFor="deudaBanco" error={err("deudaBanco")}>
              <Input
                id="deudaBanco"
                name="deudaBanco"
                placeholder="Banco de Chile"
                defaultValue={initial?.deudaBanco}
              />
            </Field>

            <Field
              label="Dividendo mensual (misma moneda del saldo)"
              htmlFor="deudaDividendo"
              error={err("deudaDividendo")}
            >
              <Input
                id="deudaDividendo"
                name="deudaDividendo"
                type="number"
                step="0.01"
                min="0"
                defaultValue={initial?.deudaDividendo}
              />
            </Field>

            <Field
              label="Último dividendo (fin del crédito)"
              htmlFor="deudaTermino"
              error={err("deudaTermino")}
            >
              <Input
                id="deudaTermino"
                name="deudaTermino"
                type="date"
                defaultValue={initial?.deudaTermino}
              />
            </Field>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
