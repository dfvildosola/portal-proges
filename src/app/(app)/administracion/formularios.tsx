"use client";

// Los botones y formularios de la tarjeta «Administración de arriendos» de la ficha de la
// propiedad: poner en administración, editar y terminar. Solo los ve el equipo (la tarjeta no
// los pinta para un cliente). Este archivo es del cliente (navegador) porque abre y cierra los
// formularios; las acciones que guardan corren en el servidor y vuelven a comprobar todo.

import { useState } from "react";
import { Pencil, Plus, Square } from "lucide-react";
import { useFormAction } from "@/hooks/use-form-action";
import { Field } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  editarAdministracion,
  ponerEnAdministracion,
  terminarAdministracion,
  type AdministracionFormState,
} from "../propiedades/administracion-actions";

type Accion = (prev: AdministracionFormState, formData: FormData) => Promise<AdministracionFormState>;

// Una acción que además avisa cuando salió bien, para cerrar el formulario.
function conCierre(accion: Accion, alGuardar: () => void): Accion {
  return async (prev, formData) => {
    const resultado = await accion(prev, formData);
    if (!resultado.error && !resultado.fieldErrors) alGuardar();
    return resultado;
  };
}

function Botones({ pending, cancelar, texto }: { pending: boolean; cancelar: () => void; texto: string }) {
  return (
    <div className="flex gap-2">
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Guardando…" : texto}
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={cancelar}>
        Cancelar
      </Button>
    </div>
  );
}

function MensajeError({ state }: { state: AdministracionFormState }) {
  if (!state?.error) return null;
  return <p className="text-sm text-destructive">{state.error}</p>;
}

function FormularioPoner({ propertyId, hoy, cerrar }: { propertyId: string; hoy: string; cerrar: () => void }) {
  const [state, formProps, pending] = useFormAction(conCierre(ponerEnAdministracion, cerrar), {} as AdministracionFormState);
  const err = (f: string) => state?.fieldErrors?.[f];
  return (
    <form {...formProps} className="space-y-3">
      <input type="hidden" name="propertyId" value={propertyId} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Desde" htmlFor="adm-desde" error={err("desde")}>
          <Input id="adm-desde" name="desde" type="date" defaultValue={hoy} />
        </Field>
        <Field label="Comisión (%)" htmlFor="adm-pct" error={err("comisionPct")} hint="Sobre el arriendo de cada mes">
          <Input id="adm-pct" name="comisionPct" type="number" step="0.01" min="0" max="100" placeholder="8" />
        </Field>
      </div>
      <MensajeError state={state} />
      <Botones pending={pending} cancelar={cerrar} texto="Poner en administración" />
    </form>
  );
}

function FormularioEditar({
  administracion,
  cerrar,
}: {
  administracion: Datos;
  cerrar: () => void;
}) {
  const [state, formProps, pending] = useFormAction(conCierre(editarAdministracion, cerrar), {} as AdministracionFormState);
  const err = (f: string) => state?.fieldErrors?.[f];
  return (
    <form {...formProps} className="space-y-3">
      <input type="hidden" name="id" value={administracion.id} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Desde" htmlFor="adm-desde" error={err("desde")}>
          <Input id="adm-desde" name="desde" type="date" defaultValue={administracion.desde} />
        </Field>
        <Field label="Hasta (opcional)" htmlFor="adm-hasta" error={err("hasta")}>
          <Input id="adm-hasta" name="hasta" type="date" defaultValue={administracion.hasta} />
        </Field>
        <Field label="Comisión (%)" htmlFor="adm-pct" error={err("comisionPct")}>
          <Input
            id="adm-pct"
            name="comisionPct"
            type="number"
            step="0.01"
            min="0"
            max="100"
            defaultValue={administracion.comisionPct}
          />
        </Field>
      </div>
      <MensajeError state={state} />
      <Botones pending={pending} cancelar={cerrar} texto="Guardar cambios" />
    </form>
  );
}

function FormularioTerminar({
  administracion,
  hoy,
  cerrar,
}: {
  administracion: Datos;
  hoy: string;
  cerrar: () => void;
}) {
  const [state, formProps, pending] = useFormAction(conCierre(terminarAdministracion, cerrar), {} as AdministracionFormState);
  const err = (f: string) => state?.fieldErrors?.[f];
  return (
    <form {...formProps} className="space-y-3">
      <input type="hidden" name="id" value={administracion.id} />
      <Field
        label="Terminar el"
        htmlFor="adm-fin"
        error={err("hasta")}
        hint="El mes en que termina se cuenta entero para la comisión."
        className="sm:max-w-xs"
      >
        <Input id="adm-fin" name="hasta" type="date" defaultValue={hoy} />
      </Field>
      <MensajeError state={state} />
      <Botones pending={pending} cancelar={cerrar} texto="Terminar administración" />
    </form>
  );
}

// Las fechas llegan ya como "AAAA-MM-DD" y la comisión como texto: así el componente no
// recibe Dates ni Decimals (no cruzan bien del servidor al navegador).
type Datos = { id: string; desde: string; hasta: string; comisionPct: string };

export function AdministracionAcciones({
  propertyId,
  administracion,
  hoy,
}: {
  propertyId: string;
  // La administración vigente, o null si la propiedad no está en administración hoy.
  administracion: Datos | null;
  hoy: string; // "AAAA-MM-DD"
}) {
  const [modo, setModo] = useState<"ninguno" | "poner" | "editar" | "terminar">("ninguno");
  const cerrar = () => setModo("ninguno");

  if (modo === "poner") return <FormularioPoner propertyId={propertyId} hoy={hoy} cerrar={cerrar} />;
  if (modo === "editar" && administracion) return <FormularioEditar administracion={administracion} cerrar={cerrar} />;
  if (modo === "terminar" && administracion) {
    return <FormularioTerminar administracion={administracion} hoy={hoy} cerrar={cerrar} />;
  }

  if (!administracion) {
    return (
      <Button size="sm" variant="outline" onClick={() => setModo("poner")}>
        <Plus className="size-4" />
        Poner en administración
      </Button>
    );
  }
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="outline" onClick={() => setModo("editar")}>
        <Pencil className="size-4" />
        Editar
      </Button>
      <Button size="sm" variant="outline" onClick={() => setModo("terminar")}>
        <Square className="size-4" />
        Terminar
      </Button>
    </div>
  );
}
