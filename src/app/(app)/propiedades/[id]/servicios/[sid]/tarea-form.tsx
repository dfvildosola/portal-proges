"use client";

// Los formularios y botones de las tareas: agregar, editar, marcar hecha o deshacer, y borrar.
// Son piezas sueltas porque se usan en tres pantallas: la sección de tareas del proyecto,
// «Mi trabajo» (solo el botón «Hecha») y «Trabajo del equipo».
// Pensado para el celular: los campos ocupan todo el ancho y se apilan.

import { useCallback, useEffect, useState } from "react";
import { Check, Pencil, Plus, Trash2, Undo2 } from "lucide-react";
import { useFormAction } from "@/hooks/use-form-action";
import { Field } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
import { toDateInputValue } from "@/lib/format";
import {
  agregarTarea,
  borrarTarea,
  editarTarea,
  marcarTarea,
  type TareaFormState,
} from "./tareas-actions";

export type OpcionResponsable = { id: string; nombre: string };

// Valor del selector para «sin responsable». Al servidor viaja vacío.
const NADIE = "NADIE";

// El selector de responsable: guarda su valor en un campo oculto para que viaje en el formulario.
function SelectorResponsable({
  responsables,
  valor,
  onCambio,
  error,
}: {
  responsables: OpcionResponsable[];
  valor: string;
  onCambio: (v: string) => void;
  error?: string;
}) {
  const items: Record<string, string> = {
    [NADIE]: "Sin responsable",
    ...Object.fromEntries(responsables.map((r) => [r.id, r.nombre])),
  };
  return (
    <Field label="Responsable" error={error}>
      <input type="hidden" name="responsableId" value={valor} />
      <Select
        items={items}
        value={valor || NADIE}
        onValueChange={(v) => onCambio(!v || v === NADIE ? "" : v)}
      >
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(items).map(([id, nombre]) => (
            <SelectItem key={id} value={id}>
              {nombre}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

// ---------------------------------------------------------------------------
// Agregar
// ---------------------------------------------------------------------------

export function TareaAgregarForm({
  servicioEnCursoId,
  responsables,
}: {
  servicioEnCursoId: string;
  responsables: OpcionResponsable[];
}) {
  const [state, formProps, pending] = useFormAction(agregarTarea, {} as TareaFormState);
  const err = (f: string) => state?.fieldErrors?.[f];
  // El responsable no se vacía al guardar: se suelen anotar varias tareas para la misma persona.
  const [responsableId, setResponsableId] = useState("");

  return (
    <form {...formProps} className="grid gap-3 rounded-xl border p-3 sm:grid-cols-2">
      <input type="hidden" name="servicioEnCursoId" value={servicioEnCursoId} />
      <Field label="Nueva tarea" htmlFor={`tarea-que-${servicioEnCursoId}`} error={err("que")} className="sm:col-span-2">
        <Input
          id={`tarea-que-${servicioEnCursoId}`}
          name="que"
          maxLength={300}
          placeholder="Por ejemplo: pedir cotización de pintura"
        />
      </Field>
      <SelectorResponsable
        responsables={responsables}
        valor={responsableId}
        onCambio={setResponsableId}
        error={err("responsableId")}
      />
      <Field label="Para cuándo" htmlFor={`tarea-vence-${servicioEnCursoId}`} error={err("vence")}>
        <Input id={`tarea-vence-${servicioEnCursoId}`} name="vence" type="date" />
      </Field>
      {state?.error && !state.fieldErrors && (
        <p className="text-sm text-destructive sm:col-span-2">{state.error}</p>
      )}
      <div className="sm:col-span-2">
        <Button type="submit" size="sm" disabled={pending}>
          <Plus className="size-4" />
          {pending ? "Guardando…" : "Agregar tarea"}
        </Button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Editar
// ---------------------------------------------------------------------------

export function TareaEditarDialogo({
  tarea,
  responsables,
}: {
  tarea: { id: string; que: string; responsableId: string | null; vence: Date | null };
  responsables: OpcionResponsable[];
}) {
  const [abierto, setAbierto] = useState(false);
  const cerrar = useCallback(() => setAbierto(false), []);
  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger render={<Button size="icon-sm" variant="ghost" aria-label="Editar tarea" />}>
        <Pencil className="size-3.5" />
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar tarea</DialogTitle>
          <DialogDescription>Cambia qué hay que hacer, quién lo hace o para cuándo.</DialogDescription>
        </DialogHeader>
        <EditarForm tarea={tarea} responsables={responsables} onListo={cerrar} />
      </DialogContent>
    </Dialog>
  );
}

function EditarForm({
  tarea,
  responsables,
  onListo,
}: {
  tarea: { id: string; que: string; responsableId: string | null; vence: Date | null };
  responsables: OpcionResponsable[];
  onListo: () => void;
}) {
  const [state, formProps, pending] = useFormAction(editarTarea, {} as TareaFormState);
  const err = (f: string) => state?.fieldErrors?.[f];
  const [responsableId, setResponsableId] = useState(tarea.responsableId ?? "");

  const guardado = state?.ok === true;
  useEffect(() => {
    if (guardado) onListo();
  }, [guardado, onListo]);

  return (
    <form {...formProps} className="flex flex-col gap-4">
      <input type="hidden" name="tareaId" value={tarea.id} />
      <Field label="Qué hay que hacer" htmlFor={`editar-que-${tarea.id}`} error={err("que")}>
        <Input id={`editar-que-${tarea.id}`} name="que" defaultValue={tarea.que} maxLength={300} />
      </Field>
      <SelectorResponsable
        responsables={responsables}
        valor={responsableId}
        onCambio={setResponsableId}
        error={err("responsableId")}
      />
      <Field label="Para cuándo" htmlFor={`editar-vence-${tarea.id}`} error={err("vence")}>
        <Input
          id={`editar-vence-${tarea.id}`}
          name="vence"
          type="date"
          defaultValue={toDateInputValue(tarea.vence)}
        />
      </Field>
      {state?.error && !state.fieldErrors && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Guardando…" : "Guardar cambios"}
      </Button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Marcar hecha o deshacer
// ---------------------------------------------------------------------------

// El botón «Hecha» (o «Deshacer», si la tarea ya está hecha).
export function TareaMarcarBoton({ tareaId, hecha }: { tareaId: string; hecha: boolean }) {
  const [state, formProps, pending] = useFormAction(marcarTarea, {} as TareaFormState);
  return (
    <form {...formProps} className="flex flex-col items-end gap-1">
      <input type="hidden" name="tareaId" value={tareaId} />
      <input type="hidden" name="hecha" value={hecha ? "0" : "1"} />
      <Button type="submit" size="sm" variant={hecha ? "ghost" : "outline"} disabled={pending}>
        {hecha ? <Undo2 className="size-3.5" /> : <Check className="size-3.5" />}
        {hecha ? "Deshacer" : "Hecha"}
      </Button>
      {state?.error && <p className="text-xs text-destructive">{state.error}</p>}
    </form>
  );
}

// ---------------------------------------------------------------------------
// Borrar
// ---------------------------------------------------------------------------

export function TareaBorrarBoton({ tareaId }: { tareaId: string }) {
  const [state, formProps, pending] = useFormAction(borrarTarea, {} as TareaFormState);
  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Borrar tarea"
            className="text-destructive hover:text-destructive"
          />
        }
      >
        <Trash2 className="size-3.5" />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Borrar esta tarea?</AlertDialogTitle>
          <AlertDialogDescription>
            Solo se borran las tareas sin hacer. Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <form {...formProps}>
            <input type="hidden" name="tareaId" value={tareaId} />
            <Button type="submit" variant="destructive" disabled={pending}>
              <Trash2 className="size-4" />
              {pending ? "Borrando…" : "Borrar"}
            </Button>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
