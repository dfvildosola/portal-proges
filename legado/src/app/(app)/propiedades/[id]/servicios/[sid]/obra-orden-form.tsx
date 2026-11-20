"use client";

// Los formularios de la orden de Odoo de un proyecto (solo equipo):
//  - EnlazarOrdenForm: pide el número, muestra lo que se va a enlazar y pide confirmar.
//  - VolverATraerBoton: pone la orden al día con lo que cambió en Odoo.
//
// Enlazar tiene dos pasos a propósito: la cuenta analítica sola no basta para saber que la orden
// es de esta unidad, así que el equipo la ve y confirma (ADR 0012). Los dos pasos son dos
// formularios: el segundo lleva el número ya revisado, y el servidor vuelve a leer la orden.

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Link2, RefreshCw } from "lucide-react";
import { useFormAction } from "@/hooks/use-form-action";
import { formatMoney } from "@/lib/format";
import { Field } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { enlazarOrden, revisarOrden, volverATraerOrden } from "./orden-actions";
import type { OrdenFormState, RevisionOrden } from "./orden-actions";

export function EnlazarOrdenForm({ servicioId }: { servicioId: string }) {
  const [state, formProps, pending] = useFormAction(revisarOrden, {} as OrdenFormState);
  // Al cancelar se descarta esa revisión; una nueva respuesta del servidor trae otra y reaparece.
  const [descartada, setDescartada] = useState<RevisionOrden | null>(null);
  const revision = state?.revision && state.revision !== descartada ? state.revision : null;

  return (
    <div className="flex flex-col gap-4">
      <form {...formProps} className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <input type="hidden" name="servicioId" value={servicioId} />
        <Field
          label="Número de la orden en Odoo"
          htmlFor="orden-numero"
          error={state?.fieldErrors?.numero}
          hint="Por ejemplo S00047. Se lee de Odoo; el portal no escribe nada ahí."
          className="sm:flex-1"
        >
          <Input id="orden-numero" name="numero" placeholder="S00047" autoComplete="off" />
        </Field>
        <Button type="submit" variant="outline" disabled={pending} className="sm:mt-[1.375rem]">
          <Link2 />
          {pending ? "Leyendo Odoo…" : "Revisar orden"}
        </Button>
      </form>

      {state?.error && !state.fieldErrors && <p className="text-sm text-destructive">{state.error}</p>}

      {revision && <Revision revision={revision} servicioId={servicioId} onCancelar={() => setDescartada(revision)} />}
    </div>
  );
}

function Revision({
  revision: r,
  servicioId,
  onCancelar,
}: {
  revision: RevisionOrden;
  servicioId: string;
  onCancelar: () => void;
}) {
  const [state, formProps, pending] = useFormAction(enlazarOrden, {} as OrdenFormState);
  const calza = r.veredicto === "calza" && r.avisos.length === 0;

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-3">
      <div>
        <p className="text-sm font-medium">
          Orden {r.numero}
          {r.clienteOdoo ? ` · ${r.clienteOdoo}` : ""}
        </p>
        <p className="text-sm text-muted-foreground">
          {r.partidas} partidas en {r.recintos > 0 ? `${r.recintos} recintos` : "una lista sin recintos"} · total{" "}
          {formatMoney(r.total, r.moneda)} · facturado al dueño {formatMoney(r.facturado, r.moneda)} (
          {r.anticipos} anticipos)
        </p>
      </div>

      <div
        className={`flex gap-2 rounded-md p-2 text-sm ${
          calza ? "bg-success-soft text-success-soft-foreground" : "bg-warning-soft text-warning-soft-foreground"
        }`}
      >
        {calza ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> : <AlertTriangle className="mt-0.5 size-4 shrink-0" />}
        <div className="flex flex-col gap-1">
          <p>
            Proyecto en <strong>{r.propiedad}</strong>. {r.mensajeCuenta}
          </p>
          {r.avisos.map((a) => (
            <p key={a}>{a}</p>
          ))}
        </div>
      </div>

      <form {...formProps} className="flex flex-col gap-2">
        <input type="hidden" name="servicioId" value={servicioId} />
        <input type="hidden" name="numero" value={r.numero} />
        {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Enlazando…" : `Confirmar: es de ${r.propiedad}`}
          </Button>
          <Button type="button" variant="ghost" onClick={onCancelar} disabled={pending}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}

export function VolverATraerBoton({ servicioId }: { servicioId: string }) {
  const [state, formProps, pending] = useFormAction(volverATraerOrden, {} as OrdenFormState);

  return (
    <form {...formProps} className="flex flex-col items-start gap-1 sm:items-end">
      <input type="hidden" name="servicioId" value={servicioId} />
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        <RefreshCw className={pending ? "animate-spin" : undefined} />
        {pending ? "Leyendo Odoo…" : "Volver a traer"}
      </Button>
      {state?.error && <p className="text-xs text-destructive">{state.error}</p>}
      {state?.ok && state.mensaje && <p className="text-xs text-muted-foreground">{state.mensaje}</p>}
    </form>
  );
}
