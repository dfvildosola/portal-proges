"use client";

// Formulario de una etapa, para crear (con `tipo`) y para editar (con `etapa`).
// Va dentro de un diálogo (etapa-dialogo.tsx). Renombrar y cambiar las marcas es el mismo
// formulario: el historial guarda el nombre como texto, así que renombrar no lo toca.

import { useEffect, useState } from "react";
import { useFormAction } from "@/hooks/use-form-action";
import { Field } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ServicioTipo } from "@/generated/prisma/enums";
import { agregarEtapa, editarEtapa } from "./etapas-actions";

export type EtapaValores = {
  id: string;
  nombre: string;
  cierraServicio: boolean;
  propiedadPublicada: boolean;
};

export function EtapaForm({
  tipo,
  etapa,
  esComercial,
  onListo,
}: {
  tipo: ServicioTipo; // el tipo al que pertenece (al editar no cambia)
  etapa?: EtapaValores;
  esComercial: boolean; // la marca «propiedad publicada» solo se ofrece en venta y arriendo
  onListo: () => void;
}) {
  const [state, formProps, pending] = useFormAction(etapa ? editarEtapa : agregarEtapa, {});
  const err = (f: string) => state?.fieldErrors?.[f];

  const [cierra, setCierra] = useState(etapa?.cierraServicio ?? false);
  const [publicada, setPublicada] = useState(etapa?.propiedadPublicada ?? false);

  // Cuando el servidor confirma que guardó, se avisa al diálogo para que se cierre.
  const guardado = state?.ok === true;
  useEffect(() => {
    if (guardado) onListo();
  }, [guardado, onListo]);

  return (
    <form {...formProps} className="flex flex-col gap-4">
      {etapa ? (
        <input type="hidden" name="id" value={etapa.id} />
      ) : (
        <input type="hidden" name="tipo" value={tipo} />
      )}
      {cierra && <input type="hidden" name="cierraServicio" value="on" />}
      {esComercial && publicada && (
        <input type="hidden" name="propiedadPublicada" value="on" />
      )}

      <Field label="Nombre de la etapa" htmlFor="nombre-etapa" error={err("nombre")}>
        <Input
          id="nombre-etapa"
          name="nombre"
          defaultValue={etapa?.nombre}
          placeholder="Por ejemplo: En evaluación"
          maxLength={80}
        />
      </Field>

      <div className="flex items-start gap-2">
        <Checkbox id="marca-cierra" checked={cierra} onCheckedChange={setCierra} className="mt-0.5" />
        <Label htmlFor="marca-cierra" className="flex-col items-start gap-0.5">
          Cierra el servicio
          <span className="text-xs font-normal text-muted-foreground">
            Un servicio que llega a esta etapa se da por terminado.
          </span>
        </Label>
      </div>

      {esComercial && (
        <div className="flex items-start gap-2">
          <Checkbox
            id="marca-publicada"
            checked={publicada}
            onCheckedChange={setPublicada}
            className="mt-0.5"
          />
          <Label htmlFor="marca-publicada" className="flex-col items-start gap-0.5">
            Propiedad publicada
            <span className="text-xs font-normal text-muted-foreground">
              Mientras un servicio está en esta etapa, la propiedad cuenta como publicada.
              Si cambias esta marca, los «días publicada» se recalculan también para los
              servicios ya hechos.
            </span>
          </Label>
        </div>
      )}

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Guardando…" : etapa ? "Guardar cambios" : "Agregar etapa"}
      </Button>
    </form>
  );
}
