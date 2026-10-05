import {
  TrendingUp,
  Landmark,
  PiggyBank,
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  Scale,
  AlertTriangle,
  Receipt,
  Home as HomeIcon,
  Tag,
} from "lucide-react";
import { hoyChile } from "@/lib/fechas";
import { db } from "@/lib/db";
import { getOrgId } from "@/lib/org";
import { getLatestUf, toCLP } from "@/lib/currency";
import { PageHeader } from "@/components/page-header";
import { formatMoney } from "@/lib/format";
import {
  propertyTypeLabels,
  movementCategoryLabels,
} from "@/lib/domain";
import { OwnerFilter } from "./owner-filter";
import { RentabilidadTable } from "./rentabilidad-table";
import type { RentabilidadRow } from "./rentabilidad-table";
import {
  Breakdown,
  Donut,
  Metric,
  SectionTitle,
  formatPct,
  toDonutItems,
} from "./parts";

export default async function ResumenPage({
  searchParams,
}: PageProps<"/resumen">) {
  const sp = await searchParams;
  // Selección: "grupo:<id>" (consolida sus entidades) | "owner:<id>" | null.
  const sel = typeof sp.sel === "string" ? sp.sel : null;
  const selGrupoId = sel?.startsWith("grupo:") ? sel.slice(6) : null;
  const selOwnerId = sel?.startsWith("owner:") ? sel.slice(6) : null;

  const orgId = await getOrgId();
  const now = hoyChile();
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
        deudaSaldo: true,
        deudaMoneda: true,
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
  let deudaCLP = 0; // deuda hipotecaria, ponderada por participación
  let deudasSinConvertir = 0; // deudas con saldo en UF que no se pudieron pasar a CLP
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

    // Deuda hipotecaria: cuenta aunque la propiedad no tenga valor comercial.
    // Si es en UF y falta el valor UF, no se suma (igual que el valor comercial),
    // pero se cuenta aparte para avisarlo en el subtítulo del patrimonio neto.
    const deuda = toCLP(p.deudaSaldo, p.deudaMoneda, uf);
    if (deuda !== null && deuda > 0) deudaCLP += deuda * frac;
    else if (deuda === null && Number(p.deudaSaldo ?? 0) > 0) deudasSinConvertir++;

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
      const saldo = Number(ch.montoEsperado) - Number(ch.montoPagado ?? 0);
      const clp = toCLP(Math.max(saldo, 0), ch.moneda, uf);
      if (clp !== null) atrasadoMonto += clp * frac;
    }
    if (
      (ch.montoPagado !== null || ch.estado === "PAGADO") &&
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

  // Subtítulo del patrimonio neto: la deuda sumada y, aparte, las deudas en UF que
  // no se pudieron convertir (sin ellas el neto queda más alto de lo real).
  const deudaNota = [
    deudaCLP > 0 ? `deuda ${formatMoney(deudaCLP, "CLP")}` : null,
    deudasSinConvertir > 0
      ? deudaCLP > 0
        ? `${deudasSinConvertir} en UF sin convertir`
        : `${deudasSinConvertir} ${deudasSinConvertir === 1 ? "deuda" : "deudas"} en UF sin convertir`
      : null,
  ]
    .filter((parte) => parte !== null)
    .join(" · ");

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
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
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
                label="Patrimonio neto"
                value={formatMoney(patrimonioCLP - deudaCLP, "CLP")}
                sub={deudaNota || "sin deuda registrada"}
                icon={PiggyBank}
                emphasis={patrimonioCLP - deudaCLP < 0 ? "negative" : undefined}
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
