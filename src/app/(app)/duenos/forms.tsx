"use client";

import { useEffect, useRef, useState } from "react";
import { useFormAction } from "@/hooks/use-form-action";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ownerTypeLabels, enumOptions } from "@/lib/domain";
import { createGrupo, createOwner, setOwnerGrupo, deleteGrupo } from "./actions";

type GrupoOpt = { id: string; nombre: string };

const SIN_GRUPO = "__none__";

// Crea un grupo económico.
export function CreateGrupoForm() {
  const [state, formProps, pending] = useFormAction(createGrupo, {});
  const err = (f: string) => state?.fieldErrors?.[f];
  return (
    <form {...formProps} className="flex flex-wrap items-start gap-2">
      <div className="min-w-48 flex-1">
        <Input name="nombre" placeholder="Nombre del grupo / familia" />
        {err("nombre") && (
          <p className="mt-1 text-xs text-destructive">{err("nombre")}</p>
        )}
      </div>
      <div className="min-w-32 flex-1">
        <Input name="rut" placeholder="RUT controlador (opcional)" />
      </div>
      <Button type="submit" variant="outline" disabled={pending}>
        <Plus className="size-4" />
        Crear grupo
      </Button>
    </form>
  );
}

// Crea una entidad legal (persona/sociedad), opcionalmente dentro de un grupo.
export function CreateOwnerForm({ grupos }: { grupos: GrupoOpt[] }) {
  const [state, formProps, pending] = useFormAction(createOwner, {});
  const err = (f: string) => state?.fieldErrors?.[f];
  const [grupo, setGrupo] = useState(SIN_GRUPO);

  const items: Record<string, string> = { [SIN_GRUPO]: "Sin grupo" };
  for (const g of grupos) items[g.id] = g.nombre;

  return (
    <form {...formProps} className="flex flex-wrap items-start gap-2">
      <input
        type="hidden"
        name="grupoId"
        value={grupo === SIN_GRUPO ? "" : grupo}
      />
      <div className="min-w-44 flex-1">
        <Input name="nombre" placeholder="Nombre o razón social" />
        {err("nombre") && (
          <p className="mt-1 text-xs text-destructive">{err("nombre")}</p>
        )}
      </div>
      <div className="min-w-28 flex-1">
        <Input name="rut" placeholder="RUT" />
        {err("rut") && (
          <p className="mt-1 text-xs text-destructive">{err("rut")}</p>
        )}
      </div>
      <Select name="tipo" defaultValue="PERSONA" items={ownerTypeLabels}>
        <SelectTrigger className="w-32">
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
      <Select
        items={items}
        value={grupo}
        onValueChange={(v) => setGrupo(v ?? SIN_GRUPO)}
      >
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={SIN_GRUPO}>Sin grupo</SelectItem>
          {grupos.map((g) => (
            <SelectItem key={g.id} value={g.id}>
              {g.nombre}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button type="submit" variant="outline" disabled={pending}>
        <Plus className="size-4" />
        Crear entidad
      </Button>
    </form>
  );
}

// Selector de grupo por entidad: al cambiar, guarda automáticamente.
export function OwnerGrupoSelect({
  ownerId,
  grupoId,
  grupos,
}: {
  ownerId: string;
  grupoId: string | null;
  grupos: GrupoOpt[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [val, setVal] = useState(grupoId ?? SIN_GRUPO);
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    formRef.current?.requestSubmit();
  }, [val]);

  const items: Record<string, string> = { [SIN_GRUPO]: "Sin grupo" };
  for (const g of grupos) items[g.id] = g.nombre;

  return (
    <form ref={formRef} action={setOwnerGrupo}>
      <input type="hidden" name="ownerId" value={ownerId} />
      <input
        type="hidden"
        name="grupoId"
        value={val === SIN_GRUPO ? "" : val}
      />
      <Select
        items={items}
        value={val}
        onValueChange={(v) => setVal(v ?? SIN_GRUPO)}
      >
        <SelectTrigger size="sm" className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={SIN_GRUPO}>Sin grupo</SelectItem>
          {grupos.map((g) => (
            <SelectItem key={g.id} value={g.id}>
              {g.nombre}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </form>
  );
}

export function DeleteGrupoButton({ grupoId }: { grupoId: string }) {
  return (
    <form action={deleteGrupo}>
      <input type="hidden" name="grupoId" value={grupoId} />
      <Button
        type="submit"
        variant="ghost"
        size="icon-sm"
        title="Eliminar grupo (las entidades quedan sin grupo)"
      >
        <Trash2 className="size-4 text-muted-foreground" />
      </Button>
    </form>
  );
}
