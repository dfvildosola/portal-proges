"use client";
// El menú de la izquierda del dueño, solo en computador (1024 px o más). En el celular lo
// reemplaza la barra de abajo. Lleva el nombre del cliente arriba, para que el dueño sepa
// de quién es lo que está mirando.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { type EntradaDelDueno, estaActiva } from "./entradas-del-menu";

export function MenuLateralDueno({ cliente, entradas }: { cliente: string; entradas: EntradaDelDueno[] }) {
  const ruta = usePathname();
  return (
    <nav aria-label="Menú principal" className="sticky top-0 hidden h-dvh flex-col gap-0.5 bg-side px-2.5 py-4 lg:flex">
      <Link href="/mi" className="px-2 pb-3.5 leading-tight">
        <span className="block text-[17px] font-extrabold tracking-tight text-side-on">Proges</span>
        <span className="block truncate text-[12px] font-semibold text-sidefg">{cliente}</span>
      </Link>
      {entradas.map(({ href, texto, icono: Icono }) => (
        <Link
          key={href}
          href={href}
          aria-current={estaActiva(ruta, href) ? "page" : undefined}
          className={cn(
            "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] font-semibold text-sidefg transition-colors hover:bg-side-hover",
            estaActiva(ruta, href) && "bg-side-activo text-side-on",
          )}
        >
          <Icono className="size-4 shrink-0" aria-hidden />
          {texto}
        </Link>
      ))}
    </nav>
  );
}
