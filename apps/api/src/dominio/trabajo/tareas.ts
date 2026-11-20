// Las tareas del equipo: cómo se agrupan por urgencia. Funciones puras que reciben «hoy».
//
// «Esta semana» es hoy y los 7 días siguientes (8 días, la misma ventana de «Esta semana» de la
// agenda de vencimientos, `dias <= 7` en dominio/ficha/agenda.ts). Una tarea
// sin fecha no puede estar atrasada: va a «más adelante».
import { diasHasta } from "../../util/fechas";

export const DIAS_SEMANA = 7;

type ConVencimiento = { vence: Date | null };

// Por fecha de vencimiento; las que no tienen fecha, al final.
export function porVencimiento(a: ConVencimiento, b: ConVencimiento): number {
  if (a.vence && b.vence) return a.vence.getTime() - b.vence.getTime();
  if (a.vence) return -1;
  if (b.vence) return 1;
  return 0;
}

// La próxima tarea pendiente de un servicio: la que vence primero, las sin fecha al final (y
// entre iguales, la más antigua). «Atrasada» es vencer antes de hoy; una tarea sin fecha nunca lo
// está. El cálculo vive aquí y no en la web, para que Inicio, tablero y tareas digan lo mismo.
export type ProximaTarea = { que: string; vence: Date | null; atrasada: boolean };

export function proximaTarea(
  tareas: readonly { que: string; vence: Date | null; hechaEl: Date | null; createdAt: Date }[],
  hoy: Date,
): ProximaTarea | null {
  const pendientes = tareas
    .filter((t) => t.hechaEl === null)
    .sort((a, b) => porVencimiento(a, b) || a.createdAt.getTime() - b.createdAt.getTime());
  const primera = pendientes[0];
  if (!primera) return null;
  return { que: primera.que, vence: primera.vence, atrasada: primera.vence !== null && diasHasta(primera.vence, hoy) < 0 };
}

export type TareasPorDia<T> = {
  atrasadas: T[]; // vencieron antes de hoy
  hoy: T[];
  manana: T[];
  masAdelante: T[]; // desde pasado mañana, o sin fecha
};

// Para «Hoy»: atrasadas, de hoy, de mañana y el resto.
export function clasificarPorDia<T extends ConVencimiento>(tareas: readonly T[], hoy: Date): TareasPorDia<T> {
  const grupos: TareasPorDia<T> = { atrasadas: [], hoy: [], manana: [], masAdelante: [] };
  for (const t of [...tareas].sort(porVencimiento)) {
    const dias = t.vence ? diasHasta(t.vence, hoy) : null;
    if (dias === null) grupos.masAdelante.push(t);
    else if (dias < 0) grupos.atrasadas.push(t);
    else if (dias === 0) grupos.hoy.push(t);
    else if (dias === 1) grupos.manana.push(t);
    else grupos.masAdelante.push(t);
  }
  return grupos;
}

export type TareasPorSemana<T> = { atrasadas: T[]; estaSemana: T[]; despues: T[] };

// Para Repartir y la carga: atrasadas, de esta semana (hoy y los 7 días siguientes) y para después.
export function clasificarPorSemana<T extends ConVencimiento>(tareas: readonly T[], hoy: Date): TareasPorSemana<T> {
  const grupos: TareasPorSemana<T> = { atrasadas: [], estaSemana: [], despues: [] };
  for (const t of [...tareas].sort(porVencimiento)) {
    const dias = t.vence ? diasHasta(t.vence, hoy) : null;
    if (dias === null) grupos.despues.push(t);
    else if (dias < 0) grupos.atrasadas.push(t);
    else if (dias <= DIAS_SEMANA) grupos.estaSemana.push(t);
    else grupos.despues.push(t);
  }
  return grupos;
}

export type PersonaDelEquipo = { id: string; nombre: string };

// La carga de cada persona: cuántas tareas abiertas tiene, cuántas atrasadas y cuántas vencen
// esta semana. Aparecen todas las personas dadas, incluso las que no tienen ninguna; las tareas
// sin responsable no cuentan para nadie.
export function cargaDelEquipo(
  personas: readonly PersonaDelEquipo[],
  tareasAbiertas: readonly (ConVencimiento & { responsableId: string | null })[],
  hoy: Date,
) {
  return personas.map((persona) => {
    const suyas = tareasAbiertas.filter((t) => t.responsableId === persona.id);
    const g = clasificarPorSemana(suyas, hoy);
    return { persona, abiertas: suyas.length, atrasadas: g.atrasadas.length, estaSemana: g.estaSemana.length };
  });
}

// «2026-11-20» → medianoche UTC de ese día, que es como se guardan las fechas «solo fecha».
export function fechaDesdeISO(fecha: string): Date {
  return new Date(`${fecha}T00:00:00.000Z`);
}
