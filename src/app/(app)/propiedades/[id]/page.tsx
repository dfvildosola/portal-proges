import { notFound } from "next/navigation";
import { hoyChile } from "@/lib/fechas";
import { estaVigente } from "@/lib/contratos";
import { db } from "@/lib/db";
import { getOrgId } from "@/lib/org";
import { syncAlerts } from "@/lib/alerts";
import { getLatestUf, toCLP } from "@/lib/currency";
import {
  costoAnual,
  costoEnPeriodo,
  datosAlDia,
  diasSinContrato,
  rentaAnualCLP,
  rentaMensual,
  rentabilidad,
  tiraDePagos,
} from "@/lib/property-metrics";
import {
  chequeoPapeles,
  estadoPapeles,
  sacarReemplazados,
} from "@/lib/papeles";
import { BackLink } from "@/components/back-link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PropertyHeader } from "./property-header";
import { AttentionStrip } from "./attention-strip";
import { KeyFigures } from "./key-figures";
import { SituationCard } from "./situation-card";
import { DataFreshness } from "./data-freshness";
import { PatrimonioCard } from "./patrimonio-card";
import { PropertyMap } from "./property-map";
import { FactsCard } from "./facts-card";
import { LeaseTab } from "./lease-tab";
import { FinanceTab } from "./finance-tab";
import { DocumentsTab } from "./documents-tab";

const TABS = [
  { value: "resumen", label: "Resumen" },
  { value: "arriendo", label: "Arriendo" },
  { value: "finanzas", label: "Finanzas" },
  { value: "documentos", label: "Documentos" },
];

export default async function PropiedadDetallePage({
  params,
}: PageProps<"/propiedades/[id]">) {
  const { id } = await params;
  const orgId = await getOrgId();

  // Se recalculan las alertas antes de leerlas, igual que /pendientes.
  await syncAlerts(orgId);

  const [p, uf, entidades] = await Promise.all([
    db.property.findFirst({
      where: { id, organizationId: orgId },
      include: {
        owners: { include: { owner: true }, orderBy: { porcentaje: "desc" } },
        tags: { orderBy: { nombre: "asc" } },
        units: { orderBy: [{ tipo: "asc" }, { numero: "asc" }] },
        assessments: { orderBy: { anio: "desc" } },
        contracts: {
          include: {
            tenant: { select: { nombre: true, rut: true } },
            charges: {
              select: { periodo: true, estado: true, fechaVencimiento: true },
            },
          },
          orderBy: { fechaInicio: "desc" },
        },
        documents: { orderBy: { createdAt: "desc" } },
        movements: { orderBy: { fecha: "desc" } },
        taxes: { orderBy: [{ anio: "desc" }, { cuota: "asc" }] },
        bills: { orderBy: { fechaVencimiento: "asc" } },
        alerts: { where: { estado: "ACTIVA" }, orderBy: { createdAt: "desc" } },
      },
    }),
    getLatestUf(),
    db.owner.findMany({
      where: { organizationId: orgId },
      select: { id: true, nombre: true, tipo: true },
      orderBy: { nombre: "asc" },
    }),
  ]);
  if (!p) notFound();

  // Entidades existentes (para reutilizar en vez de duplicar), sin las que ya
  // figuran como dueñas de esta propiedad.
  const yaDueños = new Set(p.owners.map((po) => po.ownerId));
  const entidadesDisponibles = entidades.filter((o) => !yaDueños.has(o.id));

  // Cifras. Los cálculos viven en src/lib/property-metrics.ts.
  const now = hoyChile();
  const valorComercial =
    p.valorComercial === null
      ? null
      : { monto: Number(p.valorComercial), moneda: p.valorComercialMoneda };
  const valorCLP = valorComercial
    ? toCLP(valorComercial.monto, valorComercial.moneda, uf)
    : null;
  const costo = costoAnual({
    taxes: p.taxes,
    movements: p.movements,
    uf,
    now,
  });
  const rentab = rentabilidad({
    rentaAnualCLP: rentaAnualCLP(p.contracts, uf, now),
    costoAnualCLP: costo.total,
    valorCLP,
  });

  // Papeles que pide la propiedad y cuáles están al día (src/lib/papeles.ts).
  const papeles = estadoPapeles({
    tipo: p.tipo,
    estado: p.estado,
    documents: p.documents,
    now,
  });

  // Situación: contrato vigente, tira de pagos y, si está libre, desde cuándo y
  // cuánto costó desde entonces.
  const ultimoTermino =
    p.contracts.length > 0
      ? new Date(Math.max(...p.contracts.map((c) => c.fechaTermino.getTime())))
      : null;
  const diasLibre = diasSinContrato(p.contracts, now);
  const libre =
    diasLibre !== null && ultimoTermino
      ? {
          dias: diasLibre,
          desde: ultimoTermino,
          costo: costoEnPeriodo({
            taxes: p.taxes,
            movements: p.movements,
            uf,
            desde: ultimoTermino,
            hasta: now,
          }),
        }
      : null;

  return (
    <>
      <BackLink href="/propiedades">Propiedades</BackLink>

      <PropertyHeader property={p} />
      <AttentionStrip alerts={p.alerts} />

      <Tabs defaultValue="resumen">
        <TabsList className="flex-wrap">
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="resumen" className="mt-6 space-y-6">
          <KeyFigures
            valorComercial={valorComercial}
            valorFecha={p.valorComercialFecha}
            valorFuente={p.valorComercialFuente}
            renta={rentaMensual(p.contracts, now)}
            rentabilidad={rentab}
            costo={costo}
            now={now}
          />
          <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
            <div className="space-y-6">
              <SituationCard
                estado={p.estado}
                now={now}
                valorComercial={valorComercial}
                contratoVigente={p.contracts.find((c) => estaVigente(c, now))}
                tieneContratos={p.contracts.length > 0}
                tira={tiraDePagos(
                  p.contracts.flatMap((c) => c.charges),
                  now,
                )}
                libre={libre}
                costoAnual={costo}
              />
              <FactsCard
                property={p}
                owners={p.owners}
                tags={p.tags}
                units={p.units}
                assessments={p.assessments}
                entidadesDisponibles={entidadesDisponibles}
              />
            </div>
            <div className="space-y-6">
              <PatrimonioCard
                property={p}
                valorComercial={valorComercial}
                uf={uf}
                now={now}
              />
              <DataFreshness
                chequeos={[
                  ...datosAlDia({
                    assessments: p.assessments,
                    taxes: p.taxes,
                    documents: sacarReemplazados(p.documents, now),
                    hayValorComercial:
                      valorComercial !== null && valorComercial.monto > 0,
                    valorComercialFecha: p.valorComercialFecha,
                    exentaContribuciones: p.exentaContribuciones,
                    now,
                  }),
                  chequeoPapeles(papeles),
                ]}
              />
              <PropertyMap direccion={p.direccion} comuna={p.comuna} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="arriendo" className="mt-6">
          <LeaseTab propertyId={p.id} contracts={p.contracts} hoy={now} />
        </TabsContent>

        <TabsContent value="finanzas" className="mt-6">
          <FinanceTab
            propertyId={p.id}
            movements={p.movements}
            taxes={p.taxes}
            bills={p.bills}
            exentaContribuciones={p.exentaContribuciones}
          />
        </TabsContent>

        <TabsContent value="documentos" className="mt-6">
          <DocumentsTab
            propertyId={p.id}
            documents={p.documents}
            papeles={papeles}
          />
        </TabsContent>
      </Tabs>
    </>
  );
}
