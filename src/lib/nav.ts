// Configuración de la navegación lateral.
// Regla de escalamiento (ver PLAN.md §4): lo que cruza toda la cartera va al menú;
// lo que pertenece a una propiedad va como pestaña dentro de su ficha.
//
// El menú del EQUIPO parte por el trabajo (ADR 0013): Mi trabajo y Trabajo del equipo, después
// las propiedades, la administración de arriendos y la configuración. El CLIENTE (el dueño)
// mantiene su menú de siempre: lo suyo, y sus pedidos en «Mis servicios».
import {
  Home,
  Bell,
  Wallet,
  Building2,
  FileText,
  Users,
  Network,
  PieChart,
  Receipt,
  UserCog,
  ClipboardList,
  ClipboardCheck,
  ListChecks,
  KeyRound,
  HardHat,
  Route,
  type LucideIcon,
} from "lucide-react";

// Cada ítem dice quién lo ve. Sin marca, lo ven todos (equipo y cliente).
export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  contador?: "pendientes" | "porRevisar"; // número rojo al lado del nombre (el valor lo calcula el layout)
  soloEquipo?: boolean; // solo el equipo de Proges
  soloCliente?: boolean; // solo los usuarios de un cliente
  soloAdmin?: boolean; // solo el equipo con la marca de admin
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const navGroups: NavGroup[] = [
  // --- Equipo ---
  {
    label: "Trabajo",
    items: [
      { href: "/mi-trabajo", label: "Mi trabajo", icon: ListChecks, soloEquipo: true },
      { href: "/operacion", label: "Trabajo del equipo", icon: ClipboardList, contador: "porRevisar", soloEquipo: true },
    ],
  },
  {
    label: "Propiedades",
    items: [
      { href: "/propiedades", label: "Propiedades", icon: Building2, soloEquipo: true },
      { href: "/duenos", label: "Dueños", icon: Network, soloEquipo: true },
      { href: "/contactos", label: "Contactos", icon: Users, soloEquipo: true },
      { href: "/resumen", label: "Resumen", icon: PieChart, soloEquipo: true },
    ],
  },
  {
    label: "Administración de arriendos",
    items: [
      { href: "/administracion", label: "En administración", icon: KeyRound, soloEquipo: true },
      { href: "/contratos", label: "Contratos", icon: FileText, soloEquipo: true },
      { href: "/cobranza", label: "Cobranza", icon: Wallet, soloEquipo: true },
      { href: "/cuentas", label: "Cuentas", icon: Receipt, soloEquipo: true },
      { href: "/pendientes", label: "Pendientes", icon: Bell, contador: "pendientes", soloEquipo: true },
    ],
  },
  {
    label: "Configuración",
    items: [
      { href: "/equipo/maestros", label: "Maestros", icon: HardHat, soloEquipo: true },
      { href: "/equipo", label: "Equipo y clientes", icon: UserCog, soloEquipo: true, soloAdmin: true },
      { href: "/equipo/etapas", label: "Etapas", icon: Route, soloEquipo: true, soloAdmin: true },
    ],
  },
  // --- Cliente (el dueño) ---
  {
    label: "Trabajo diario",
    items: [
      { href: "/", label: "Inicio", icon: Home, soloCliente: true },
      { href: "/pendientes", label: "Pendientes", icon: Bell, contador: "pendientes", soloCliente: true },
      { href: "/servicios", label: "Mis servicios", icon: ClipboardCheck, soloCliente: true },
      { href: "/cobranza", label: "Cobranza", icon: Wallet, soloCliente: true },
      { href: "/cuentas", label: "Cuentas", icon: Receipt, soloCliente: true },
    ],
  },
  {
    label: "Cartera",
    items: [
      { href: "/resumen", label: "Resumen", icon: PieChart, soloCliente: true },
      { href: "/propiedades", label: "Propiedades", icon: Building2, soloCliente: true },
      { href: "/contratos", label: "Contratos", icon: FileText, soloCliente: true },
      { href: "/duenos", label: "Dueños", icon: Network, soloCliente: true },
      { href: "/contactos", label: "Contactos", icon: Users, soloCliente: true },
    ],
  },
];
