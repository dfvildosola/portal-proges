// «Modificado por Cecilia el 19-11-2026»: quién guardó por última vez una propiedad o un
// contrato. El equipo y el dueño editan lo mismo y vale el último que guarda (ADR 0010); esta
// línea deja ver quién fue. No muestra nada si el registro nunca pasó por una edición con
// nombre (los datos que ya existían antes de esta marca).
import { db } from "@/lib/db";
import { diaChile } from "@/lib/servicios";
import { formatDate } from "@/lib/format";

export async function ModificadoPor({
  usuarioId,
  fecha,
  className,
}: {
  usuarioId: string | null;
  fecha: Date;
  className?: string;
}) {
  if (!usuarioId) return null;
  const usuario = await db.usuario.findUnique({
    where: { id: usuarioId },
    select: { nombre: true },
  });
  if (!usuario) return null;
  return (
    <p className={className ?? "text-xs text-muted-foreground"}>
      Modificado por {usuario.nombre} el {formatDate(diaChile(fecha))}
    </p>
  );
}
