// La barra de avance de la maqueta: un riel gris con el tramo hecho en el color de marca.
// Lleva `role="progressbar"` para que un lector de pantalla diga «70 por ciento».
import { cn } from "@/lib/utils";

export function BarraAvance({ valor, className }: { valor: number; className?: string }) {
  const porcentaje = Math.max(0, Math.min(100, Math.round(valor)));
  return (
    <div
      role="progressbar"
      aria-label="Avance"
      aria-valuenow={porcentaje}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-line", className)}
    >
      <div className="h-full rounded-full bg-ink" style={{ width: `${porcentaje}%` }} />
    </div>
  );
}
