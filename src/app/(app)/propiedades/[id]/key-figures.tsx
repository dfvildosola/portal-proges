import { Landmark, Wallet, TrendingUp, Receipt } from "lucide-react";
import type { Currency } from "@/generated/prisma/enums";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatMoney } from "@/lib/format";
import type {
  Costo,
  RentaMensual,
  Rentabilidad,
} from "@/lib/property-metrics";

function formatPct(n: number): string {
  return `${new Intl.NumberFormat("es-CL", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(n)}%`;
}

// Una cifra: etiqueta con ícono, valor grande y una línea chica debajo. Si no hay
// valor va «—» y la línea explica por qué.
function Cifra({
  label,
  icon: Icon,
  value,
  sub,
  negative,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  value: string | null;
  sub: string;
  negative?: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardDescription className="flex items-center justify-between">
          {label}
          <Icon className="size-4" />
        </CardDescription>
        <CardTitle
          className={`text-2xl font-semibold tabular-nums ${
            value === null
              ? "text-muted-foreground"
              : negative
                ? "text-destructive"
                : ""
          }`}
        >
          {value ?? "—"}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </CardHeader>
    </Card>
  );
}

// Las 4 cifras de la ficha: valor comercial, renta mensual, rentabilidad neta
// (con la bruta en chico) y costo anual.
export function KeyFigures({
  valorComercial,
  renta,
  rentabilidad,
  costo,
}: {
  valorComercial: { monto: number; moneda: Currency } | null;
  renta: RentaMensual | null;
  rentabilidad: Rentabilidad | null;
  costo: Costo;
}) {
  const hayValor = valorComercial !== null && valorComercial.monto > 0;

  // Si la rentabilidad no sale es por una de tres razones, en este orden.
  const razonRentabilidad = !hayValor
    ? "falta valor comercial"
    : renta === null
      ? "sin contrato vigente"
      : "falta el valor UF";

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Cifra
          label="Valor comercial"
          icon={Landmark}
          value={
            hayValor
              ? formatMoney(valorComercial.monto, valorComercial.moneda)
              : null
          }
          sub={hayValor ? "sin fecha" : "falta valor comercial"}
        />
        <Cifra
          label="Renta mensual"
          icon={Wallet}
          value={renta ? formatMoney(renta.monto, renta.moneda) : null}
          sub={renta ? "contrato vigente" : "sin contrato vigente"}
        />
        <Cifra
          label="Rentabilidad neta"
          icon={TrendingUp}
          value={rentabilidad ? formatPct(rentabilidad.neta) : null}
          negative={rentabilidad !== null && rentabilidad.neta < 0}
          sub={
            rentabilidad
              ? `Bruta ${formatPct(rentabilidad.bruta)}`
              : razonRentabilidad
          }
        />
        <Cifra
          label="Costo anual"
          icon={Receipt}
          value={formatMoney(costo.total, "CLP")}
          sub={
            costo.total === 0
              ? "sin gastos ni contribuciones en 12 meses"
              : "últimos 12 meses"
          }
        />
      </div>
      {costo.sinConvertir > 0 && (
        <p className="text-xs text-warning">
          {costo.sinConvertir}{" "}
          {costo.sinConvertir === 1 ? "gasto" : "gastos"} en UF sin convertir:
          falta el valor UF.
        </p>
      )}
    </div>
  );
}
