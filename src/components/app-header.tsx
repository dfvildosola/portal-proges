"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useState, useTransition } from "react";
import { UserButton } from "@clerk/nextjs";

import { ThemeToggle } from "@/components/theme-toggle";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { cambiarClienteActivo } from "@/lib/cliente-activo-actions";

// Etiquetas legibles por segmento de ruta. Lo no listado (ej. un id) cae a "Detalle".
const segmentLabels: Record<string, string> = {
  pendientes: "Pendientes",
  cobranza: "Cobranza",
  cuentas: "Cuentas",
  resumen: "Resumen",
  propiedades: "Propiedades",
  contratos: "Contratos",
  duenos: "Dueños",
  equipo: "Equipo",
  etapas: "Etapas",
  operacion: "Operación",
  servicios: "Servicios",
  contactos: "Contactos",
  nueva: "Nueva",
  nuevo: "Nuevo",
  editar: "Editar",
};

type Crumb = { label: string; href: string; isLast: boolean };

function buildCrumbs(pathname: string): Crumb[] {
  const segments = pathname.split("/").filter(Boolean);
  return segments.map((segment, i) => {
    let href = "/" + segments.slice(0, i + 1).join("/");
    // /propiedades/[id]/servicios no es una página: los servicios son una pestaña de la ficha.
    if (segment === "servicios" && segments[i - 2] === "propiedades") {
      href = "/" + segments.slice(0, i).join("/") + "?pestana=servicios";
    }
    return { label: segmentLabels[segment] ?? "Detalle", href, isLast: i === segments.length - 1 };
  });
}

// Para el equipo: el cliente que está mirando. Al elegir otro, la acción guarda la cookie y
// el layout se vuelve a calcular con la cartera de ese cliente.
function SelectorDeCliente({
  clientes,
  activoId,
}: {
  clientes: { id: string; nombre: string }[];
  activoId: string | undefined;
}) {
  const [pendiente, empezar] = useTransition();
  const [error, setError] = useState<string>();
  const nombres = Object.fromEntries(clientes.map((c) => [c.id, c.nombre]));

  function elegir(id: string | null) {
    if (!id || id === activoId) return;
    setError(undefined);
    empezar(async () => {
      const resultado = await cambiarClienteActivo(id);
      if (resultado.error) setError(resultado.error);
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Select items={nombres} value={activoId ?? null} onValueChange={elegir} disabled={pendiente || clientes.length === 0}>
        <SelectTrigger size="sm" aria-label="Cliente activo" className="w-32 sm:w-48">
          <SelectValue placeholder="Sin clientes" />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false} align="end">
          {clientes.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.nombre}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && (
        <span role="alert" className="hidden text-xs text-destructive sm:inline">
          {error}
        </span>
      )}
    </div>
  );
}

// `clientes` solo llega cuando quien mira es del equipo: el cliente no ve el selector.
export function AppHeader({
  clientes,
  clienteActivoId,
}: {
  clientes?: { id: string; nombre: string }[];
  clienteActivoId?: string;
}) {
  const pathname = usePathname();
  const crumbs = buildCrumbs(pathname);

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-1 h-4" />
      {/* Con el selector de cliente, en pantallas angostas no cabe el recorrido de migas. */}
      <Breadcrumb className={clientes ? "hidden sm:block" : undefined}>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/" />}>Inicio</BreadcrumbLink>
          </BreadcrumbItem>
          {crumbs.map((crumb) => (
            <Fragment key={crumb.href}>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {crumb.isLast ? (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink render={<Link href={crumb.href} />}>
                    {crumb.label}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
      <div className="ml-auto flex items-center gap-2">
        {clientes && <SelectorDeCliente clientes={clientes} activoId={clienteActivoId} />}
        <ThemeToggle />
        {/* Foto de la persona; al tocarla ofrece salir. */}
        <UserButton />
      </div>
    </header>
  );
}
