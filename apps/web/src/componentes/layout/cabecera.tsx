// La franja de arriba: quién está conectado. En celular lleva además el nombre «Proges» (no hay
// menú lateral); en computador el nombre va en el menú. El botón de la derecha es el de Clerk:
// abre la cuenta y permite cerrar sesión.
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";

export function Cabecera({ nombre, rol }: { nombre: string; rol: string }) {
  return (
    <div className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-line bg-bg px-4 py-2 lg:px-6">
      <Link href="/hoy" className="text-[17px] font-extrabold tracking-tight lg:invisible">
        Proges
      </Link>
      <div className="flex items-center gap-3">
        <div className="min-w-0 text-right leading-tight">
          <p className="truncate text-[13px] font-bold">{nombre}</p>
          <p className="text-[11px] text-soft">{rol}</p>
        </div>
        <UserButton />
      </div>
    </div>
  );
}
