import Link from "next/link";
import { ChevronLeft } from "lucide-react";

// Enlace "volver" estándar (cabecera de páginas de detalle/formulario).
export function BackLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ChevronLeft className="size-4" />
      {children}
    </Link>
  );
}
