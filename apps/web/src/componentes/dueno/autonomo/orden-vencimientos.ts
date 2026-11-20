// Cómo se ordenan y se agrupan los vencimientos en las pantallas del dueño. Son funciones puras
// (sin pedir nada a la API) para que se puedan leer de un vistazo.
import type { VencimientoGravedad, VencimientoItem } from "@proges/contrato";
import { CATEGORIA_DEL_TIPO, type CategoriaDeVencimiento } from "./etiquetas";

const PESO_DE_GRAVEDAD: Record<VencimientoGravedad, number> = { alta: 0, media: 1, baja: 2 };

/** Primero lo más grave (lo atrasado) y, dentro de cada gravedad, lo que vence antes. */
export function ordenarPorGravedadYFecha(items: VencimientoItem[]): VencimientoItem[] {
  return [...items].sort(
    (a, b) =>
      PESO_DE_GRAVEDAD[a.gravedad] - PESO_DE_GRAVEDAD[b.gravedad] ||
      // «AAAA-MM-DD» se ordena bien como texto.
      a.fecha.localeCompare(b.fecha) ||
      a.clave.localeCompare(b.clave),
  );
}

/** Lo que está más cerca en el tiempo (lo atrasado primero, por ser lo más antiguo). */
export function losMasCercanos(items: VencimientoItem[], cuantos: number): VencimientoItem[] {
  return [...items].sort((a, b) => a.fecha.localeCompare(b.fecha) || a.clave.localeCompare(b.clave)).slice(0, cuantos);
}

export function categoriaDe(item: VencimientoItem): CategoriaDeVencimiento {
  return CATEGORIA_DEL_TIPO[item.tipo];
}
