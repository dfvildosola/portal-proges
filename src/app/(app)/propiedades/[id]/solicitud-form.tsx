"use client";

// Botón «Pedir un servicio» y el formulario que va dentro de su diálogo.
// El formulario solo existe mientras el diálogo está abierto, así que cada vez parte limpio.
//
// Hay dos formas de usarlo:
//  - PedirServicioBoton: desde la ficha de una propiedad, que ya sabe de cuál se trata.
//  - PedirServicioConSelector: desde «Mis servicios», donde el cliente elige la propiedad o
//    «Otra propiedad (nueva)», y entonces escribe su dirección, comuna y tipo.
// Las dos abren el mismo diálogo. Pensado para el celular: los campos ocupan todo el ancho
// y el diálogo hace scroll si el teclado le quita espacio.

import { useState } from "react";
import { CircleCheck, Plus } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { propertyTypeLabels } from "@/lib/domain";
import { TIPOS_SERVICIO } from "@/lib/servicios";
import { pedirServicio } from "../solicitud-actions";

export type PropiedadParaPedir = { id: string; nombre: string };

// Valor del selector para «Otra propiedad (nueva)»: no es un id de propiedad.
const PROPIEDAD_NUEVA = "__nueva";

const TIPOS = Object.fromEntries(
  Object.entries(TIPOS_SERVICIO).map(([tipo, v]) => [tipo, v.nombre]),
);

// Desde la ficha: la propiedad ya está decidida.
export function PedirServicioBoton({ propertyId }: { propertyId: string }) {
  return <PedirServicioDialogo propertyId={propertyId} />;
}

// Desde «Mis servicios»: el cliente elige la propiedad de su cartera.
export function PedirServicioConSelector({
  propiedades,
}: {
  propiedades: PropiedadParaPedir[];
}) {
  return <PedirServicioDialogo propiedades={propiedades} />;
}

function PedirServicioDialogo({
  propertyId,
  propiedades,
}: {
  propertyId?: string;
  propiedades?: PropiedadParaPedir[];
}) {
  return (
    <Dialog>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="size-4" />
        Pedir un servicio
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pedir un servicio</DialogTitle>
          <DialogDescription>
            Cuéntale a Proges qué necesitas. Te responde acá mismo.
          </DialogDescription>
        </DialogHeader>
        <PedirServicioForm propertyId={propertyId} propiedades={propiedades} />
      </DialogContent>
    </Dialog>
  );
}

function PedirServicioForm({
  propertyId,
  propiedades,
}: {
  propertyId?: string;
  propiedades?: PropiedadParaPedir[];
}) {
  const [state, formProps, pending] = useFormAction(pedirServicio, {});
  const err = (f: string) => state?.fieldErrors?.[f];

  const [propiedadId, setPropiedadId] = useState(propertyId ?? "");
  const [tipo, setTipo] = useState("");
  const [tipoPropiedad, setTipoPropiedad] = useState("");
  const esNueva = propiedadId === PROPIEDAD_NUEVA;

  if (state?.ok === true) {
    return (
      <div className="flex items-start gap-3 rounded-lg bg-success-soft p-4 text-success-soft-foreground">
        <CircleCheck className="mt-0.5 size-5 shrink-0" />
        <p className="text-sm font-medium">
          Listo: Proges recibió tu pedido y te responde acá.
        </p>
      </div>
    );
  }

  const itemsPropiedad: Record<string, string> = {
    ...Object.fromEntries((propiedades ?? []).map((p) => [p.id, p.nombre])),
    [PROPIEDAD_NUEVA]: "Otra propiedad (nueva)",
  };

  return (
    <form {...formProps} className="flex flex-col gap-4">
      <input type="hidden" name="propertyId" value={esNueva ? "" : propiedadId} />
      <input type="hidden" name="propiedadNueva" value={esNueva ? "1" : ""} />
      <input type="hidden" name="tipo" value={tipo} />
      <input type="hidden" name="tipoPropiedad" value={tipoPropiedad} />

      {propiedades && (
        <Field label="Propiedad" error={err("propertyId")}>
          <Select
            items={itemsPropiedad}
            value={propiedadId || null}
            onValueChange={(v) => setPropiedadId(v ?? "")}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Elige la propiedad" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(itemsPropiedad).map(([valor, nombre]) => (
                <SelectItem key={valor} value={valor}>
                  {nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}

      {esNueva && (
        <div className="flex flex-col gap-4 rounded-lg border p-3">
          <Field label="Dirección" htmlFor="pedido-direccion" error={err("direccion")}>
            <Input
              id="pedido-direccion"
              name="direccion"
              maxLength={200}
              placeholder="Av. Providencia 123, depto 45"
            />
          </Field>
          <Field label="Comuna" htmlFor="pedido-comuna" error={err("comuna")}>
            <Input id="pedido-comuna" name="comuna" maxLength={100} placeholder="Providencia" />
          </Field>
          <Field label="Tipo de propiedad" error={err("tipoPropiedad")}>
            <Select
              items={propertyTypeLabels}
              value={tipoPropiedad || null}
              onValueChange={(v) => setTipoPropiedad(v ?? "")}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Elige el tipo" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(propertyTypeLabels).map(([valor, nombre]) => (
                  <SelectItem key={valor} value={valor}>
                    {nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Región (opcional)" htmlFor="pedido-region" error={err("region")}>
            <Input id="pedido-region" name="region" maxLength={100} placeholder="Región Metropolitana" />
          </Field>
        </div>
      )}

      <Field label="Tipo de servicio" error={err("tipo")}>
        <Select items={TIPOS} value={tipo || null} onValueChange={(v) => setTipo(v ?? "")}>
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

      <Field label="¿Qué necesitas?" htmlFor="solicitud-descripcion" error={err("descripcion")}>
        <Textarea
          id="solicitud-descripcion"
          name="descripcion"
          rows={5}
          maxLength={2000}
          placeholder="Por ejemplo: quiero vender esta propiedad y necesito saber en cuánto publicarla."
        />
      </Field>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Enviando…" : "Enviar pedido"}
      </Button>
    </form>
  );
}
