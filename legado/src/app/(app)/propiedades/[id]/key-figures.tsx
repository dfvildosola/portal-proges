import { Landmark, Wallet, TrendingUp, Receipt } from "lucide-react";
import type { Currency, ValorFuente } from "@/generated/prisma/enums";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { valorFuenteLabels } from "@/lib/domain";
import { formatMoney } from "@/lib/format";
import {
  antiguedad,
  mesesDesde,
  valorDesactualizado,
} from "@/lib/property-metrics";
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
// valor va «—» y la línea explica por qué. `warning` pinta esa línea de aviso.
function Cifra({
  label,
  icon: Icon,
  value,
  sub,
  negative,
  warning,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  value: string | null;
  sub: string;
  negative?: boolean;
  warning?: boolean;
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
        <p
          className={`text-xs ${warning ? "text-warning" : "text-muted-foreground"}`}
        >
          {sub}
        </p>
      </CardHeader>
    </Card>
  );
}

// Línea bajo el valor comercial: «Tasación · hace 3 meses». Muestra la fuente y la
// antigüedad que haya; sin fecha dice «sin fecha». Pasados 12 meses suma
// «desactualizado».
function lineaDelValor(
  fuente: ValorFuente | null,
  fecha: Date | null,
  now: Date,
): string {
  const partes: string[] = [];
  if (fuente) partes.push(valorFuenteLabels[fuente]);
  partes.push(fecha ? antiguedad(mesesDesde(fecha, now)) : "sin fecha");
  if (valorDesactualizado(fecha, now)) partes.push("desactualizado");
  return partes.join(" · ");
}

// Las 4 cifras de la ficha: valor comercial (con su fuente y antigüedad), renta
// mensual, rentabilidad neta (con la bruta en chico) y costo anual.
export function KeyFigures({
  valorComercial,
  valorFecha,
  valorFuente,
  renta,
  rentabilidad,
  costo,
  now,
}: {
  valorComercial: { monto: number; moneda: Currency } | null;
  valorFecha: Date | null;
  valorFuente: ValorFuente | null;
  renta: RentaMensual | null;
  rentabilidad: Rentabilidad | null;
  costo: Costo;
  now: Date;
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
          sub={
            hayValor
              ? lineaDelValor(valorFuente, valorFecha, now)
              : "falta valor comercial"
          }
          warning={hayValor && valorDesactualizado(valorFecha, now)}
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
