"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { navGroups } from "@/lib/nav";
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

export function AppSidebar({ alertCount = 0 }: { alertCount?: number }) {
  const pathname = usePathname();

  // "/" solo activo exacto; el resto activo si la ruta empieza con el href.
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

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
        {navGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarMenu>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={isActive(item.href)}
                      tooltip={item.label}
                      render={<Link href={item.href} />}
                    >
                      <Icon />
                      <span>{item.label}</span>
                      {item.badge && alertCount > 0 && (
                        <span className="ml-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground tabular-nums">
                          {alertCount > 99 ? "99+" : alertCount}
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
