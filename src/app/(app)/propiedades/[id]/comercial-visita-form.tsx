"use client";

// Formulario corto para registrar una visita, pensado para el celular:
// una columna, campos grandes y lo opcional al final.

import { useFormAction } from "@/hooks/use-form-action";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" size="sm" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Guardando…" : "Registrar visita"}
      </Button>
    </form>
  );
}
