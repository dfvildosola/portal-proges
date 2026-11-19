"use client";

// Botón + diálogo «Cargar presupuesto» (solo equipo). El maestro manda su presupuesto en PDF o
// por WhatsApp; aquí se anota quién es, cuánto cobra, en cuántos días, y qué partidas de la
// orden cubre. Las partidas son optativas: a veces el presupuesto llega antes que la orden.
// El formulario solo existe mientras el diálogo está abierto, así cada vez parte limpio.

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useFormAction } from "@/hooks/use-form-action";
import { Field } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cargarPresupuesto, type ObraFormState } from "./obra-presupuestos-actions";

export type MaestroOpcion = { id: string; nombre: string; especialidad: string | null };
export type PartidaOpcion = {
  id: string;
  recinto: string | null;
  codigo: string | null;
  descripcion: string;
};

const TIPOS = { ORIGINAL: "Original", ADICIONAL: "Adicional (cambio de alcance)" };
const SIN_RECINTO = "Sin recinto";

// Las partidas agrupadas por recinto, en el orden en que llegan (ya vienen por posición).
function agruparPorRecinto(partidas: PartidaOpcion[]): { recinto: string; partidas: PartidaOpcion[] }[] {
  const grupos = new Map<string, PartidaOpcion[]>();
  for (const p of partidas) {
    const nombre = p.recinto ?? SIN_RECINTO;
    grupos.set(nombre, [...(grupos.get(nombre) ?? []), p]);
  }
  return [...grupos].map(([recinto, lista]) => ({ recinto, partidas: lista }));
}

function PresupuestoForm({
  servicioEnCursoId,
  maestros,
  partidas,
  onListo,
}: {
  servicioEnCursoId: string;
  maestros: MaestroOpcion[];
  partidas: PartidaOpcion[];
  onListo: () => void;
}) {
  const [state, formProps, pending] = useFormAction(cargarPresupuesto, {} as ObraFormState);
  const err = (f: string) => state?.fieldErrors?.[f];

  const [maestroId, setMaestroId] = useState("");
  const [tipo, setTipo] = useState("ORIGINAL");
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set());

  const itemsMaestros = Object.fromEntries(
    maestros.map((m) => [m.id, m.especialidad ? `${m.nombre} · ${m.especialidad}` : m.nombre]),
  );
  const grupos = useMemo(() => agruparPorRecinto(partidas), [partidas]);

  const guardado = state?.ok === true;
  useEffect(() => {
    if (guardado) onListo();
  }, [guardado, onListo]);

  function alternar(ids: string[], marcar: boolean) {
    setMarcadas((antes) => {
      const ahora = new Set(antes);
      for (const id of ids) {
        if (marcar) ahora.add(id);
        else ahora.delete(id);
      }
      return ahora;
    });
  }

  return (
    <form {...formProps} className="flex flex-col gap-4">
      <input type="hidden" name="servicioEnCursoId" value={servicioEnCursoId} />
      <input type="hidden" name="maestroId" value={maestroId} />
      <input type="hidden" name="tipo" value={tipo} />
      {[...marcadas].map((id) => (
        <input key={id} type="hidden" name="partidaId" value={id} />
      ))}

      <Field
        label="Maestro"
        error={err("maestroId")}
        hint={maestros.length === 0 ? "Primero agrega un maestro en Configuración, Maestros." : undefined}
      >
        <Select items={itemsMaestros} value={maestroId || null} onValueChange={(v) => setMaestroId(v ?? "")}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Elige el maestro" />
          </SelectTrigger>
          <SelectContent>
            {maestros.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {itemsMaestros[m.id]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Tipo" error={err("tipo")}>
        <Select items={TIPOS} value={tipo} onValueChange={(v) => setTipo(v ?? "ORIGINAL")}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ORIGINAL">{TIPOS.ORIGINAL}</SelectItem>
            <SelectItem value="ADICIONAL">{TIPOS.ADICIONAL}</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Total (pesos)" htmlFor="pres-total" error={err("total")}>
          <Input id="pres-total" name="total" inputMode="numeric" placeholder="1.500.000" />
        </Field>
        <Field label="Plazo (días)" htmlFor="pres-plazo" error={err("plazoDias")}>
          <Input id="pres-plazo" name="plazoDias" inputMode="numeric" placeholder="30" />
        </Field>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Partidas que cubre</Label>
        {partidas.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Este proyecto todavía no tiene partidas (no se ha traído la orden). Puedes cargar el
            presupuesto igual y asignarlo después.
          </p>
        ) : (
          <div className="max-h-56 space-y-3 overflow-y-auto rounded-lg border p-3">
            {grupos.map((g) => {
              const ids = g.partidas.map((p) => p.id);
              const cuantas = ids.filter((id) => marcadas.has(id)).length;
              return (
                <div key={g.recinto} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`rec-${g.recinto}`}
                      checked={cuantas === ids.length}
                      indeterminate={cuantas > 0 && cuantas < ids.length}
                      onCheckedChange={(v) => alternar(ids, v)}
                    />
                    <Label htmlFor={`rec-${g.recinto}`} className="font-semibold">
                      {g.recinto}
                    </Label>
                  </div>
                  {g.partidas.map((p) => (
                    <div key={p.id} className="flex items-start gap-2 pl-6">
                      <Checkbox
                        id={`par-${p.id}`}
                        checked={marcadas.has(p.id)}
                        onCheckedChange={(v) => alternar([p.id], v)}
                        className="mt-0.5"
                      />
                      <Label htmlFor={`par-${p.id}`} className="font-normal leading-snug">
                        {p.codigo ? `${p.codigo} · ` : ""}
                        {p.descripcion}
                      </Label>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
        {err("partidaId") && <p className="text-xs text-destructive">{err("partidaId")}</p>}
      </div>

      <Field
        label="PDF del presupuesto (optativo)"
        htmlFor="pres-pdf"
        error={err("pdf")}
        hint="Hasta 4 MB. Se guarda en la carpeta «Portal» del Drive de la propiedad."
      >
        <Input id="pres-pdf" name="pdf" type="file" accept="application/pdf" />
      </Field>

      <Field label="Nota (optativa)" htmlFor="pres-nota" error={err("nota")}>
        <Textarea id="pres-nota" name="nota" rows={2} />
      </Field>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Guardando…" : "Cargar presupuesto"}
      </Button>
    </form>
  );
}

export function ObraPresupuestoForm(props: {
  servicioEnCursoId: string;
  maestros: MaestroOpcion[];
  partidas: PartidaOpcion[];
}) {
  const [abierto, setAbierto] = useState(false);
  const cerrar = useCallback(() => setAbierto(false), []);

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="size-4" />
        Cargar presupuesto
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cargar presupuesto de un maestro</DialogTitle>
          <DialogDescription>
            Queda «recibido» hasta que la jefatura lo apruebe o lo rechace.
          </DialogDescription>
        </DialogHeader>
        <PresupuestoForm {...props} onListo={cerrar} />
      </DialogContent>
    </Dialog>
  );
}
