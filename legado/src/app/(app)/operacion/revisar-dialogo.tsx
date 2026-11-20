"use client";

// «Revisar» un proyecto que nació de un pedido: la jefatura elige qué servicio del catálogo es
// (parte con el que se abrió solo), quién lo lleva y una nota. El formulario solo existe
// mientras el diálogo está abierto, así que parte limpio.
// El catálogo llega ya filtrado por las familias del tipo pedido (familiasDelTipo).

import { useCallback, useEffect, useState } from "react";
import { useFormAction } from "@/hooks/use-form-action";
import { Field } from "@/components/field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { revisarProyecto, type RevisionFormState } from "./revisar-actions";

export type OpcionCatalogo = { id: string; codigo: string; nombre: string };
export type OpcionResponsable = { id: string; nombre: string };

// Valor del selector para «sin responsable». Al servidor viaja vacío.
const NADIE = "NADIE";

export function RevisarDialogo({
  servicioEnCursoId,
  servicioActualId,
  tipoNombre,
  catalogo,
  responsables,
}: {
  servicioEnCursoId: string;
  servicioActualId: string; // el servicio con que se abrió solo
  tipoNombre: string;
  catalogo: OpcionCatalogo[];
  responsables: OpcionResponsable[];
}) {
  const [abierto, setAbierto] = useState(false);
  const cerrar = useCallback(() => setAbierto(false), []);

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger render={<Button size="sm" />}>Revisar</DialogTrigger>
      <DialogContent className="max-h-[90svh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Revisar pedido</DialogTitle>
          <DialogDescription>
            Confirma qué servicio de {tipoNombre.toLowerCase()} es y quién lo lleva. El proyecto
            sale de «por revisar» y la tarea de revisión queda hecha.
          </DialogDescription>
        </DialogHeader>
        <RevisarForm
          servicioEnCursoId={servicioEnCursoId}
          servicioActualId={servicioActualId}
          catalogo={catalogo}
          responsables={responsables}
          onListo={cerrar}
        />
      </DialogContent>
    </Dialog>
  );
}

function RevisarForm({
  servicioEnCursoId,
  servicioActualId,
  catalogo,
  responsables,
  onListo,
}: {
  servicioEnCursoId: string;
  servicioActualId: string;
  catalogo: OpcionCatalogo[];
  responsables: OpcionResponsable[];
  onListo: () => void;
}) {
  const [state, formProps, pending] = useFormAction(revisarProyecto, {} as RevisionFormState);
  const err = (f: string) => state?.fieldErrors?.[f];

  const [servicioId, setServicioId] = useState(
    catalogo.some((s) => s.id === servicioActualId) ? servicioActualId : "",
  );
  const [responsableId, setResponsableId] = useState("");

  const guardado = state?.ok === true;
  useEffect(() => {
    if (guardado) onListo();
  }, [guardado, onListo]);

  const itemsServicio = Object.fromEntries(catalogo.map((s) => [s.id, `${s.codigo} · ${s.nombre}`]));
  const itemsResponsable: Record<string, string> = {
    [NADIE]: "Sin responsable",
    ...Object.fromEntries(responsables.map((r) => [r.id, r.nombre])),
  };

  return (
    <form {...formProps} className="flex flex-col gap-4">
      <input type="hidden" name="servicioEnCursoId" value={servicioEnCursoId} />
      <input type="hidden" name="servicioId" value={servicioId} />
      <input type="hidden" name="responsableId" value={responsableId} />

      <Field label="Servicio del catálogo" error={err("servicioId")}>
        <Select
          items={itemsServicio}
          value={servicioId || null}
          onValueChange={(v) => setServicioId(v ?? "")}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Elige el servicio" />
          </SelectTrigger>
          <SelectContent>
            {catalogo.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.codigo} · {s.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Responsable (opcional)" error={err("responsableId")}>
        <Select
          items={itemsResponsable}
          value={responsableId || NADIE}
          onValueChange={(v) => setResponsableId(!v || v === NADIE ? "" : v)}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(itemsResponsable).map(([valor, nombre]) => (
              <SelectItem key={valor} value={valor}>
                {nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Nota (opcional)" htmlFor={`revisar-nota-${servicioEnCursoId}`} error={err("nota")}>
        <Textarea id={`revisar-nota-${servicioEnCursoId}`} name="nota" rows={3} />
      </Field>

      {state?.error && !state.fieldErrors && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Guardando…" : "Aceptar y repartir"}
      </Button>
    </form>
  );
}
