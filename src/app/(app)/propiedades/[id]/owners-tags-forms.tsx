"use client";

import { useActionState, useState, type ReactNode } from "react";
import { Plus } from "lucide-react";
import type { OwnerType } from "@/generated/prisma/enums";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ownerTypeLabels,
  propertyUnitTypeLabels,
  enumOptions,
} from "@/lib/domain";
import { addOwner, addTag, addUnit, addAssessment } from "../facts-actions";
import type { PropertyFormState } from "../actions";

const NUEVA = "__nueva__";

type Entidad = { id: string; nombre: string; tipo: OwnerType };

// Cuadro con un botón «+ Agregar …» que lo abre. El formulario va adentro y solo
// existe mientras el cuadro está abierto, así que cada vez que se abre parte limpio
// (sin errores ni valores de la vez anterior). Recibe `close` para cerrarse al guardar.
function AddDialog({
  title,
  children,
}: {
  title: string;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <Plus className="size-3.5" />
        {title}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {children(() => setOpen(false))}
      </DialogContent>
    </Dialog>
  );
}

// Corre la acción del servidor y cierra el cuadro solo si se guardó bien
// (la acción devuelve `{}` sin error ni errores de campo).
function useAddAction(
  action: (
    prev: PropertyFormState,
    formData: FormData,
  ) => Promise<PropertyFormState>,
  close: () => void,
) {
  const [state, formAction, pending] = useActionState(
    async (prev: PropertyFormState, formData: FormData) => {
      const result = await action(prev, formData);
      if (!result.error && !result.fieldErrors) close();
      return result;
    },
    {} as PropertyFormState,
  );
  const err = (f: string) => state?.fieldErrors?.[f];
  return { state, formAction, pending, err };
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

// Error general del formulario (el que no es de un campo en particular).
function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-sm text-destructive">{message}</p>;
}

function SubmitFooter({ pending }: { pending: boolean }) {
  return (
    <DialogFooter>
      <Button type="submit" disabled={pending}>
        {pending ? "Guardando…" : "Agregar"}
      </Button>
    </DialogFooter>
  );
}

function OwnerFormBody({
  propertyId,
  entidades,
  close,
}: {
  propertyId: string;
  entidades: Entidad[];
  close: () => void;
}) {
  const { state, formAction, pending, err } = useAddAction(addOwner, close);
  const [sel, setSel] = useState(NUEVA);
  const isNew = sel === NUEVA;

  // Mapa valor→etiqueta para que el trigger muestre el nombre elegido.
  const items: Record<string, string> = { [NUEVA]: "➕ Nueva entidad" };
  for (const e of entidades)
    items[e.id] = `${e.nombre} · ${ownerTypeLabels[e.tipo]}`;

  return (
    <form action={formAction}>
      <input type="hidden" name="propertyId" value={propertyId} />
      <input type="hidden" name="ownerId" value={isNew ? "" : sel} />
      <div className="space-y-4 py-4">
        <div className="flex flex-col gap-1.5">
          <Label>Entidad</Label>
          <Select
            items={items}
            value={sel}
            onValueChange={(v) => setSel(v ?? NUEVA)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NUEVA}>➕ Nueva entidad</SelectItem>
              {entidades.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.nombre} · {ownerTypeLabels[e.tipo]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isNew && (
          <>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="owner-nombre">Nombre o razón social</Label>
              <Input
                id="owner-nombre"
                name="nombre"
                placeholder="Nombre o razón social"
              />
              <FieldError message={err("nombre")} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="owner-rut">RUT</Label>
                <Input id="owner-rut" name="rut" placeholder="RUT" />
                <FieldError message={err("rut")} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Tipo</Label>
                <Select
                  name="tipo"
                  defaultValue="PERSONA"
                  items={ownerTypeLabels}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {enumOptions(ownerTypeLabels).map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="owner-porcentaje">Porcentaje</Label>
          <Input
            id="owner-porcentaje"
            name="porcentaje"
            type="number"
            step="0.01"
            min="0"
            max="100"
            placeholder="%"
          />
          <FieldError message={err("porcentaje")} />
        </div>

        <FormError message={state?.error} />
      </div>
      <SubmitFooter pending={pending} />
    </form>
  );
}

export function AddOwnerDialog({
  propertyId,
  entidades,
}: {
  propertyId: string;
  entidades: Entidad[];
}) {
  return (
    <AddDialog title="Agregar dueño">
      {(close) => (
        <OwnerFormBody
          propertyId={propertyId}
          entidades={entidades}
          close={close}
        />
      )}
    </AddDialog>
  );
}

function UnitFormBody({
  propertyId,
  close,
}: {
  propertyId: string;
  close: () => void;
}) {
  const { state, formAction, pending, err } = useAddAction(addUnit, close);

  return (
    <form action={formAction}>
      <input type="hidden" name="propertyId" value={propertyId} />
      <div className="space-y-4 py-4">
        <div className="flex flex-col gap-1.5">
          <Label>Tipo</Label>
          <Select
            name="tipo"
            defaultValue="ESTACIONAMIENTO"
            items={propertyUnitTypeLabels}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {enumOptions(propertyUnitTypeLabels).map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="unit-numero">N° o identificador</Label>
          <Input
            id="unit-numero"
            name="numero"
            placeholder="N° o identificador"
          />
          <FieldError message={err("numero")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="unit-rol">ROL SII (opcional)</Label>
          <Input id="unit-rol" name="rolSII" placeholder="ROL SII (opcional)" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="unit-avaluo">Avalúo (opcional)</Label>
          <Input
            id="unit-avaluo"
            name="avaluoFiscal"
            type="number"
            step="0.01"
            min="0"
            placeholder="Avalúo (opcional)"
          />
          <FieldError message={err("avaluoFiscal")} />
        </div>
        <FormError message={state?.error} />
      </div>
      <SubmitFooter pending={pending} />
    </form>
  );
}

export function AddUnitDialog({ propertyId }: { propertyId: string }) {
  return (
    <AddDialog title="Agregar anexo">
      {(close) => (
        <UnitFormBody
          propertyId={propertyId}
          close={close}
        />
      )}
    </AddDialog>
  );
}

function AssessmentFormBody({
  propertyId,
  close,
}: {
  propertyId: string;
  close: () => void;
}) {
  const { state, formAction, pending, err } = useAddAction(addAssessment, close);

  return (
    <form action={formAction}>
      <input type="hidden" name="propertyId" value={propertyId} />
      <div className="space-y-4 py-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="assessment-anio">Año</Label>
          <Input
            id="assessment-anio"
            name="anio"
            type="number"
            step="1"
            min="1800"
            max="2100"
            placeholder="Año"
          />
          <FieldError message={err("anio")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="assessment-valor">Valor ($)</Label>
          <Input
            id="assessment-valor"
            name="valor"
            type="number"
            step="0.01"
            min="0"
            placeholder="Valor ($)"
          />
          <FieldError message={err("valor")} />
        </div>
        <FormError message={state?.error} />
      </div>
      <SubmitFooter pending={pending} />
    </form>
  );
}

export function AddAssessmentDialog({ propertyId }: { propertyId: string }) {
  return (
    <AddDialog title="Agregar avalúo">
      {(close) => (
        <AssessmentFormBody
          propertyId={propertyId}
          close={close}
        />
      )}
    </AddDialog>
  );
}

function TagFormBody({
  propertyId,
  close,
}: {
  propertyId: string;
  close: () => void;
}) {
  const { state, formAction, pending, err } = useAddAction(addTag, close);

  return (
    <form action={formAction}>
      <input type="hidden" name="propertyId" value={propertyId} />
      <div className="space-y-4 py-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tag-nombre">Etiqueta</Label>
          <Input id="tag-nombre" name="nombre" placeholder="Nueva etiqueta" />
          <FieldError message={err("nombre")} />
        </div>
        <FormError message={state?.error} />
      </div>
      <SubmitFooter pending={pending} />
    </form>
  );
}

export function AddTagDialog({ propertyId }: { propertyId: string }) {
  return (
    <AddDialog title="Agregar etiqueta">
      {(close) => (
        <TagFormBody
          propertyId={propertyId}
          close={close}
        />
      )}
    </AddDialog>
  );
}
