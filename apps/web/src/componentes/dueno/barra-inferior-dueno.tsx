"use client";
// La barra de abajo del dueño, solo en celular (menos de 1024 px): las mismas entradas del menú
// lateral, al alcance del pulgar.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { type EntradaDelDueno, estaActiva } from "./entradas-del-menu";

export function BarraInferiorDueno({ entradas }: { entradas: EntradaDelDueno[] }) {
  const ruta = usePathname();
  return (
    <nav
      aria-label="Menú principal"
      className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-line bg-card pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:hidden"
    >
      {entradas.map(({ href, texto, icono: Icono }) => (
        <Link
          key={href}
          href={href}
          aria-current={estaActiva(ruta, href) ? "page" : undefined}
          className={cn(
            "flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 pt-1 text-center text-[10.5px] leading-tight font-semibold text-soft",
            estaActiva(ruta, href) && "text-ink",
          )}
        >
          <Icono className="size-5" aria-hidden />
          {texto}
        </Link>
      ))}
    </nav>
  );
}
