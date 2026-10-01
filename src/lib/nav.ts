// Configuración de la navegación lateral.
// Regla de escalamiento (ver PLAN.md §4): lo que cruza toda la cartera va al menú;
// lo que pertenece a una propiedad va como pestaña dentro de su ficha.
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
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: boolean; // muestra el contador de pendientes
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const navGroups: NavGroup[] = [
  {
    label: "Trabajo diario",
    items: [
      { href: "/", label: "Inicio", icon: Home },
      { href: "/pendientes", label: "Pendientes", icon: Bell, badge: true },
      { href: "/cobranza", label: "Cobranza", icon: Wallet },
      { href: "/cuentas", label: "Cuentas", icon: Receipt },
    ],
  },
  {
    label: "Cartera",
    items: [
      { href: "/resumen", label: "Resumen", icon: PieChart },
      { href: "/propiedades", label: "Propiedades", icon: Building2 },
      { href: "/contratos", label: "Contratos", icon: FileText },
      { href: "/duenos", label: "Dueños", icon: Network },
      { href: "/contactos", label: "Contactos", icon: Users },
    ],
  },
];
