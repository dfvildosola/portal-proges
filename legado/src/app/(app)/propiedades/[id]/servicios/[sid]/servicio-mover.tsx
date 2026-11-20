"use client";

// Formulario «Mover de etapa»: se puede elegir cualquier etapa activa del tipo
// de servicio (no solo la siguiente), con una nota opcional que queda en el historial.

import { useState } from "react";
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
import { moverEtapa } from "../../../servicios-actions";
import type { ServicioFormState } from "../../../servicios-actions";

export type EtapaOpcion = { id: string; nombre: string; cierraServicio: boolean };

export function MoverEtapaForm({
  propertyId,
  servicioId,
  etapas,
}: {
  propertyId: string;
  servicioId: string;
  // Las etapas activas del tipo, sin la actual.
  etapas: EtapaOpcion[];
}) {
  const [etapaId, setEtapaId] = useState("");
  const [state, formProps, pending] = useFormAction(
    async (prev: ServicioFormState, formData: FormData) => {
      const result = await moverEtapa(prev, formData);
      if (result.ok) setEtapaId(""); // el formulario se limpia; el selector también
      return result;
    },
    {} as ServicioFormState,
  );
  const err = (f: string) => state?.fieldErrors?.[f];

  const nombreDe = (e: EtapaOpcion) => (e.cierraServicio ? `${e.nombre} (cierra el servicio)` : e.nombre);
  const items = Object.fromEntries(etapas.map((e) => [e.id, nombreDe(e)]));
  const elegida = etapas.find((e) => e.id === etapaId);

  return (
    <form {...formProps} className="flex flex-col gap-4">
      <input type="hidden" name="propertyId" value={propertyId} />
      <input type="hidden" name="servicioId" value={servicioId} />
      <input type="hidden" name="etapaId" value={etapaId} />

      <Field
        label="Nueva etapa"
        error={err("etapaId")}
        hint={elegida?.cierraServicio ? "Al mover aquí el servicio queda terminado." : undefined}
      >
        <Select items={items} value={etapaId || null} onValueChange={(v) => setEtapaId(v ?? "")}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Elige la etapa" />
          </SelectTrigger>
          <SelectContent>
            {etapas.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {nombreDe(e)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Nota (opcional)" htmlFor="mover-nota" error={err("nota")}>
        <Textarea id="mover-nota" name="nota" rows={2} />
      </Field>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" disabled={pending || etapaId === ""} className="self-start">
        {pending ? "Moviendo…" : "Mover de etapa"}
      </Button>
    </form>
  );
}
