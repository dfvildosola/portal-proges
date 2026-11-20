// Un elemento de un panel del Inicio: un título, una línea de apoyo y, a la derecha, una etiqueta
// o un botón. Si trae `href`, todo el elemento lleva al servicio (se toca en cualquier parte).
import Link from "next/link";
import type { ReactNode } from "react";
import { Tarjeta } from "@/componentes/ui/tarjeta";

export function ItemDelInicio({
  titulo,
  detalle,
  derecha,
  href,
}: {
  titulo: string;
  detalle: ReactNode;
  derecha?: ReactNode;
  href?: string;
}) {
  const contenido = (
    <Tarjeta tono="item" className={href ? "transition-colors hover:border-ink" : undefined}>
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0 text-[13px] leading-snug font-bold">{titulo}</span>
        {derecha}
      </div>
      <span className="text-xs text-soft">{detalle}</span>
    </Tarjeta>
  );
  if (!href) return contenido;
  return (
    <Link href={href} className="block rounded-[10px] outline-none focus-visible:ring-2 focus-visible:ring-ink/30">
      {contenido}
    </Link>
  );
}
