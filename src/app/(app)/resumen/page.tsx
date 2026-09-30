import Link from "next/link";
import {
  TrendingUp,
  Landmark,
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  Scale,
  AlertTriangle,
  Receipt,
  Home as HomeIcon,
  Tag,
} from "lucide-react";
import { db } from "@/lib/db";
import { getOrgId } from "@/lib/org";
import { getLatestUf, toCLP } from "@/lib/currency";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatMoney } from "@/lib/format";
import {
  propertyTypeLabels,
  movementCategoryLabels,
} from "@/lib/domain";
import { OwnerFilter } from "./owner-filter";
import { RentabilidadTable } from "./rentabilidad-table";
import type { RentabilidadRow } from "./rentabilidad-table";

// Paleta para el gráfico de sociedades: variables del tema (globals.css), que
// cambian solas entre claro y oscuro.
const DONUT_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
  "var(--chart-8)",
];

// Arma los datos de la dona: ordena de mayor a menor, asigna colores y agrupa la
// cola en "Otros" si hay más de `max` segmentos (para no saturar el gráfico).
function toDonutItems(
  rows: { label: string; value: number }[],
  max = 8,
): { label: string; value: number; color: string }[] {
  const sorted = [...rows].filter((r) => r.value > 0).sort((a, b) => b.value - a.value);
  const top = sorted.slice(0, max).map((r, i) => ({
    ...r,
    color: DONUT_COLORS[i % DONUT_COLORS.length],
  }));
  const rest = sorted.slice(max);
  if (rest.length > 0) {
    top.push({
      label: "Otros",
      value: rest.reduce((s, r) => s + r.value, 0),
      color: "var(--chart-other)",
    });
  }
  return top;
}

function formatPct(n: number, digits = 1): string {
  return `${new Intl.NumberFormat("es-CL", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n)}%`;
}

export default async function ResumenPage({
  searchParams,
}: PageProps<"/resumen">) {
  const sp = await searchParams;
  // Selección: "grupo:<id>" (consolida sus entidades) | "owner:<id>" | null.
  const sel = typeof sp.sel === "string" ? sp.sel : null;
  const selGrupoId = sel?.startsWith("grupo:") ? sel.slice(6) : null;
  const selOwnerId = sel?.startsWith("owner:") ? sel.slice(6) : null;

  const orgId = await getOrgId();
  const now = new Date();
  const year = now.getUTCFullYear();
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const yearEnd = new Date(Date.UTC(year, 11, 31, 23, 59, 59));

  const [uf, grupos, owners, properties, movements, charges] = await Promise.all([
    getLatestUf(),
    db.grupo.findMany({
      where: { organizationId: orgId },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true },
    }),
    db.owner.findMany({
      where: { organizationId: orgId },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true },
    }),
    db.property.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        rolSII: true,
        tipo: true,
        direccion: true,
        comuna: true,
        objetivo: true,
        estado: true,
        valorComercial: true,
        valorComercialMoneda: true,
        owners: {
          select: {
            ownerId: true,
            porcentaje: true,
            owner: { select: { grupoId: true } },
          },
        },
        contracts: {
          where: { estado: "VIGENTE" },
          select: { monto: true, moneda: true },
        },
        assessments: {
          orderBy: { anio: "desc" },
          take: 1,
          select: { valor: true },
        },
        taxes: { where: { estado: "PENDIENTE" }, select: { monto: true } },
      },
    }),
    db.movement.findMany({
      where: {
        organizationId: orgId,
        fecha: { gte: yearStart, lte: yearEnd },
      },
      select: {
        propertyId: true,
        tipo: true,
        categoria: true,
        monto: true,
        moneda: true,
      },
    }),
    db.rentCharge.findMany({
      where: { organizationId: orgId },
      select: {
        estado: true,
        montoEsperado: true,
        montoPagado: true,
        moneda: true,
        fechaPago: true,
        contract: { select: { propertyId: true } },
      },
    }),
  ]);

  // Nombre de lo seleccionado (para el encabezado).
  const selGrupoNombre = selGrupoId
    ? grupos.find((g) => g.id === selGrupoId)?.nombre ?? null
    : null;
  const selOwnerNombre = selOwnerId
    ? owners.find((o) => o.id === selOwnerId)?.nombre ?? null
    : null;
  const selNombre = selGrupoNombre ?? selOwnerNombre;

  // Fracción de propiedad de lo seleccionado sobre una propiedad.
  // - Cartera completa: 1.
  // - Entidad: su %.
  // - Grupo: suma del % de TODAS las entidades del grupo en esa propiedad.
  // Devuelve null si no participa (se excluye la propiedad).
  function shareOf(prop: (typeof properties)[number]): number | null {
    if (selOwnerId) {
      const po = prop.owners.find((o) => o.ownerId === selOwnerId);
      return po ? Number(po.porcentaje) / 100 : null;
    }
    if (selGrupoId) {
      let pct = 0;
      let any = false;
      for (const po of prop.owners) {
        if (po.owner.grupoId === selGrupoId) {
          pct += Number(po.porcentaje);
          any = true;
        }
      }
      return any ? pct / 100 : null;
    }
    return 1;
  }

  // --- Acumuladores -----------------------------------------------------------
  let patrimonioCLP = 0;
  let avaluoCLP = 0;
  let comercialComparable = 0; // solo propiedades con comercial Y avalúo
  let avaluoComparable = 0;
  let annualRentTotal = 0;
  let propsCount = 0;
  let desocupadas = 0;
  let arrendadaSinContrato = 0;
  let taxPendienteMonto = 0;
  let taxPendienteCount = 0;
  let enVentaCount = 0;
  let enVentaValorCLP = 0;

  const esCartera = !selGrupoId && !selOwnerId;
  const grupoNombre = new Map(grupos.map((g) => [g.id, g.nombre]));
  const ownerNombre = new Map(owners.map((o) => [o.id, o.nombre]));

  const porTipo = new Map<string, number>();
  const porComuna = new Map<string, number>();
  // Patrimonio por entidad del grupo (al ver un grupo) → gráfico.
  const porEntidad = new Map<string, number>();
  // Patrimonio por titular (al ver la cartera): cada grupo consolidado + cada
  // dueño independiente → gráfico. Clave: "grupo:<id>" | "owner:<id>".
  const porTitular = new Map<string, number>();
  const fracById = new Map<string, number>();
  const rentaRows: RentabilidadRow[] = [];

  for (const p of properties) {
    const frac = shareOf(p);
    if (frac === null) continue;
    fracById.set(p.id, frac);
    propsCount++;

    const comercial = toCLP(p.valorComercial, p.valorComercialMoneda, uf);
    if (comercial !== null) {
      const v = comercial * frac;
      patrimonioCLP += v;
      porTipo.set(p.tipo, (porTipo.get(p.tipo) ?? 0) + v);
      porComuna.set(p.comuna, (porComuna.get(p.comuna) ?? 0) + v);
      // Reparto por sociedad del grupo (cada entidad aporta su % de la propiedad).
      if (selGrupoId) {
        for (const po of p.owners) {
          if (po.owner.grupoId === selGrupoId) {
            porEntidad.set(
              po.ownerId,
              (porEntidad.get(po.ownerId) ?? 0) +
                comercial * (Number(po.porcentaje) / 100),
            );
          }
        }
      }
      // Reparto por titular en la cartera: cada grupo consolidado o dueño suelto.
      if (esCartera) {
        for (const po of p.owners) {
          const key = po.owner.grupoId
            ? `grupo:${po.owner.grupoId}`
            : `owner:${po.ownerId}`;
          porTitular.set(
            key,
            (porTitular.get(key) ?? 0) +
              comercial * (Number(po.porcentaje) / 100),
          );
        }
      }
    }

    const avaluo = p.assessments[0] ? Number(p.assessments[0].valor) : null;
    if (avaluo !== null) avaluoCLP += avaluo * frac;
    if (comercial !== null && avaluo !== null) {
      comercialComparable += comercial * frac;
      avaluoComparable += avaluo * frac;
    }

    let annual = 0;
    for (const c of p.contracts) {
      const m = toCLP(c.monto, c.moneda, uf);
      if (m !== null) annual += m * 12;
    }
    const hasContract = p.contracts.length > 0;
    annualRentTotal += annual * frac;

    if (comercial !== null) {
      rentaRows.push({
        id: p.id,
        rol: p.rolSII,
        direccion: p.direccion,
        tipo: p.tipo,
        objetivo: p.objetivo,
        estado: p.estado,
        valorCLP: comercial * frac,
        annualCLP: annual * frac,
        capRate: comercial > 0 && hasContract ? (annual / comercial) * 100 : null,
      });
    }

    if (p.estado === "DESOCUPADA") desocupadas++;
    if (p.estado === "ARRENDADA" && !hasContract) arrendadaSinContrato++;
    if (p.estado === "EN_VENTA") {
      enVentaCount++;
      if (comercial !== null) enVentaValorCLP += comercial * frac;
    }

    for (const t of p.taxes) {
      taxPendienteCount++;
      if (t.monto !== null) taxPendienteMonto += Number(t.monto) * frac;
    }
  }

  // Flujo del año. Ingresos = arriendo cobrado (cobros PAGADOS, que es donde vive
  // el ingreso por renta) + otros ingresos manuales del libro Movement. Gastos =
  // movimientos de gasto. El arriendo NO se duplica: la cobranza no genera Movement.
  let ingresoOtros = 0;
  let gastos = 0;
  const gastoPorCat = new Map<string, number>();
  for (const m of movements) {
    const frac = fracById.get(m.propertyId);
    if (frac === undefined) continue;
    const clp = toCLP(m.monto, m.moneda, uf);
    if (clp === null) continue;
    const v = clp * frac;
    if (m.tipo === "INGRESO") ingresoOtros += v;
    else {
      gastos += v;
      gastoPorCat.set(m.categoria, (gastoPorCat.get(m.categoria) ?? 0) + v);
    }
  }

  // Cobranza + ingreso por arriendo (un solo recorrido por los cobros).
  let atrasadoMonto = 0;
  let atrasadoCount = 0;
  let ingresoArriendo = 0;
  for (const ch of charges) {
    const frac = fracById.get(ch.contract.propertyId);
    if (frac === undefined) continue;
    if (ch.estado === "ATRASADO") {
      atrasadoCount++;
      const clp = toCLP(ch.montoEsperado, ch.moneda, uf);
      if (clp !== null) atrasadoMonto += clp * frac;
    }
    if (
      ch.estado === "PAGADO" &&
      ch.fechaPago &&
      ch.fechaPago >= yearStart &&
      ch.fechaPago <= yearEnd
    ) {
      const clp = toCLP(ch.montoPagado ?? ch.montoEsperado, ch.moneda, uf);
      if (clp !== null) ingresoArriendo += clp * frac;
    }
  }
  const ingresos = ingresoArriendo + ingresoOtros;
  const neto = ingresos - gastos;

  const plusvaliaPct =
    avaluoComparable > 0
      ? (comercialComparable / avaluoComparable - 1) * 100
      : null;
  const patrimonioUF = uf ? patrimonioCLP / uf : null;
  const yieldBruto =
    patrimonioCLP > 0 ? (annualRentTotal / patrimonioCLP) * 100 : null;


  const tiposOrdenados = [...porTipo.entries()].sort((a, b) => b[1] - a[1]);
  const comunasOrdenadas = [...porComuna.entries()].sort((a, b) => b[1] - a[1]);
  const gastosOrdenados = [...gastoPorCat.entries()].sort((a, b) => b[1] - a[1]);

  // Gráfico de patrimonio: por sociedad (al ver un grupo) o por titular (cartera).
  const entidadesChart = toDonutItems(
    [...porEntidad.entries()].map(([ownerId, value]) => ({
      label: ownerNombre.get(ownerId) ?? "Entidad",
      value,
    })),
  );
  const titularChart = toDonutItems(
    [...porTitular.entries()].map(([key, value]) => ({
      label: key.startsWith("grupo:")
        ? grupoNombre.get(key.slice(6)) ?? "Grupo"
        : ownerNombre.get(key.slice(6)) ?? "Entidad",
      value,
    })),
  );
  const donut = selGrupoId
    ? { title: "Patrimonio por sociedad", items: entidadesChart }
    : esCartera
      ? { title: "Patrimonio por titular", items: titularChart }
      : null;

  const ufNota = uf
    ? `Montos en UF convertidos a 1 UF = ${formatMoney(uf, "CLP")}.`
    : "Sin valor UF cargado: los montos en UF no se incluyen en los totales.";

  return (
    <>
      <PageHeader
        title="Resumen"
        description={
          selGrupoNombre
            ? `Patrimonio consolidado del grupo ${selGrupoNombre} (suma de sus entidades, ponderado por % de propiedad).`
            : selOwnerNombre
              ? `Patrimonio y resultados de ${selOwnerNombre} (ponderado por su % de propiedad).`
              : "Patrimonio, flujo y rentabilidad de toda la cartera."
        }
        action={<OwnerFilter grupos={grupos} owners={owners} value={sel} />}
      />

      {propsCount === 0 ? (
        <p className="text-sm text-muted-foreground">
          {selNombre
            ? `${selNombre} no tiene propiedades asociadas.`
            : "Aún no hay propiedades registradas."}
        </p>
      ) : (
        <div className="space-y-10">
          {/* ---------------- Patrimonio ---------------- */}
          <section>
            <SectionTitle>Patrimonio</SectionTitle>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
              <Metric
                label="Valor comercial"
                value={formatMoney(patrimonioCLP, "CLP")}
                sub={
                  patrimonioUF !== null
                    ? `≈ ${formatMoney(patrimonioUF, "UF")}`
                    : undefined
                }
                icon={Landmark}
              />
              <Metric
                label="Avalúo fiscal"
                value={formatMoney(avaluoCLP, "CLP")}
                sub="base de contribuciones"
                icon={Scale}
              />
              <Metric
                label="Plusvalía s/ fiscal"
                value={plusvaliaPct !== null ? formatPct(plusvaliaPct) : "—"}
                sub={
                  plusvaliaPct !== null
                    ? "comercial vs avalúo"
                    : "falta comercial o avalúo"
                }
                icon={TrendingUp}
              />
              <Metric
                label="Propiedades"
                value={String(propsCount)}
                sub={selNombre ? "con participación" : "en cartera"}
                icon={HomeIcon}
              />
              <Metric
                label="En venta"
                value={String(enVentaCount)}
                sub={
                  enVentaCount > 0
                    ? formatMoney(enVentaValorCLP, "CLP")
                    : "ninguna"
                }
                icon={Tag}
                href={enVentaCount > 0 ? "/propiedades" : undefined}
              />
            </div>

            {donut && donut.items.length > 0 && (
              <div className="mt-4">
                <Donut title={donut.title} items={donut.items} />
              </div>
            )}

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <Breakdown
                title="Por tipo"
                items={tiposOrdenados.map(([k, v]) => ({
                  label: propertyTypeLabels[k as keyof typeof propertyTypeLabels],
                  value: v,
                }))}
                total={patrimonioCLP}
              />
              <Breakdown
                title="Por comuna"
                items={comunasOrdenadas.map(([k, v]) => ({ label: k, value: v }))}
                total={patrimonioCLP}
              />
            </div>
          </section>

          {/* ---------------- Flujo del año ---------------- */}
          <section>
            <SectionTitle>Flujo {year}</SectionTitle>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Metric
                label="Ingresos"
                value={formatMoney(ingresos, "CLP")}
                sub={
                  ingresoOtros > 0
                    ? `${formatMoney(ingresoArriendo, "CLP")} arriendo + otros`
                    : "arriendo cobrado"
                }
                icon={ArrowUpRight}
              />
              <Metric
                label="Gastos"
                value={formatMoney(gastos, "CLP")}
                icon={ArrowDownRight}
              />
              <Metric
                label="Resultado neto"
                value={formatMoney(neto, "CLP")}
                sub={
                  ingresos > 0
                    ? `margen ${formatPct((neto / ingresos) * 100, 0)}`
                    : undefined
                }
                icon={Wallet}
                emphasis={neto < 0 ? "negative" : "positive"}
              />
            </div>

            <div className="mt-4">
              <Breakdown
                title="Gastos por categoría"
                items={gastosOrdenados.map(([k, v]) => ({
                  label:
                    movementCategoryLabels[
                      k as keyof typeof movementCategoryLabels
                    ],
                  value: v,
                }))}
                total={gastos}
                emptyText="Sin gastos registrados este año."
              />
            </div>
          </section>

          {/* ---------------- Rentabilidad ---------------- */}
          <section>
            <div className="mb-3 flex items-baseline justify-between gap-4">
              <SectionTitle className="mb-0">Rentabilidad</SectionTitle>
              {yieldBruto !== null && (
                <span className="text-sm text-muted-foreground">
                  Yield bruto cartera:{" "}
                  <span className="font-semibold text-foreground tabular-nums">
                    {formatPct(yieldBruto)}
                  </span>
                </span>
              )}
            </div>
            <p className="mb-3 text-sm text-muted-foreground">
              Cap rate = arriendo anual ÷ valor comercial.
            </p>
            <RentabilidadTable data={rentaRows} />
          </section>

          {/* ---------------- Salud / cobranza ---------------- */}
          <section>
            <SectionTitle>Salud de la cartera</SectionTitle>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Metric
                label="Arriendos atrasados"
                value={formatMoney(atrasadoMonto, "CLP")}
                sub={`${atrasadoCount} ${atrasadoCount === 1 ? "cobro" : "cobros"}`}
                icon={AlertTriangle}
                emphasis={atrasadoCount > 0 ? "negative" : undefined}
                href="/cobranza"
              />
              <Metric
                label="Contribuciones por pagar"
                value={formatMoney(taxPendienteMonto, "CLP")}
                sub={`${taxPendienteCount} ${taxPendienteCount === 1 ? "cuota" : "cuotas"}`}
                icon={Receipt}
                emphasis={taxPendienteCount > 0 ? "negative" : undefined}
              />
              <Metric
                label="Desocupadas"
                value={String(desocupadas)}
                sub="sin uso"
                icon={HomeIcon}
                emphasis={desocupadas > 0 ? "negative" : undefined}
              />
              <Metric
                label="Arrendadas sin contrato"
                value={String(arrendadaSinContrato)}
                sub="riesgo legal"
                icon={AlertTriangle}
                emphasis={arrendadaSinContrato > 0 ? "negative" : undefined}
              />
            </div>
          </section>

          <p className="text-xs text-muted-foreground">{ufNota}</p>
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Presentación
// ---------------------------------------------------------------------------

function SectionTitle({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2 className={`mb-3 text-sm font-medium text-muted-foreground ${className}`}>
      {children}
    </h2>
  );
}

function Metric({
  label,
  value,
  sub,
  icon: Icon,
  emphasis,
  href,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  emphasis?: "positive" | "negative";
  href?: string;
}) {
  const card = (
    <Card className={href ? "transition-colors hover:bg-muted/50" : ""}>
      <CardHeader>
        <CardDescription className="flex items-center justify-between">
          {label}
          <Icon className="size-4" />
        </CardDescription>
        <CardTitle
          className={`text-2xl font-semibold tabular-nums ${
            emphasis === "negative"
              ? "text-destructive"
              : emphasis === "positive"
                ? "text-success"
                : ""
          }`}
        >
          {value}
        </CardTitle>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </CardHeader>
    </Card>
  );
  return href ? (
    <Link href={href} className="block">
      {card}
    </Link>
  ) : (
    card
  );
}

function Breakdown({
  title,
  items,
  total,
  emptyText = "Sin datos.",
}: {
  title: string;
  items: { label: string; value: number }[];
  total: number;
  emptyText?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          items.map((it) => {
            const pct = total > 0 ? (it.value / total) * 100 : 0;
            return (
              <div key={it.label} className="space-y-1">
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="truncate">{it.label}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {formatMoney(it.value, "CLP")} · {formatPct(pct, 0)}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.max(pct, 2)}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

// Gráfico de dona (SVG puro, sin dependencias) + leyenda. Reparte el patrimonio
// entre las sociedades de un grupo.
function Donut({
  title,
  items,
}: {
  title: string;
  items: { label: string; value: number; color: string }[];
}) {
  const total = items.reduce((s, it) => s + it.value, 0) || 1;
  const r = 54;
  const stroke = 22;
  const C = 2 * Math.PI * r;

  // Precalcula longitud y desfase de cada arco (sin mutar en el render).
  const segments: { label: string; color: string; len: number; offset: number }[] =
    [];
  let acc = 0;
  for (const it of items) {
    const len = (it.value / total) * C;
    segments.push({ label: it.label, color: it.color, len, offset: acc });
    acc += len;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
        <svg
          width="140"
          height="140"
          viewBox="0 0 140 140"
          className="shrink-0"
          role="img"
          aria-label={title}
        >
          <g transform="translate(70,70) rotate(-90)">
            <circle
              r={r}
              fill="none"
              className="stroke-muted"
              strokeWidth={stroke}
            />
            {segments.map((s) => (
              <circle
                key={s.label}
                r={r}
                fill="none"
                style={{ stroke: s.color }}
                strokeWidth={stroke}
                strokeDasharray={`${s.len} ${C - s.len}`}
                strokeDashoffset={-s.offset}
              />
            ))}
          </g>
        </svg>
        <ul className="w-full space-y-2 text-sm">
          {items.map((it) => (
            <li key={it.label} className="flex items-center gap-2">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ background: it.color }}
              />
              <span className="flex-1 truncate">{it.label}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {formatMoney(it.value, "CLP")} ·{" "}
                {formatPct((it.value / total) * 100, 0)}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
