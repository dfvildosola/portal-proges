// `cn` junta nombres de clases de Tailwind y resuelve los choques: si dos clases quieren cambiar
// lo mismo (por ejemplo p-2 y p-4), gana la última. Así un componente trae sus clases y quien lo usa
// puede cambiar una sin pelear con las otras.
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...entradas: ClassValue[]): string {
  return twMerge(clsx(entradas));
}
