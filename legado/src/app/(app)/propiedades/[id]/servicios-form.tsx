"use client";

// Botón «Abrir servicio» y el formulario que va dentro de su diálogo.
// El formulario solo existe mientras el diálogo está abierto, así que cada vez parte limpio.
//
// Se elige primero el tipo y después el servicio del catálogo: la lista del
// catálogo se filtra con `familiasDelTipo` (la misma regla que revisa el servidor).

import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ServicioTipo } from "@/generated/prisma/enums";
import { TIPOS_SERVICIO, familiasDelTipo } from "@/lib/servicios";
import { abrirServicio } from "../servicios-actions";

export type ServicioDelCatalogo = {
  id: string;
  codigo: string;
  nombre: string;
  familia: string;
};

export type Responsable = { id: string; nombre: string };

const TIPOS = Object.fromEntries(
  Object.entries(TIPOS_SERVICIO).map(([tipo, v]) => [tipo, v.nombre]),
);

// Valor del selector para «sin responsable». Al servidor viaja vacío.
const NADIE = "NADIE";

export function AbrirServicioDialogo({
  propertyId,
  catalogo,
  responsables,
}: {
  propertyId: string;
  catalogo: ServicioDelCatalogo[];
  responsables: Responsable[];
}) {
  const [abierto, setAbierto] = useState(false);
  const cerrar = useCallback(() => setAbierto(false), []);

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="size-4" />
        Abrir servicio
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Abrir servicio</DialogTitle>
        </DialogHeader>
        <AbrirServicioForm
          propertyId={propertyId}
          catalogo={catalogo}
          responsables={responsables}
          onListo={cerrar}
        />
      </DialogContent>
    </Dialog>
  );
}

function AbrirServicioForm({
  propertyId,
  catalogo,
  responsables,
  onListo,
}: {
  propertyId: string;
  catalogo: ServicioDelCatalogo[];
  responsables: Responsable[];
  onListo: () => void;
}) {
  const [state, formProps, pending] = useFormAction(abrirServicio, {});
  const err = (f: string) => state?.fieldErrors?.[f];

  const [tipo, setTipo] = useState<ServicioTipo | "">("");
  const [servicioId, setServicioId] = useState("");
  const [responsableId, setResponsableId] = useState("");

  // Cuando el servidor confirma que guardó, se avisa al diálogo para que se cierre.
  const guardado = state?.ok === true;
  useEffect(() => {
    if (guardado) onListo();
  }, [guardado, onListo]);

  // Del catálogo solo se ofrecen las familias del tipo elegido.
  const familias = tipo ? familiasDelTipo(tipo) : [];
  const opciones = catalogo.filter((s) => familias.includes(s.familia));
  const itemsServicio = Object.fromEntries(
    opciones.map((s) => [s.id, `${s.codigo} · ${s.nombre}`]),
  );
  const itemsResponsable: Record<string, string> = {
    [NADIE]: "Sin responsable",
    ...Object.fromEntries(responsables.map((r) => [r.id, r.nombre])),
  };

  function cambiarTipo(v: string | null) {
    setTipo((v ?? "") as ServicioTipo | "");
    setServicioId(""); // el servicio elegido era de las familias del tipo anterior
  }

  return (
    <form {...formProps} className="flex flex-col gap-4">
      <input type="hidden" name="propertyId" value={propertyId} />
      <input type="hidden" name="tipo" value={tipo} />
      <input type="hidden" name="servicioId" value={servicioId} />
      <input type="hidden" name="responsableId" value={responsableId} />

      <Field label="Tipo de servicio" error={err("tipo")}>
        <Select items={TIPOS} value={tipo || null} onValueChange={cambiarTipo}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Elige el tipo" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(TIPOS).map(([valor, nombre]) => (
              <SelectItem key={valor} value={valor}>
                {nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field
        label="Servicio del catálogo"
        error={err("servicioId")}
        hint={tipo === "" ? "Elige primero el tipo." : undefined}
      >
        <Select
          items={itemsServicio}
          value={servicioId || null}
          onValueChange={(v) => setServicioId(v ?? "")}
          disabled={tipo === ""}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Elige el servicio" />
          </SelectTrigger>
          <SelectContent>
            {opciones.map((s) => (
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

      <Field label="Nota (opcional)" htmlFor="servicio-nota" error={err("nota")}>
        <Textarea id="servicio-nota" name="nota" rows={3} />
      </Field>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Abriendo…" : "Abrir servicio"}
      </Button>
    </form>
  );
}
