"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { navGroups, type NavItem } from "@/lib/nav";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

type Contadores = Partial<Record<NonNullable<NavItem["contador"]>, number>>;

export function AppSidebar({
  rol,
  esAdmin = false,
  contadores = {},
}: {
  rol: "EQUIPO" | "CLIENTE";
  esAdmin?: boolean;
  contadores?: Contadores;
}) {
  const pathname = usePathname();

  // Cada rol ve su menú: lo marcado soloEquipo, soloCliente o soloAdmin no se muestra a los
  // demás. El permiso real se exige igual en el servidor: esto solo evita mostrar un enlace
  // que no les sirve.
  const visible = (i: NavItem) =>
    (!i.soloEquipo || rol === "EQUIPO") &&
    (!i.soloCliente || rol === "CLIENTE") &&
    (!i.soloAdmin || esAdmin);
  const gruposVisibles = navGroups
    .map((g) => ({ ...g, items: g.items.filter(visible) }))
    .filter((g) => g.items.length > 0);

  // Un ítem está activo si la ruta es la suya o cuelga de ella (`/equipo/maestros/...`), y no hay
  // otro ítem visible con una ruta más específica que también calce: así estando en
  // `/equipo/maestros` se marca «Maestros» y no «Equipo y clientes». «/» solo cuenta exacto.
  const hrefs = gruposVisibles.flatMap((g) => g.items.map((i) => i.href));
  const calza = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
  const isActive = (href: string) =>
    calza(href) && !hrefs.some((otro) => otro.length > href.length && otro.startsWith(href) && calza(otro));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip="Proges"
              render={<Link href="/" />}
            >
              {/* Símbolo Proges: una propiedad (el cuadrado) y alguien que la cuida (el punto arena). */}
              <div className="flex size-8 shrink-0 items-center justify-center">
                <div className="relative size-5 rounded-[5px] bg-primary">
                  <div className="absolute -right-1 -bottom-1 size-2 rounded-full bg-arena" />
                </div>
              </div>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="text-base font-bold tracking-[-0.035em]">
                  Proges
                </span>
                <span className="text-xs text-muted-foreground">
                  Propiedades y gestión
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {gruposVisibles.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarMenu>
              {group.items.map((item) => {
                const Icon = item.icon;
                const cuenta = item.contador ? (contadores[item.contador] ?? 0) : 0;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={isActive(item.href)}
                      tooltip={item.label}
                      render={<Link href={item.href} />}
                    >
                      <Icon />
                      <span>{item.label}</span>
                      {cuenta > 0 && (
                        <span className="ml-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground tabular-nums">
                          {cuenta > 99 ? "99+" : cuenta}
                        </span>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}
