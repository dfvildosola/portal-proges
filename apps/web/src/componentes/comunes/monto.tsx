// Una cantidad de plata escrita como corresponde: «$ 1.234.567» o «UF 1.234,56».
// Recibe el `Monto` tal como lo entrega la API ({ valor, moneda }); si no hay monto, escribe «—».
import type { Monto as MontoDeApi } from "@proges/contrato";
import { formatearMonto } from "@/lib/formato";
import { cn } from "@/lib/utils";

export function Monto({ valor, className }: { valor: MontoDeApi | null | undefined; className?: string }) {
  if (!valor) return <span className={cn("text-soft", className)}>—</span>;
  return <span className={cn("font-mono whitespace-nowrap tabular-nums", className)}>{formatearMonto(valor)}</span>;
}
