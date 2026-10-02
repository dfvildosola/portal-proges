import type { Currency, PropertyStatus } from "@/generated/prisma/enums";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { adjustmentTypeLabels, movementCategoryLabels } from "@/lib/domain";
import { formatDate, formatMoney, formatPeriodo } from "@/lib/format";
import type { Costo, EstadoPago, PuntoDePago } from "@/lib/property-metrics";
import type { LeaseContractRow } from "./lease-tab";

const MS_DIA = 24 * 60 * 60 * 1000;

// Días corridos de `now` a `fecha`, comparando medianoches UTC (las fechas del
// dominio se guardan a medianoche UTC). Negativo si la fecha ya pasó.
function diasHasta(fecha: Date, now: Date): number {
  const dia = (f: Date) =>
    Date.UTC(f.getUTCFullYear(), f.getUTCMonth(), f.getUTCDate());
  return Math.round((dia(fecha) - dia(now)) / MS_DIA);
}

function plural(n: number, uno: string, varios: string): string {
  return `${n} ${n === 1 ? uno : varios}`;
}

const ESTADOS_PAGO: Record<EstadoPago, { label: string; color: string }> = {
  PAGADO: { label: "Pagado", color: "bg-success" },
  PENDIENTE: { label: "Pendiente", color: "bg-warning" },
  ATRASADO: { label: "Atrasado", color: "bg-destructive" },
  SIN_COBRO: { label: "Sin cobro", color: "bg-muted" },
};

// Fila etiqueta / valor.
function Dato({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium">{children}</span>
    </div>
  );
}

function AvisoSinConvertir({ n }: { n: number }) {
  if (n === 0) return null;
  return (
    <p className="pt-2 text-xs text-warning">
      {plural(n, "gasto", "gastos")} en UF sin convertir: falta el valor UF.
    </p>
  );
}

// Tira de 12 meses: una celda por mes, con el mes en `title`, y su leyenda.
function TiraDePagos({ tira }: { tira: PuntoDePago[] }) {
  return (
    <div className="space-y-2 pt-3">
      <p className="text-sm text-muted-foreground">Pagos de los últimos 12 meses</p>
      <ul className="grid grid-cols-12 gap-1">
        {tira.map((punto) => {
          const texto = `${formatPeriodo(punto.periodo)}: ${ESTADOS_PAGO[punto.estado].label}`;
          return (
            <li
              key={punto.periodo}
              title={texto}
              aria-label={texto}
              className={`h-6 rounded-sm ${ESTADOS_PAGO[punto.estado].color}`}
            />
          );
        })}
      </ul>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{formatPeriodo(tira[0].periodo)}</span>
        <span>{formatPeriodo(tira[tira.length - 1].periodo)}</span>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {Object.values(ESTADOS_PAGO).map((e) => (
          <span key={e.label} className="inline-flex items-center gap-1.5">
            <span className={`size-2.5 rounded-sm ${e.color}`} />
            {e.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function Arrendada({
  contrato,
  tira,
  now,
}: {
  contrato: LeaseContractRow | undefined;
  tira: PuntoDePago[];
  now: Date;
}) {
  if (!contrato) {
    return (
      <>
        <p className="text-sm text-muted-foreground">
          Figura arrendada, pero no hay un contrato vigente cargado.
        </p>
        <TiraDePagos tira={tira} />
      </>
    );
  }
  const dias = diasHasta(contrato.fechaTermino, now);
  const termino =
    dias > 0
      ? `En ${plural(dias, "día", "días")} (${formatDate(contrato.fechaTermino)})`
      : dias === 0
        ? `Hoy (${formatDate(contrato.fechaTermino)})`
        : `Venció hace ${plural(-dias, "día", "días")} (${formatDate(contrato.fechaTermino)})`;
  const reajuste =
    contrato.aplicaReajuste && contrato.reajusteTipo !== "NINGUNO"
      ? `${adjustmentTypeLabels[contrato.reajusteTipo]}${
          contrato.reajusteFrecuenciaMeses
            ? ` cada ${plural(contrato.reajusteFrecuenciaMeses, "mes", "meses")}`
            : ""
        }`
      : adjustmentTypeLabels.NINGUNO;

  return (
    <>
      <div className="divide-y">
        <Dato label="Arrendatario">{contrato.tenant.nombre}</Dato>
        <Dato label="Término del contrato">
          <span className={dias <= 60 ? "text-warning" : ""}>{termino}</span>
        </Dato>
        <Dato label="Reajuste">{reajuste}</Dato>
      </div>
      <TiraDePagos tira={tira} />
    </>
  );
}

function Libre({
  libre,
  tieneContratos,
  estado,
}: {
  libre: { dias: number; desde: Date; costo: Costo } | null;
  tieneContratos: boolean;
  estado: PropertyStatus;
}) {
  if (!libre) {
    return (
      <p className="text-sm text-muted-foreground">
        {tieneContratos
          ? `Hay un contrato vigente, aunque la propiedad figura como ${estado === "DESOCUPADA" ? "desocupada" : "disponible"}.`
          : "Sin contratos registrados."}
      </p>
    );
  }
  return (
    <>
      <div className="divide-y">
        <Dato label="Sin contrato hace">
          {plural(libre.dias, "día", "días")}
        </Dato>
        <Dato label="Desde">{formatDate(libre.desde)}</Dato>
        <Dato label="Costo en ese tiempo">
          {formatMoney(libre.costo.total, "CLP")}
        </Dato>
      </div>
      <AvisoSinConvertir n={libre.costo.sinConvertir} />
    </>
  );
}

function UsoPropio({ costo }: { costo: Costo }) {
  return (
    <>
      <p className="pb-1 text-sm text-muted-foreground">
        Costo de los últimos 12 meses
      </p>
      <div className="divide-y">
        <Dato label="Contribuciones">
          {formatMoney(costo.contribuciones, "CLP")}
        </Dato>
        {costo.gastosPorCategoria.map((g) => (
          <Dato key={g.categoria} label={movementCategoryLabels[g.categoria]}>
            {formatMoney(g.monto, "CLP")}
          </Dato>
        ))}
        <Dato label="Total">
          <strong>{formatMoney(costo.total, "CLP")}</strong>
        </Dato>
      </div>
      <AvisoSinConvertir n={costo.sinConvertir} />
    </>
  );
}

// Bloque «Situación»: cambia según el estado de la propiedad.
export function SituationCard({
  estado,
  now,
  valorComercial,
  contratoVigente,
  tieneContratos,
  tira,
  libre,
  costoAnual,
}: {
  estado: PropertyStatus;
  now: Date;
  valorComercial: { monto: number; moneda: Currency } | null;
  contratoVigente: LeaseContractRow | undefined;
  tieneContratos: boolean;
  tira: PuntoDePago[];
  libre: { dias: number; desde: Date; costo: Costo } | null;
  costoAnual: Costo;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Situación</CardTitle>
      </CardHeader>
      <CardContent>
        {estado === "ARRENDADA" && (
          <Arrendada contrato={contratoVigente} tira={tira} now={now} />
        )}
        {(estado === "DISPONIBLE" || estado === "DESOCUPADA") && (
          <Libre libre={libre} tieneContratos={tieneContratos} estado={estado} />
        )}
        {estado === "USO_PROPIO" && <UsoPropio costo={costoAnual} />}
        {estado === "EN_VENTA" && (
          <Dato label="Valor comercial">
            {valorComercial
              ? formatMoney(valorComercial.monto, valorComercial.moneda)
              : "Sin valor comercial cargado"}
          </Dato>
        )}
      </CardContent>
    </Card>
  );
}
