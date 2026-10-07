"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/field";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { TenantFormState } from "./actions";

export type TenantValues = {
  id?: string;
  nombre?: string;
  rut?: string;
  email?: string;
  telefono?: string;
};

export function TenantForm({
  action,
  initial,
  submitLabel,
}: {
  action: (prev: TenantFormState, fd: FormData) => Promise<TenantFormState>;
  initial?: TenantValues;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const err = (f: string) => state?.fieldErrors?.[f];

  return (
    <form action={formAction} className="max-w-2xl">
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos del contacto</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Nombre o razón social" htmlFor="nombre" error={err("nombre")}>
              <Input
                id="nombre"
                name="nombre"
                defaultValue={initial?.nombre}
                placeholder="Juan Pérez / Comercial Sur SpA"
              />
            </Field>

            <Field label="RUT" htmlFor="rut" error={err("rut")}>
              <Input
                id="rut"
                name="rut"
                defaultValue={initial?.rut}
                placeholder="12.345.678-9"
              />
            </Field>

            <Field label="Email (opcional)" htmlFor="email" error={err("email")}>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={initial?.email}
                placeholder="correo@ejemplo.cl"
              />
            </Field>

            <Field label="Teléfono (opcional)" htmlFor="telefono" error={err("telefono")}>
              <Input
                id="telefono"
                name="telefono"
                defaultValue={initial?.telefono}
                placeholder="+56 9 1234 5678"
              />
            </Field>
          </div>

          {state?.error && (
            <p className="mt-4 text-sm text-destructive">{state.error}</p>
          )}
        </CardContent>
        <CardFooter className="gap-3 border-t">
          <Button type="submit" disabled={pending}>
            {pending ? "Guardando…" : submitLabel}
          </Button>
          <Button variant="outline" nativeButton={false} render={<Link href="/contactos" />}>
            Cancelar
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
