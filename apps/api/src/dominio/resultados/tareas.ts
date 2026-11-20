// El porcentaje de tareas hechas a tiempo, por persona.
//
// Una tarea cuenta cuando ya tenía que estar hecha (su fecha de vencimiento ya pasó, o ya se
// hizo). Está «a tiempo» si se hizo el día de vencimiento o antes. Una tarea sin hacer cuyo
// plazo todavía no llega no cuenta ni a favor ni en contra.
import { aUnDecimal, diaChile, estaEnElRango } from "./semanas";

export type TareaParaResultados = {
  responsableId: string;
  responsableNombre: string;
  vence: Date; // fecha «solo fecha»
  hechaEl: Date | null; // momento exacto en que se marcó hecha
};

export type TareasDePersona = {
  usuarioId: string;
  nombre: string;
  hechasATiempo: number;
  hechasTarde: number;
  vencidasSinHacer: number;
  porcentajeATiempo: number | null;
};

// Solo cuentan las tareas cuyo vencimiento cae dentro de [desde, hasta]. `hoy` es hoyChile().
export function tareasATiempoPorPersona(
  tareas: TareaParaResultados[],
  desde: Date,
  hasta: Date,
  hoy: Date,
): TareasDePersona[] {
  const personas = new Map<string, TareasDePersona>();
  for (const t of tareas) {
    if (!estaEnElRango(t.vence, desde, hasta)) continue;
    const persona =
      personas.get(t.responsableId) ??
      { usuarioId: t.responsableId, nombre: t.responsableNombre, hechasATiempo: 0, hechasTarde: 0, vencidasSinHacer: 0, porcentajeATiempo: null };
    if (t.hechaEl) {
      if (diaChile(t.hechaEl).getTime() <= t.vence.getTime()) persona.hechasATiempo += 1;
      else persona.hechasTarde += 1;
    } else if (t.vence.getTime() < hoy.getTime()) {
      persona.vencidasSinHacer += 1;
    } else {
      continue; // todavía está a tiempo de hacerse: no cuenta
    }
    personas.set(t.responsableId, persona);
  }
  return [...personas.values()]
    .map((p) => {
      const cuentan = p.hechasATiempo + p.hechasTarde + p.vencidasSinHacer;
      return { ...p, porcentajeATiempo: cuentan > 0 ? aUnDecimal((p.hechasATiempo / cuentan) * 100) : null };
    })
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}
