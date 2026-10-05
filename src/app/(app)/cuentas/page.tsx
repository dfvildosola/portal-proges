import Link from "next/link";
import { hoyChile } from "@/lib/fechas";
import { Receipt } from "lucide-react";
import { db } from "@/lib/db";
import { getOrgId } from "@/lib/org";
import { BillStatus, BillType } from "@/generated/prisma/enums";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import {
  billTypeLabels,
  billStatusLabels,
  billStatusVariant,
} from "@/lib/domain";
import { formatMoney, formatDate } from "@/lib/format";

// Valida un parámetro de la URL contra los valores de un enum; si no calza, sin filtro.
function parseParam<T extends string>(
  raw: string | string[] | undefined,
  validos: readonly T[],
): T | undefined {
  return typeof raw === "string" && (validos as readonly string[]).includes(raw)
    ? (raw as T)
    : undefined;
}

// Chip de filtro: enlace que conserva el otro filtro y cambia este.
function FilterChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? "border-foreground bg-foreground text-background"
          : "hover:bg-muted"
      }`}
    >
      {children}
    </Link>
  );
}

export default async function CuentasPage({
  searchParams,
}: PageProps<"/cuentas">) {
  const sp = await searchParams;
  const tipo = parseParam(sp.tipo, Object.values(BillType));
  const estado = parseParam(sp.estado, Object.values(BillStatus));

  const orgId = await getOrgId();
  const bills = await db.propertyBill.findMany({
    where: {
      organizationId: orgId,
      ...(tipo && { tipo }),
      ...(estado && { estado }),
    },
    include: {
      property: { select: { id: true, rolSII: true, direccion: true } },
    },
    // Pendientes primero, y dentro de cada grupo las que vencen antes.
    orderBy: [{ estado: "asc" }, { fechaVencimiento: "asc" }],
  });

  const hoy = hoyChile();
  const href = (t?: string, e?: string) => {
    const q = new URLSearchParams();
    if (t) q.set("tipo", t);
    if (e) q.set("estado", e);
    const s = q.toString();
    return s ? `/cuentas?${s}` : "/cuentas";
  };

  return (
    <>
      <PageHeader
        title="Cuentas"
        description="Gastos comunes, luz, agua y gas de todas las propiedades."
      />

      <div className="mb-6 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-12 text-xs font-medium text-muted-foreground">Tipo</span>
          <FilterChip href={href(undefined, estado)} active={!tipo}>
            Todos
          </FilterChip>
          {Object.values(BillType).map((t) => (
            <FilterChip key={t} href={href(t, estado)} active={tipo === t}>
              {billTypeLabels[t]}
            </FilterChip>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-12 text-xs font-medium text-muted-foreground">Estado</span>
          <FilterChip href={href(tipo, undefined)} active={!estado}>
            Todos
          </FilterChip>
          {Object.values(BillStatus).map((e) => (
            <FilterChip key={e} href={href(tipo, e)} active={estado === e}>
              {billStatusLabels[e]}
            </FilterChip>
          ))}
        </div>
      </div>

      {bills.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Sin cuentas"
          description="No hay cuentas con estos filtros. Se anotan desde la pestaña «Cuentas» de cada propiedad."
        />
      ) : (
        <div className="divide-y rounded-xl border">
          {bills.map((b) => {
            const vencida = b.estado === "PENDIENTE" && b.fechaVencimiento < hoy;
            return (
              <div
                key={b.id}
                className={`flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${
                  vencida ? "bg-destructive/5" : ""
                }`}
              >
                <div>
                  <span className="text-sm font-medium">
                    {billTypeLabels[b.tipo]} · {b.periodo}
                  </span>
                  <span className="ml-2 text-xs text-muted-foreground tabular-nums">
                    {b.monto !== null ? `${formatMoney(b.monto, b.moneda)} · ` : ""}
                    vence {formatDate(b.fechaVencimiento)}
                  </span>
                  <Link
                    href={`/propiedades/${b.property.id}`}
                    className="block text-xs text-muted-foreground underline-offset-2 hover:underline"
                  >
                    {b.property.rolSII} · {b.property.direccion} →
                  </Link>
                  {b.estado === "PAGADA" && b.fechaPago && (
                    <span className="block text-xs text-muted-foreground">
                      Pagada el {formatDate(b.fechaPago)}
                    </span>
                  )}
                </div>
                {vencida ? (
                  <Badge variant="destructive">Vencida</Badge>
                ) : (
                  <Badge variant={billStatusVariant(b.estado)}>
                    {billStatusLabels[b.estado]}
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
