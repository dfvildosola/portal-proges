import { CircleAlert, CircleCheck, CircleDashed, CircleX } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Chequeo } from "@/lib/property-metrics";

const ICONO = {
  ok: { Icon: CircleCheck, color: "text-success", sr: "Al día" },
  falta: { Icon: CircleAlert, color: "text-warning", sr: "Falta" },
  vencido: { Icon: CircleX, color: "text-destructive", sr: "Vencido" },
} as const;

// Bloque «Datos al día»: los 3 chequeos de la ficha y una línea fija sobre la
// fecha del valor comercial, que todavía no se guarda.
export function DataFreshness({ chequeos }: { chequeos: Chequeo[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Datos al día</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2.5">
          {chequeos.map((c) => {
            const { Icon, color, sr } = ICONO[c.estado];
            return (
              <li key={c.clave} className="flex items-start gap-2 text-sm">
                <Icon className={`mt-0.5 size-4 shrink-0 ${color}`} />
                <span className="sr-only">{sr}: </span>
                <span>{c.texto}</span>
              </li>
            );
          })}
          <li className="flex items-start gap-2 text-sm text-muted-foreground">
            <CircleDashed className="mt-0.5 size-4 shrink-0" />
            <span>Valor comercial: sin fecha</span>
          </li>
        </ul>
      </CardContent>
    </Card>
  );
}
