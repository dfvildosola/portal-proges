"use client";

// Formulario corto para registrar una visita, pensado para el celular:
// una columna, campos grandes y lo opcional al final. Además de la visita se puede anotar,
// en el mismo envío, que el interesado hizo una oferta y un seguimiento (una tarea para
// quien registra, con su fecha).

import { useState } from "react";
import { useFormAction } from "@/hooks/use-form-action";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Field } from "@/components/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { currencyLabels, enumOptions } from "@/lib/domain";
import { registrarVisita, type ComercialFormState } from "../comercial-actions";

const EVALUACIONES: Record<string, string> = {
  "": "Sin evaluar",
  "1": "1 de 5",
  "2": "2 de 5",
  "3": "3 de 5",
  "4": "4 de 5",
  "5": "5 de 5",
};

export function RegistrarVisitaForm({
  servicioId,
  hoy,
  equipo,
  usuarioId,
}: {
  servicioId: string;
  // «AAAA-MM-DD» de hoy en Chile, calculado en el servidor.
  hoy: string;
  equipo: { id: string; nombre: string }[];
  // Quien entró: queda elegido por defecto.
  usuarioId: string;
}) {
  const [state, formProps, pending] = useFormAction(registrarVisita, {} as ComercialFormState);
  const err = (f: string) => state?.fieldErrors?.[f];
  const nombres = Object.fromEntries(equipo.map((p) => [p.id, p.nombre]));
  // «Hizo una oferta» muestra sus campos. El formulario se vacía solo al guardar bien, pero este
  // estado no es un campo: hay que cerrarlo a mano cuando el servidor responde sin errores.
  const [hizoOferta, setHizoOferta] = useState(false);
  const [estadoVisto, setEstadoVisto] = useState(state);
  if (state !== estadoVisto) {
    setEstadoVisto(state);
    if (!state?.error && !state?.fieldErrors) setHizoOferta(false);
  }

  return (
    <form {...formProps} className="space-y-3">
      <input type="hidden" name="servicioId" value={servicioId} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Fecha" htmlFor="visita-fecha" error={err("fecha")}>
          <Input id="visita-fecha" name="fecha" type="date" defaultValue={hoy} max={hoy} />
        </Field>
        <Field label="Quién la hizo" error={err("realizadaPorId")}>
          <Select
            name="realizadaPorId"
            defaultValue={nombres[usuarioId] ? usuarioId : undefined}
            items={nombres}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Elige una persona" />
            </SelectTrigger>
            <SelectContent>
              {equipo.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Interesado (opcional)" htmlFor="visita-nombre" error={err("interesadoNombre")}>
          <Input id="visita-nombre" name="interesadoNombre" autoComplete="off" />
        </Field>
        <Field label="Contacto (opcional)" htmlFor="visita-contacto" error={err("interesadoContacto")}>
          <Input id="visita-contacto" name="interesadoContacto" autoComplete="off" placeholder="Teléfono o correo" />
        </Field>
        <Field label="Evaluación (opcional)" error={err("evaluacion")}>
          <Select name="evaluacion" defaultValue="" items={EVALUACIONES}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(EVALUACIONES).map(([valor, texto]) => (
                <SelectItem key={valor} value={valor}>
                  {texto}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <Field label="Comentario (opcional; lo lee el propietario, no pongas datos del interesado)" htmlFor="visita-comentario" error={err("comentario")}>
        <Textarea id="visita-comentario" name="comentario" rows={2} />
      </Field>

      <div className="space-y-3 rounded-lg border p-3">
        <div className="flex items-center gap-3">
          <Checkbox
            id="visita-hizo-oferta"
            name="hizoOferta"
            value="1"
            checked={hizoOferta}
            onCheckedChange={(v) => setHizoOferta(v === true)}
          />
          <Label htmlFor="visita-hizo-oferta" className="min-h-9 flex-1 text-base sm:text-sm">
            Hizo una oferta
          </Label>
        </div>
        {hizoOferta && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Monto" htmlFor="visita-oferta-monto" error={err("ofertaMonto")}>
              <Input
                id="visita-oferta-monto"
                name="ofertaMonto"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                placeholder="0"
              />
            </Field>
            <Field label="Moneda" error={err("ofertaMoneda")}>
              <Select name="ofertaMoneda" defaultValue="CLP" items={currencyLabels}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {enumOptions(currencyLabels).map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field
              label="Oferente"
              htmlFor="visita-oferta-oferente"
              error={err("ofertaOferente")}
              hint="Si lo dejas vacío se usa el nombre del interesado."
              className="sm:col-span-2"
            >
              <Input id="visita-oferta-oferente" name="ofertaOferente" autoComplete="off" />
            </Field>
          </div>
        )}
      </div>

      <div className="space-y-3 rounded-lg border p-3">
        <p className="text-sm font-medium">Seguimiento (opcional)</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Qué hay que hacer" htmlFor="visita-seg-que" error={err("seguimientoQue")}>
            <Input
              id="visita-seg-que"
              name="seguimientoQue"
              autoComplete="off"
              placeholder="Ej.: llamarlo con la respuesta del dueño"
            />
          </Field>
          <Field label="Para cuándo" htmlFor="visita-seg-vence" error={err("seguimientoVence")}>
            <Input id="visita-seg-vence" name="seguimientoVence" type="date" min={hoy} />
          </Field>
        </div>
        <p className="text-xs text-muted-foreground">Queda como una tarea tuya en «Mi trabajo».</p>
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending} className="h-11 w-full text-base sm:h-8 sm:w-auto sm:text-sm">
        {pending ? "Guardando…" : "Registrar visita"}
      </Button>
    </form>
  );
}
