"use client";

// Las dos fechas de la obra: cuándo empezó y cuándo se le prometió al dueño que termina.
// Son fechas «solo día»: el formulario las manda como AAAA-MM-DD y el servidor las guarda a
// medianoche UTC.

import { useFormAction } from "@/hooks/use-form-action";
import { Field } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { guardarFechasObra, type ObraFormState } from "./obra-presupuestos-actions";

export function ObraFechasForm({
  servicioEnCursoId,
  inicioObra,
  fechaComprometida,
}: {
  servicioEnCursoId: string;
  inicioObra: string; // AAAA-MM-DD o ""
  fechaComprometida: string; // AAAA-MM-DD o ""
}) {
  const [state, formProps, pending] = useFormAction(guardarFechasObra, {} as ObraFormState);
  const err = (f: string) => state?.fieldErrors?.[f];

  return (
    <form {...formProps} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="servicioEnCursoId" value={servicioEnCursoId} />
      <Field label="Inicio de la obra" htmlFor="obra-inicio" error={err("inicioObra")} className="min-w-40 flex-1">
        <Input id="obra-inicio" name="inicioObra" type="date" defaultValue={inicioObra} />
      </Field>
      <Field
        label="Fecha comprometida al dueño"
        htmlFor="obra-comprometida"
        error={err("fechaComprometida")}
        className="min-w-40 flex-1"
      >
        <Input id="obra-comprometida" name="fechaComprometida" type="date" defaultValue={fechaComprometida} />
      </Field>
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {pending ? "Guardando…" : "Guardar fechas"}
      </Button>
      {state?.ok && <p className="text-xs text-success">Fechas guardadas.</p>}
      {state?.error && !state.fieldErrors && <p className="w-full text-sm text-destructive">{state.error}</p>}
    </form>
  );
}
