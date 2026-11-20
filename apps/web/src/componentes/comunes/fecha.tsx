// Una fecha escrita como corresponde. Recibe lo que entrega la API («2026-11-19» o un momento
// exacto en ISO) y la muestra según `formato`:
//   "auto" (por defecto) «19 nov» (con año si no es de este año) · "corta" «19 nov» · "conAnio"
//   «19 nov 2026» · "conDia" «jue 19 nov» · "relativa" «hace 3 días» · "hora" «12:20» (hora de Chile).
import { fechaAuto, fechaConAnio, fechaConDia, fechaCorta, haceCuanto, horaChile } from "@/lib/formato";
import { cn } from "@/lib/utils";

const FORMATOS = {
  auto: fechaAuto,
  corta: fechaCorta,
  conAnio: fechaConAnio,
  conDia: fechaConDia,
  relativa: haceCuanto,
  hora: horaChile,
} as const;

export function Fecha({
  valor,
  formato = "auto",
  className,
}: {
  valor: string | null | undefined;
  formato?: keyof typeof FORMATOS;
  className?: string;
}) {
  if (!valor) return <span className={cn("text-soft", className)}>—</span>;
  return (
    <time dateTime={valor} className={cn("whitespace-nowrap", className)}>
      {FORMATOS[formato](valor)}
    </time>
  );
}
