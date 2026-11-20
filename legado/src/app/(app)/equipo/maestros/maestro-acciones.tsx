"use client";

// Lo que se hace con un maestro que ya está en la lista: editar su especialidad y teléfono,
// activarlo o desactivarlo, y volver a copiar su nombre desde Odoo.

import { useCallback, useEffect, useState } from "react";
import { Pencil, RefreshCw } from "lucide-react";
import { useFormAction } from "@/hooks/use-form-action";
import { Field } from "@/components/field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  cambiarActivoMaestro,
  copiarNombreDesdeOdoo,
  editarMaestro,
  type MaestroFormState,
} from "./maestros-actions";

export type MaestroEditable = {
  id: string;
  nombre: string;
  especialidad: string | null;
  telefono: string | null;
  activo: boolean;
};

function EditarForm({ maestro, onListo }: { maestro: MaestroEditable; onListo: () => void }) {
  const [state, formProps, pending] = useFormAction(editarMaestro, {} as MaestroFormState);
  const err = (f: string) => state?.fieldErrors?.[f];

  const guardado = state?.ok === true;
  useEffect(() => {
    if (guardado) onListo();
  }, [guardado, onListo]);

  return (
    <form {...formProps} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={maestro.id} />
      <Field label="Especialidad" htmlFor={`esp-${maestro.id}`} error={err("especialidad")}>
        <Input id={`esp-${maestro.id}`} name="especialidad" defaultValue={maestro.especialidad ?? ""} />
      </Field>
      <Field label="Teléfono" htmlFor={`tel-${maestro.id}`} error={err("telefono")}>
        <Input
          id={`tel-${maestro.id}`}
          name="telefono"
          type="tel"
          defaultValue={maestro.telefono ?? ""}
        />
      </Field>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Guardando…" : "Guardar cambios"}
      </Button>
    </form>
  );
}

function MaestroEditar({ maestro }: { maestro: MaestroEditable }) {
  const [abierto, setAbierto] = useState(false);
  const cerrar = useCallback(() => setAbierto(false), []);

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger render={<Button variant="ghost" size="sm" />}>
        <Pencil className="size-4" />
        Editar
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{maestro.nombre}</DialogTitle>
        </DialogHeader>
        <EditarForm maestro={maestro} onListo={cerrar} />
      </DialogContent>
    </Dialog>
  );
}

// Un botón suelto que manda su propio formulario (activar, copiar nombre).
function BotonSuelto({
  accion,
  id,
  extra,
  children,
}: {
  accion: (prev: MaestroFormState, formData: FormData) => Promise<MaestroFormState>;
  id: string;
  extra?: { name: string; value: string };
  children: React.ReactNode;
}) {
  const [state, formProps, pending] = useFormAction(accion, {} as MaestroFormState);
  return (
    <form {...formProps} className="flex flex-col items-start gap-1">
      <input type="hidden" name="id" value={id} />
      {extra && <input type="hidden" name={extra.name} value={extra.value} />}
      <Button type="submit" variant="ghost" size="sm" disabled={pending}>
        {children}
      </Button>
      {state?.error && <p className="max-w-56 text-xs text-destructive">{state.error}</p>}
    </form>
  );
}

export function MaestroAcciones({ maestro }: { maestro: MaestroEditable }) {
  return (
    <div className="flex flex-wrap items-start justify-end gap-1">
      <MaestroEditar maestro={maestro} />
      <BotonSuelto accion={copiarNombreDesdeOdoo} id={maestro.id}>
        <RefreshCw className="size-4" />
        Nombre de Odoo
      </BotonSuelto>
      <BotonSuelto
        accion={cambiarActivoMaestro}
        id={maestro.id}
        extra={{ name: "activo", value: maestro.activo ? "no" : "si" }}
      >
        {maestro.activo ? "Desactivar" : "Reactivar"}
      </BotonSuelto>
    </div>
  );
}
