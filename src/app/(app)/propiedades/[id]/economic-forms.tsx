"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  movementTypeLabels,
  movementCategoryLabels,
  currencyLabels,
  billTypeLabels,
  enumOptions,
} from "@/lib/domain";
import { addMovement, addTax, generateYearTaxes, updateTaxMonto } from "../actions";
import { addBill } from "../../cuentas/actions";
import type { BillFormState } from "../../cuentas/actions";
import type { MovementFormState, TaxFormState } from "../actions";

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

export function AddMovementForm({ propertyId }: { propertyId: string }) {
  const [state, formAction, pending] = useActionState(addMovement, {} as MovementFormState);
  const err = (f: string) => state?.fieldErrors?.[f];

  return (
    <form action={formAction} className="w-full space-y-3">
      <input type="hidden" name="propertyId" value={propertyId} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Tipo" error={err("tipo")}>
          <Select name="tipo" defaultValue="INGRESO">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {enumOptions(movementTypeLabels).map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Categoría" error={err("categoria")}>
          <Select name="categoria" defaultValue="ARRIENDO">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {enumOptions(movementCategoryLabels).map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Fecha" htmlFor="fecha" error={err("fecha")}>
          <Input id="fecha" name="fecha" type="date" />
        </Field>
      </div>
      <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[1fr_auto_1fr_auto]">
        <Field label="Monto" htmlFor="mov-monto" error={err("monto")}>
          <Input
            id="mov-monto"
            name="monto"
            type="number"
            step="0.01"
            min="0"
            placeholder="0"
          />
        </Field>
        <Field label="Moneda" error={err("moneda")}>
          <Select name="moneda" defaultValue="CLP">
            <SelectTrigger className="w-28">
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
        <Field label="Descripción (opcional)" htmlFor="descripcion" error={err("descripcion")}>
          <Input id="descripcion" name="descripcion" placeholder="Observaciones" />
        </Field>
        <div className="flex items-end pb-0">
          <Button type="submit" variant="outline" disabled={pending}>
            Agregar
          </Button>
        </div>
      </div>
      {state?.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
    </form>
  );
}

export function GenerateYearTaxesForm({ propertyId }: { propertyId: string }) {
  const currentYear = new Date().getFullYear();
  return (
    <form action={generateYearTaxes} className="flex items-end gap-2">
      <input type="hidden" name="propertyId" value={propertyId} />
      <Field label="Año" htmlFor="gen-anio">
        <Input
          id="gen-anio"
          name="anio"
          type="number"
          step="1"
          min="2000"
          max="2100"
          defaultValue={currentYear}
          className="w-24"
        />
      </Field>
      <Button type="submit" variant="outline">
        Generar cuotas del año
      </Button>
    </form>
  );
}

export function UpdateTaxMontoForm({
  taxId,
  propertyId,
}: {
  taxId: string;
  propertyId: string;
}) {
  return (
    <form action={updateTaxMonto} className="flex items-center gap-1">
      <input type="hidden" name="taxId" value={taxId} />
      <input type="hidden" name="propertyId" value={propertyId} />
      <Input
        name="monto"
        type="number"
        step="0.01"
        min="0"
        placeholder="Ingresar monto"
        className="h-7 w-36 text-xs"
        required
      />
      <Button type="submit" size="sm" variant="outline" className="h-7 px-2 text-xs">
        Guardar
      </Button>
    </form>
  );
}

export function AddTaxForm({ propertyId }: { propertyId: string }) {
  const [state, formAction, pending] = useActionState(addTax, {} as TaxFormState);
  const err = (f: string) => state?.fieldErrors?.[f];

  return (
    <form action={formAction} className="w-full">
      <input type="hidden" name="propertyId" value={propertyId} />
      <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[auto_auto_1fr_auto]">
        <Field label="Año" htmlFor="tax-anio" error={err("anio")}>
          <Input
            id="tax-anio"
            name="anio"
            type="number"
            step="1"
            min="2000"
            max="2100"
            placeholder="2026"
            className="w-24"
          />
        </Field>
        <Field label="Cuota" error={err("cuota")}>
          <Select name="cuota" defaultValue="1">
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["1", "2", "3", "4"].map((v) => (
                <SelectItem key={v} value={v}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Monto (opcional)" htmlFor="tax-monto" error={err("monto")}>
          <Input
            id="tax-monto"
            name="monto"
            type="number"
            step="0.01"
            min="0"
            placeholder="Sin monto"
          />
        </Field>
        <div className="flex items-end">
          <Button type="submit" variant="outline" disabled={pending}>
            Agregar
          </Button>
        </div>
      </div>
      {state?.error && (
        <p className="mt-2 text-sm text-destructive">{state.error}</p>
      )}
    </form>
  );
}

export function AddBillForm({ propertyId }: { propertyId: string }) {
  const [state, formAction, pending] = useActionState(addBill, {} as BillFormState);
  const err = (f: string) => state?.fieldErrors?.[f];

  return (
    <form action={formAction} className="w-full space-y-3">
      <input type="hidden" name="propertyId" value={propertyId} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Tipo" error={err("tipo")}>
          <Select name="tipo" defaultValue="GASTO_COMUN">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {enumOptions(billTypeLabels).map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Período (AAAA-MM)" htmlFor="bill-periodo" error={err("periodo")}>
          <Input id="bill-periodo" name="periodo" placeholder="2026-10" maxLength={7} />
        </Field>
        <Field label="Vence" htmlFor="bill-vence" error={err("fechaVencimiento")}>
          <Input id="bill-vence" name="fechaVencimiento" type="date" />
        </Field>
      </div>
      <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[1fr_auto_1fr_auto]">
        <Field label="Monto (opcional)" htmlFor="bill-monto" error={err("monto")}>
          <Input
            id="bill-monto"
            name="monto"
            type="number"
            step="0.01"
            min="0"
            placeholder="Sin monto"
          />
        </Field>
        <Field label="Moneda" error={err("moneda")}>
          <Select name="moneda" defaultValue="CLP">
            <SelectTrigger className="w-28">
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
        <Field label="Notas (opcional)" htmlFor="bill-notas" error={err("notas")}>
          <Input id="bill-notas" name="notas" placeholder="Observaciones" />
        </Field>
        <Button type="submit" variant="outline" disabled={pending}>
          Agregar
        </Button>
      </div>
      {state?.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
    </form>
  );
}
