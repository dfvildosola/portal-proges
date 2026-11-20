// Las pantallas del portal del dueño. El menú lateral (computador) y la barra de abajo (celular)
// leen esta misma lista, para que nunca muestren cosas distintas. Vencimientos y Cartera son solo
// del dueño autónomo, el que lleva su propia cartera. La lista la arma cada menú en el navegador:
// los íconos son componentes, y un componente no puede viajar del servidor al navegador.
import { Building2, CalendarClock, House, PlusCircle, Wallet, type LucideIcon } from "lucide-react";

export type EntradaDelDueno = { href: string; texto: string; icono: LucideIcon };

const COMUNES: EntradaDelDueno[] = [
  { href: "/mi", texto: "Inicio", icono: House },
  { href: "/mi/propiedades", texto: "Propiedades", icono: Building2 },
];
const SOLO_AUTONOMO: EntradaDelDueno[] = [
  { href: "/mi/vencimientos", texto: "Vencimientos", icono: CalendarClock },
  { href: "/mi/cartera", texto: "Cartera", icono: Wallet },
];
const PEDIR: EntradaDelDueno = { href: "/mi/pedir", texto: "Pedir a Proges", icono: PlusCircle };

export function entradasDelDueno(autonomo: boolean): EntradaDelDueno[] {
  return [...COMUNES, PEDIR, ...(autonomo ? SOLO_AUTONOMO : [])];
}

/** «Inicio» (/mi) solo está activo en /mi mismo; las demás también en sus pantallas hijas. */
export function estaActiva(ruta: string, href: string): boolean {
  return href === "/mi" ? ruta === href : ruta === href || ruta.startsWith(`${href}/`);
}
