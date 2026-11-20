"use client";
// La barra de abajo, solo en celular (menos de 1024 px): las cuatro cosas que el equipo usa en
// terreno, al alcance del pulgar. Es la de la maqueta: Hoy, Servicios, Propiedades y Anotar.
import { Building2, Camera, CalendarCheck, ListChecks, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ENTRADAS: { href: string; texto: string; icono: LucideIcon }[] = [
  { href: "/hoy", texto: "Hoy", icono: CalendarCheck },
  { href: "/servicios", texto: "Servicios", icono: ListChecks },
  { href: "/propiedades", texto: "Propiedades", icono: Building2 },
  { href: "/anotar", texto: "Anotar", icono: Camera },
];

export function BarraInferior() {
  const ruta = usePathname();
  return (
    <nav
      aria-label="Menú principal"
      className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-line bg-card pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:hidden"
    >
      {ENTRADAS.map(({ href, texto, icono: Icono }) => {
        const activo = ruta === href || ruta.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={activo ? "page" : undefined}
            className={cn(
              "flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 pt-1 text-[10.5px] font-semibold text-soft",
              activo && "text-ink",
            )}
          >
            <Icono className="size-5" aria-hidden />
            {texto}
          </Link>
        );
      })}
    </nav>
  );
}
