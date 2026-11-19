"use client";

// Formulario «Responsable y nota» y botón «Confirmar» del servicio.

import { useState } from "react";
import { Check } from "lucide-react";
import { useFormAction } from "@/hooks/use-form-action";
import { Field } from "@/components/field";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cambiarDetalle, confirmarServicio } from "../../../servicios-actions";
import type { ServicioFormState } from "../../../servicios-actions";

// Valor del selector para «sin responsable». Al servidor viaja vacío.
const NADIE = "NADIE";

export function DetalleForm({
  propertyId,
  servicioId,
  responsableId,
  nota,
  responsables,
}: {
  propertyId: string;
  servicioId: string;
  responsableId: string | null;
  nota: string | null;
  responsables: { id: string; nombre: string }[];
}) {
  const [state, formProps, pending] = useFormAction(cambiarDetalle, {} as ServicioFormState);
  const err = (f: string) => state?.fieldErrors?.[f];
  const [elegido, setElegido] = useState(responsableId ?? "");

  const items: Record<string, string> = {
    [NADIE]: "Sin responsable",
    ...Object.fromEntries(responsables.map((r) => [r.id, r.nombre])),
  };

  return (
    <form {...formProps} className="flex flex-col gap-4">
      <input type="hidden" name="propertyId" value={propertyId} />
      <input type="hidden" name="servicioId" value={servicioId} />
      <input type="hidden" name="responsableId" value={elegido} />

      <Field label="Responsable" error={err("responsableId")}>
        <Select
          items={items}
          value={elegido || NADIE}
          onValueChange={(v) => setElegido(!v || v === NADIE ? "" : v)}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(items).map(([valor, nombre]) => (
              <SelectItem key={valor} value={valor}>
                {nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Nota" htmlFor="detalle-nota" error={err("nota")}>
        <Textarea id="detalle-nota" name="nota" rows={3} defaultValue={nota ?? ""} />
      </Field>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.ok && <p className="text-sm text-success">Guardado.</p>}

      <Button type="submit" variant="outline" disabled={pending} className="self-start">
        {pending ? "Guardando…" : "Guardar"}
      </Button>
    </form>
  );
}

// Para un servicio «por confirmar»: una persona del equipo lo revisó y lo da por bueno.
export function ConfirmarBoton({
  propertyId,
  servicioId,
}: {
  propertyId: string;
  servicioId: string;
}) {
  const [state, formProps, pending] = useFormAction(confirmarServicio, {} as ServicioFormState);

  return (
    <form {...formProps} className="flex flex-col gap-2">
      <input type="hidden" name="propertyId" value={propertyId} />
      <input type="hidden" name="servicioId" value={servicioId} />
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending} className="self-start">
        <Check className="size-4" />
        {pending ? "Confirmando…" : "Confirmar servicio"}
      </Button>
    </form>
  );
}
