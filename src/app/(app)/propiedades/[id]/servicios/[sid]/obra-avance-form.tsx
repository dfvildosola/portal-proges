"use client";

// Controles de avance de la obra (solo equipo):
//  - AvanceBotones: cinco botones 0 / 25 / 50 / 75 / 100 %, para un recinto entero o para una línea.
//  - AvanceCasilla: una casilla para un servicio suelto (sin recintos): marcada = 100 %.
// Cada control es un formulario que se envía al tocar un botón (el botón mismo lleva el valor).

import { CheckSquare, Square } from "lucide-react";
import { useFormAction } from "@/hooks/use-form-action";
import { Button } from "@/components/ui/button";
import {
  marcarAvancePartida,
  marcarAvanceRecinto,
  type AvanceFormState,
} from "./obra-avance-actions";

const PASOS = [0, 25, 50, 75, 100];

export function AvanceBotones(
  props: { actual: number } & (
    | { alcance: "recinto"; servicioEnCursoId: string; recinto: string | null }
    | { alcance: "partida"; partidaId: string }
  ),
) {
  const accion = props.alcance === "recinto" ? marcarAvanceRecinto : marcarAvancePartida;
  const [state, formProps, pending] = useFormAction(accion, {} as AvanceFormState);

  return (
    <form {...formProps} className="flex flex-col gap-1">
      {props.alcance === "recinto" ? (
        <>
          <input type="hidden" name="servicioEnCursoId" value={props.servicioEnCursoId} />
          <input type="hidden" name="recinto" value={props.recinto ?? ""} />
        </>
      ) : (
        <input type="hidden" name="partidaId" value={props.partidaId} />
      )}
      <div className="flex flex-wrap gap-1" role="group" aria-label="Avance">
        {PASOS.map((paso) => (
          <Button
            key={paso}
            type="submit"
            name="avance"
            value={paso}
            size="sm"
            variant={Math.round(props.actual) === paso ? "default" : "outline"}
            disabled={pending}
            className="min-w-12 tabular-nums"
          >
            {paso} %
          </Button>
        ))}
      </div>
      {state?.error && <p className="text-xs text-destructive">{state.error}</p>}
    </form>
  );
}

export function AvanceCasilla({
  partidaId,
  marcada,
  texto,
}: {
  partidaId: string;
  marcada: boolean;
  texto: string;
}) {
  const [state, formProps, pending] = useFormAction(marcarAvancePartida, {} as AvanceFormState);
  const Icono = marcada ? CheckSquare : Square;

  return (
    <form {...formProps} className="flex flex-col gap-1">
      <input type="hidden" name="partidaId" value={partidaId} />
      <button
        type="submit"
        name="avance"
        value={marcada ? 0 : 100}
        disabled={pending}
        aria-pressed={marcada}
        className="flex min-h-10 items-start gap-2 rounded-md py-1 text-left text-sm disabled:opacity-60"
      >
        <Icono className={`mt-0.5 size-5 shrink-0 ${marcada ? "text-success" : "text-muted-foreground"}`} />
        <span className={marcada ? "text-muted-foreground line-through" : ""}>{texto}</span>
      </button>
      {state?.error && <p className="text-xs text-destructive">{state.error}</p>}
    </form>
  );
}
