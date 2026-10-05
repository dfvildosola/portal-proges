import Link from "next/link";
import { Wallet, Zap, ChevronLeft, ChevronRight } from "lucide-react";
import { db } from "@/lib/db";
import { getOrgId } from "@/lib/org";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { formatPeriodo } from "@/lib/format";
import { mesActual } from "@/lib/fechas";
import { MonthPicker } from "./month-picker";
import { ChargesTable } from "./charges-table";
import type { ChargeRow } from "./charges-table";
import { generateMonthCharges } from "./actions";

function addMonths(mes: string, delta: number): string {
  const [y, m] = mes.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default async function CobranzaPage({
  searchParams,
}: PageProps<"/cobranza">) {
  const sp = await searchParams;
  const rawMes = sp.mes;
  const mes =
    typeof rawMes === "string" && /^\d{4}-\d{2}$/.test(rawMes)
      ? rawMes
      : mesActual();

  const orgId = await getOrgId();
  const charges = await db.rentCharge.findMany({
    where: { organizationId: orgId, periodo: mes },
    include: {
      contract: {
        include: {
          property: { select: { id: true, rolSII: true, direccion: true } },
          tenant: { select: { nombre: true } },
        },
      },
    },
    orderBy: [{ estado: "asc" }, { fechaVencimiento: "asc" }],
  });

  const rows: ChargeRow[] = charges.map((ch) => ({
    id: ch.id,
    contractId: ch.contractId,
    periodo: ch.periodo,
    montoEsperado: Number(ch.montoEsperado),
    moneda: ch.moneda,
    fechaVencimiento: ch.fechaVencimiento.toISOString(),
    estado: ch.estado,
    fechaPago: ch.fechaPago?.toISOString() ?? null,
    montoPagado: ch.montoPagado !== null ? Number(ch.montoPagado) : null,
    interesMora: ch.interesMora !== null ? Number(ch.interesMora) : null,
    notas: ch.notas,
    propertyId: ch.contract.property.id,
    propertyRol: ch.contract.property.rolSII,
    propertyDireccion: ch.contract.property.direccion,
    tenantNombre: ch.contract.tenant.nombre,
  }));

  const prevMes = addMonths(mes, -1);
  const nextMes = addMonths(mes, 1);

  return (
    <>
      <PageHeader
        title="Cobranza"
        description="La corrida del mes: quién pagó, quién no, cuánto."
      />

      {/* Navegación por mes */}
      <div className="mb-6 flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          nativeButton={false}
          render={<Link href={`/cobranza?mes=${prevMes}`} aria-label={formatPeriodo(prevMes)} />}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <MonthPicker mes={mes} />
        <Button
          variant="ghost"
          size="icon-sm"
          nativeButton={false}
          render={<Link href={`/cobranza?mes=${nextMes}`} aria-label={formatPeriodo(nextMes)} />}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {/* Contador + botón generar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {rows.length === 0
            ? "Sin cobros para este período."
            : `${rows.length} ${rows.length === 1 ? "cobro" : "cobros"} en ${formatPeriodo(mes)}.`}
        </p>
        <form action={generateMonthCharges}>
          <input type="hidden" name="mes" value={mes} />
          <Button type="submit" variant="outline" size="sm">
            <Zap className="size-4" />
            Generar cobros del mes
          </Button>
        </form>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Sin cobros para este período"
          description="Haz clic en 'Generar cobros del mes' para crear cobros para todos los contratos vigentes."
        />
      ) : (
        <ChargesTable data={rows} />
      )}
    </>
  );
}
