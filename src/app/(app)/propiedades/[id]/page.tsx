import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, X } from "lucide-react";
import { db } from "@/lib/db";
import { getOrgId } from "@/lib/org";
import { BackLink } from "@/components/back-link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  propertyTypeLabels,
  propertyGoalLabels,
  currencyLabels,
  ownerTypeLabels,
  propertyUnitTypeLabels,
  alertTypeLabels,
  alertSeverityLabels,
  alertSeverityVariant,
} from "@/lib/domain";
import { resolveAlert } from "../../pendientes/actions";
import { formatMoney, formatM2 } from "@/lib/format";
import { DeletePropertyButton } from "./delete-button";
import {
  AddOwnerDialog,
  AddTagDialog,
  AddUnitDialog,
  AddAssessmentDialog,
} from "./owners-tags-forms";
import { LeaseTab } from "./lease-tab";
import { FinanceTab } from "./finance-tab";
import { DocumentsTab } from "./documents-tab";
import { StatusQuickEdit } from "./status-quick-edit";
import { removeOwner, removeTag, removeUnit, removeAssessment } from "../actions";

// Par etiqueta/valor dentro de una grilla de definición.
function DataItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 py-2">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

const TABS = [
  { value: "resumen", label: "Resumen" },
  { value: "arriendo", label: "Arriendo" },
  { value: "finanzas", label: "Finanzas" },
  { value: "documentos", label: "Documentos" },
  { value: "alertas", label: "Alertas" },
];

export default async function PropiedadDetallePage({
  params,
}: PageProps<"/propiedades/[id]">) {
  const { id } = await params;
  const orgId = await getOrgId();
  const p = await db.property.findFirst({
    where: { id, organizationId: orgId },
    include: {
      owners: { include: { owner: true }, orderBy: { porcentaje: "desc" } },
      tags: { orderBy: { nombre: "asc" } },
      units: { orderBy: [{ tipo: "asc" }, { numero: "asc" }] },
      assessments: { orderBy: { anio: "desc" } },
      contracts: {
        include: { tenant: { select: { nombre: true, rut: true } } },
        orderBy: { fechaInicio: "desc" },
      },
      documents: { orderBy: { createdAt: "desc" } },
      movements: { orderBy: { fecha: "desc" } },
      taxes: { orderBy: [{ anio: "desc" }, { cuota: "asc" }] },
      bills: { orderBy: { fechaVencimiento: "asc" } },
      alerts: {
        where: { estado: "ACTIVA" },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!p) notFound();

  // Entidades existentes (para reutilizar en vez de duplicar), excluyendo las
  // que ya figuran como dueñas de esta propiedad.
  const yaDueños = new Set(p.owners.map((po) => po.ownerId));
  const entidadesDisponibles = (
    await db.owner.findMany({
      where: { organizationId: orgId },
      select: { id: true, nombre: true, tipo: true },
      orderBy: { nombre: "asc" },
    })
  ).filter((o) => !yaDueños.has(o.id));

  const totalPorcentaje = p.owners.reduce(
    (sum, po) => sum + Number(po.porcentaje),
    0,
  );

  return (
    <>
      <BackLink href="/propiedades">Propiedades</BackLink>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              {p.rolSII}
            </h1>
            <StatusQuickEdit propertyId={p.id} current={p.estado} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {p.direccion}, {p.comuna}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            nativeButton={false} render={<Link href={`/propiedades/${p.id}/editar`} />}
          >
            <Pencil className="size-4" />
            Editar
          </Button>
          <DeletePropertyButton id={p.id} />
        </div>
      </div>

      <Tabs defaultValue="resumen">
        <TabsList className="flex-wrap">
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="resumen" className="mt-6 max-w-3xl space-y-6">
          {/* Datos de la propiedad */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Datos de la propiedad</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-x-8 sm:grid-cols-2">
                <DataItem label="Tipo" value={propertyTypeLabels[p.tipo]} />
                <DataItem
                  label="Objetivo"
                  value={propertyGoalLabels[p.objetivo]}
                />
                <DataItem label="Dirección" value={p.direccion} />
                <DataItem label="Comuna" value={p.comuna} />
                <DataItem label="Región" value={p.region} />
                <DataItem
                  label="Moneda principal"
                  value={currencyLabels[p.monedaPrincipal]}
                />
                <DataItem
                  label="M² terreno"
                  value={formatM2(p.m2Terreno)}
                />
                <DataItem
                  label="M² construidos"
                  value={formatM2(p.m2Construidos)}
                />
                <DataItem
                  label="Año construcción"
                  value={p.anoConstruccion ? String(p.anoConstruccion) : "—"}
                />
                <DataItem
                  label="Valor comercial"
                  value={formatMoney(p.valorComercial, p.valorComercialMoneda)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Dueños (copropiedad) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dueños</CardTitle>
              {p.owners.length > 0 && (
                <Badge
                  variant={totalPorcentaje === 100 ? "outline" : "secondary"}
                >
                  {totalPorcentaje}% asignado
                </Badge>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {p.owners.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Sin dueños cargados.
                </p>
              ) : (
                <div className="divide-y rounded-lg border">
                  {p.owners.map((po) => (
                    <div
                      key={po.id}
                      className="flex items-center justify-between px-3 py-2.5"
                    >
                      <div>
                        <span className="text-sm font-medium">
                          {po.owner.nombre}
                        </span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {ownerTypeLabels[po.owner.tipo]} · {po.owner.rut}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium tabular-nums">
                          {Number(po.porcentaje)}%
                        </span>
                        <form action={removeOwner}>
                          <input
                            type="hidden"
                            name="propertyOwnerId"
                            value={po.id}
                          />
                          <input
                            type="hidden"
                            name="propertyId"
                            value={p.id}
                          />
                          <button
                            type="submit"
                            aria-label="Quitar dueño"
                            className="text-muted-foreground transition-colors hover:text-destructive"
                          >
                            <X className="size-4" />
                          </button>
                        </form>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            <CardFooter className="border-t">
              <AddOwnerDialog propertyId={p.id} entidades={entidadesDisponibles} />
            </CardFooter>
          </Card>

          {/* Etiquetas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Etiquetas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                {p.tags.length === 0 ? (
                  <span className="text-sm text-muted-foreground">
                    Sin etiquetas.
                  </span>
                ) : (
                  p.tags.map((t) => (
                    <Badge key={t.id} variant="secondary" className="gap-1 pr-1">
                      {t.nombre}
                      <form action={removeTag} className="inline-flex">
                        <input type="hidden" name="propertyId" value={p.id} />
                        <input type="hidden" name="tagId" value={t.id} />
                        <button
                          type="submit"
                          aria-label={`Quitar ${t.nombre}`}
                          className="text-muted-foreground transition-colors hover:text-destructive"
                        >
                          <X className="size-3" />
                        </button>
                      </form>
                    </Badge>
                  ))
                )}
              </div>
              <AddTagDialog propertyId={p.id} />
            </CardContent>
          </Card>

          {/* Avalúo fiscal — historial */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Avalúo fiscal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {p.assessments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Sin avalúos cargados.
                </p>
              ) : (
                <div className="divide-y rounded-lg border">
                  {p.assessments.map((a, i) => {
                    const prev = p.assessments[i + 1];
                    const pct =
                      prev && Number(prev.valor) > 0
                        ? ((Number(a.valor) - Number(prev.valor)) /
                            Number(prev.valor)) *
                          100
                        : null;
                    return (
                      <div
                        key={a.id}
                        className="flex items-center justify-between px-3 py-2.5"
                      >
                        <div>
                          <span className="text-sm font-medium tabular-nums">
                            {formatMoney(a.valor, "CLP")}
                          </span>
                          <span className="ml-2 text-xs font-medium text-muted-foreground">
                            {a.anio}
                          </span>
                          {pct !== null && prev && (
                            <span
                              className={`ml-2 text-xs tabular-nums ${
                                pct >= 0
                                  ? "text-success"
                                  : "text-destructive"
                              }`}
                            >
                              {pct >= 0 ? "+" : ""}
                              {pct.toFixed(1)}% vs {prev.anio}
                            </span>
                          )}
                        </div>
                        <form action={removeAssessment}>
                          <input
                            type="hidden"
                            name="assessmentId"
                            value={a.id}
                          />
                          <input
                            type="hidden"
                            name="propertyId"
                            value={p.id}
                          />
                          <button
                            type="submit"
                            aria-label="Quitar avalúo"
                            className="text-muted-foreground transition-colors hover:text-destructive"
                          >
                            <X className="size-4" />
                          </button>
                        </form>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
            <CardFooter className="border-t">
              <AddAssessmentDialog propertyId={p.id} />
            </CardFooter>
          </Card>

          {/* Anexos (estacionamientos y bodegas) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Anexos (estacionamientos y bodegas)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {p.units.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Sin estacionamientos ni bodegas cargados.
                </p>
              ) : (
                <div className="divide-y rounded-lg border">
                  {p.units.map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center justify-between px-3 py-2.5"
                    >
                      <div>
                        <span className="text-sm font-medium">
                          {propertyUnitTypeLabels[u.tipo]} {u.numero}
                        </span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {u.rolSII ? `ROL ${u.rolSII}` : "Sin ROL"}
                          {u.avaluoFiscal != null &&
                            ` · av. ${formatMoney(u.avaluoFiscal, "CLP")}`}
                        </span>
                      </div>
                      <form action={removeUnit}>
                        <input type="hidden" name="unitId" value={u.id} />
                        <input type="hidden" name="propertyId" value={p.id} />
                        <button
                          type="submit"
                          aria-label="Quitar anexo"
                          className="text-muted-foreground transition-colors hover:text-destructive"
                        >
                          <X className="size-4" />
                        </button>
                      </form>
                    </div>
                  ))}
                </div>
              )}
              <AddUnitDialog propertyId={p.id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="arriendo" className="mt-6 max-w-3xl">
          <LeaseTab propertyId={p.id} contracts={p.contracts} />
        </TabsContent>

        <TabsContent value="finanzas" className="mt-6 max-w-3xl">
          <FinanceTab
            propertyId={p.id}
            movements={p.movements}
            taxes={p.taxes}
            bills={p.bills}
          />
        </TabsContent>

        <TabsContent value="documentos" className="mt-6 max-w-3xl">
          <DocumentsTab propertyId={p.id} documents={p.documents} />
        </TabsContent>

        <TabsContent value="alertas" className="mt-6 max-w-3xl">
          {p.alerts.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-muted/30 p-6">
              <p className="text-sm text-muted-foreground">
                Sin alertas activas para esta propiedad.
              </p>
            </div>
          ) : (
            <div className="divide-y rounded-xl border">
              {p.alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={alertSeverityVariant(alert.severidad)}>
                        {alertSeverityLabels[alert.severidad]}
                      </Badge>
                      <span className="text-sm font-medium">
                        {alertTypeLabels[alert.tipo]}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {alert.mensaje}
                    </p>
                    {alert.contractId && (
                      <Link
                        href={`/contratos/${alert.contractId}`}
                        className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                      >
                        Ver contrato →
                      </Link>
                    )}
                  </div>
                  <form action={resolveAlert}>
                    <input type="hidden" name="alertId" value={alert.id} />
                    <input type="hidden" name="propertyId" value={p.id} />
                    <Button
                      variant="outline"
                      size="sm"
                      type="submit"
                      className="shrink-0"
                    >
                      Resolver
                    </Button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}
