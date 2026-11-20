"use client";
// El menú de la izquierda, solo en computador (1024 px o más). En el celular lo reemplaza la barra
// de abajo. Resultados lo ven la jefatura y el administrador; Configuración, solo el administrador
// (es lo que la API permite a cada uno).
import { Building2, ChartColumn, ClipboardList, LayoutDashboard, ListChecks, Settings, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type Entrada = { href: string; texto: string; icono: LucideIcon };

const PRINCIPAL: Entrada[] = [
  { href: "/inicio", texto: "Inicio", icono: LayoutDashboard },
  { href: "/servicios", texto: "Servicios", icono: ListChecks },
  { href: "/propiedades", texto: "Propiedades", icono: Building2 },
  { href: "/repartir", texto: "Repartir", icono: ClipboardList },
];
const RESULTADOS: Entrada = { href: "/resultados", texto: "Resultados", icono: ChartColumn };
const CONFIGURACION: Entrada = { href: "/configuracion", texto: "Configuración", icono: Settings };

function EnlaceDelMenu({ entrada }: { entrada: Entrada }) {
  const ruta = usePathname();
  const activo = ruta === entrada.href || ruta.startsWith(`${entrada.href}/`);
  const Icono = entrada.icono;
  return (
    <Link
      href={entrada.href}
      aria-current={activo ? "page" : undefined}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] font-semibold text-sidefg transition-colors hover:bg-side-hover",
        activo && "bg-side-activo text-side-on",
      )}
    >
      <Icono className="size-4 shrink-0" aria-hidden />
      {entrada.texto}
    </Link>
  );
}

function Grupo({ titulo, entradas }: { titulo: string; entradas: Entrada[] }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="px-2.5 pt-3 pb-1 text-[10.5px] font-bold tracking-[0.08em] text-sidefg/60 uppercase">{titulo}</p>
      {entradas.map((e) => (
        <EnlaceDelMenu key={e.href} entrada={e} />
      ))}
    </div>
  );
}

export function MenuLateral({ verResultados, verConfiguracion }: { verResultados: boolean; verConfiguracion: boolean }) {
  return (
    <nav
      aria-label="Menú principal"
      className="sticky top-0 hidden h-dvh flex-col gap-0.5 bg-side px-2.5 py-4 lg:flex"
    >
      <Link href="/inicio" className="px-2 pb-3.5 text-[17px] font-extrabold tracking-tight text-side-on">
        Proges
      </Link>
      {PRINCIPAL.map((e) => (
        <EnlaceDelMenu key={e.href} entrada={e} />
      ))}
      {verResultados && <Grupo titulo="Mirar" entradas={[RESULTADOS]} />}
      {verConfiguracion && <Grupo titulo="Administrar" entradas={[CONFIGURACION]} />}
    </nav>
  );
}
