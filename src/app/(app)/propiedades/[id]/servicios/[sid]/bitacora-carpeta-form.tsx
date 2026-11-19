"use client";

// Aviso de la bitácora cuando la propiedad no tiene carpeta del Drive: se pega el enlace de la
// carpeta y queda guardada. Sin carpeta se pueden anotar notas, pero no subir fotos.

import { FolderInput } from "lucide-react";
import { useFormAction } from "@/hooks/use-form-action";
import { Field } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { enlazarCarpeta } from "./bitacora-actions";
import type { BitacoraFormState } from "./bitacora-actions";

export function BitacoraCarpetaForm({ servicioEnCursoId }: { servicioEnCursoId: string }) {
  const [state, formProps, pending] = useFormAction(enlazarCarpeta, {} as BitacoraFormState);

  return (
    <form {...formProps} className="flex flex-col gap-3 rounded-lg bg-warning-soft p-3 text-warning-soft-foreground">
      <input type="hidden" name="servicioId" value={servicioEnCursoId} />
      <p className="flex items-start gap-2 text-sm font-medium">
        <FolderInput className="mt-0.5 size-4 shrink-0" />
        Enlaza la carpeta del Drive de esta propiedad para subir fotos
      </p>
      <Field
        label="Enlace de la carpeta"
        htmlFor="bitacora-carpeta"
        error={state?.fieldErrors?.carpeta}
        hint="Abre la carpeta en Drive, copia la dirección del navegador y pégala acá."
      >
        <Input
          id="bitacora-carpeta"
          name="carpeta"
          inputMode="url"
          placeholder="https://drive.google.com/drive/folders/…"
          className="h-11 text-base"
        />
      </Field>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending} className="h-11 text-base">
        {pending ? "Guardando…" : "Enlazar carpeta"}
      </Button>
    </form>
  );
}
