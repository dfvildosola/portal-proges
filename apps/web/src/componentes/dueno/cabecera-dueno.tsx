// La franja de arriba del dueño: el nombre del cliente y quién está conectado. En celular lleva
// además la marca «Proges» (no hay menú lateral). El botón de la derecha es el de Clerk: abre la
// cuenta y permite cerrar sesión.
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";

export function CabeceraDueno({ cliente, persona }: { cliente: string; persona: string }) {
  return (
    <div className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-line bg-bg px-4 py-2 lg:px-6">
      <Link href="/mi" className="min-w-0 leading-tight">
        <span className="block text-[17px] font-extrabold tracking-tight lg:hidden">Proges</span>
        <span className="block truncate text-[13px] font-bold">{cliente}</span>
      </Link>
      <div className="flex items-center gap-3">
        <p className="hidden truncate text-[12px] text-soft sm:block">{persona}</p>
        <UserButton />
      </div>
    </div>
  );
}
