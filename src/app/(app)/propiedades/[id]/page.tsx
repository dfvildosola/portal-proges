import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, X, Plus, Download, FileText } from "lucide-react";
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
  contractStatusLabels,
  contractStatusVariant,
  movementTypeLabels,
  movementCategoryLabels,
  movementTypeVariant,
  alertTypeLabels,
  alertSeverityLabels,
  alertSeverityVariant,
  documentTypeLabels,
} from "@/lib/domain";
import { resolveAlert } from "../../pendientes/actions";
import { formatMoney, formatDate, formatM2 } from "@/lib/format";
import { DeletePropertyButton } from "./delete-button";
import { AddOwnerForm, AddTagForm, AddUnitForm, AddAssessmentForm } from "./owners-tags-forms";
import { AddMovementForm } from "./economic-forms";
import { TaxesTab } from "./taxes-tab";
import { BillsTab } from "./bills-tab";
import { UploadDocumentDialog } from "./documents-forms";
import { StatusQuickEdit } from "./status-quick-edit";
import {
  removeOwner,
  removeTag,
  removeUnit,
  removeAssessment,
  removeMovement,
  deleteDocument,
} from "../actions";

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
  { value: "documentos", label: "Documentos" },
  { value: "contrato", label: "Contrato" },
  { value: "economico", label: "Económico" },
  { value: "contribuciones", label: "Contribuciones" },
  { value: "cuentas", label: "Cuentas" },
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

  // Agrupa documentos por categoría (tipo) para mostrarlos en secciones.
  const docsByType = p.documents.reduce<Record<string, typeof p.documents>>(
    (acc, doc) => {
      (acc[doc.tipo] ??= []).push(doc);
      return acc;
    },
    {},
  );

  const today = new Date();
  const in30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  function expiryBadge(fechaVencimiento: Date | null) {
    if (!fechaVencimiento) return null;
    if (fechaVencimiento < today)
      return <Badge variant="destructive">Vencido</Badge>;
    if (fechaVencimiento < in30Days)
      return <Badge variant="secondary">Por vencer</Badge>;
    return null;
  }

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
              <AddOwnerForm propertyId={p.id} entidades={entidadesDisponibles} />
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
              <AddTagForm propertyId={p.id} />
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
              <AddAssessmentForm propertyId={p.id} />
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
              <AddUnitForm propertyId={p.id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documentos" className="mt-6 max-w-3xl space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {p.documents.length === 0
                ? "Sin documentos cargados"
                : `${p.documents.length} ${p.documents.length === 1 ? "documento" : "documentos"}`}
            </p>
            <UploadDocumentDialog propertyId={p.id} />
          </div>

          {p.documents.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-muted/30 p-8 text-center">
              <p className="text-sm font-medium">Sin documentos</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Sube escrituras, contratos, avalúos, seguros y más.
              </p>
            </div>
          ) : (
            Object.entries(docsByType).map(([tipo, docs]) => (
              <div key={tipo}>
                <h3 className="mb-2 text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  {documentTypeLabels[tipo as keyof typeof documentTypeLabels]}
                </h3>
                <div className="divide-y rounded-lg border">
                  {docs.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-start justify-between px-3 py-2.5 gap-3"
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="truncate text-sm font-medium">
                              {doc.nombre}
                            </p>
                            <Badge variant="secondary" className="text-xs font-normal">
                              {documentTypeLabels[doc.tipo]}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {doc.fechaEmision
                              ? `Emisión: ${formatDate(doc.fechaEmision)} · `
                              : ""}
                            Subido: {formatDate(doc.createdAt)}
                            {doc.fechaVencimiento
                              ? ` · Vence: ${formatDate(doc.fechaVencimiento)}`
                              : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {expiryBadge(doc.fechaVencimiento)}
                        <a
                          href={doc.blobKey}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={doc.nombre}
                          className="inline-flex h-7 items-center gap-1 rounded-lg border border-border bg-background px-2 text-xs font-medium transition-colors hover:bg-muted"
                        >
                          <Download className="size-3.5" />
                          Descargar
                        </a>
                        <form action={deleteDocument}>
                          <input type="hidden" name="documentId" value={doc.id} />
                          <input type="hidden" name="propertyId" value={p.id} />
                          <button
                            type="submit"
                            aria-label="Eliminar documento"
                            className="text-muted-foreground transition-colors hover:text-destructive"
                          >
                            <X className="size-4" />
                          </button>
                        </form>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="contrato" className="mt-6 max-w-3xl">
          {p.contracts.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-muted/30 p-8 text-center">
              <p className="text-sm font-medium">Sin contratos de arriendo</p>
              <p className="text-sm text-muted-foreground">
                Esta propiedad no tiene contratos cargados.
              </p>
              <Button
                size="sm"
                render={
                  <Link href={`/contratos/nuevo?propertyId=${p.id}`} />
                }
              >
                <Plus className="size-4" />
                Nuevo contrato
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {p.contracts.length}{" "}
                  {p.contracts.length === 1 ? "contrato" : "contratos"} en esta
                  propiedad.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  nativeButton={false} render={<Link href={`/contratos/nuevo?propertyId=${p.id}`} />}
                >
                  <Plus className="size-4" />
                  Nuevo contrato
                </Button>
              </div>
              <div className="divide-y rounded-lg border">
                {p.contracts.map((c) => (
                  <Link
                    key={c.id}
                    href={`/contratos/${c.id}`}
                    className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-muted/50"
                  >
                    <div>
                      <span className="text-sm font-medium tabular-nums">
                        {formatMoney(c.monto, c.moneda)}
                      </span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {c.tenant.nombre}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {formatDate(c.fechaInicio)} → {formatDate(c.fechaTermino)}
                      </span>
                    </div>
                    <Badge variant={contractStatusVariant(c.estado)}>
                      {contractStatusLabels[c.estado]}
                    </Badge>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="economico" className="mt-6 max-w-3xl">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Movimientos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {p.movements.length === 0 ? (
                <div className="rounded-lg border border-dashed bg-muted/30 p-6 text-center">
                  <p className="text-sm font-medium">Sin movimientos registrados</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Registra ingresos y gastos asociados a esta propiedad.
                  </p>
                </div>
              ) : (
                <div className="divide-y rounded-lg border">
                  {p.movements.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-start justify-between px-3 py-2.5"
                    >
                      <div>
                        <span className="text-sm font-medium tabular-nums">
                          {formatMoney(m.monto, m.moneda)}
                        </span>
                        <Badge
                          variant={movementTypeVariant(m.tipo)}
                          className="ml-2 text-xs"
                        >
                          {movementTypeLabels[m.tipo]}
                        </Badge>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {movementCategoryLabels[m.categoria]}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {formatDate(m.fecha)}
                          {m.descripcion && ` · ${m.descripcion}`}
                        </span>
                      </div>
                      <form action={removeMovement}>
                        <input type="hidden" name="movementId" value={m.id} />
                        <input type="hidden" name="propertyId" value={p.id} />
                        <button
                          type="submit"
                          aria-label="Quitar movimiento"
                          className="text-muted-foreground transition-colors hover:text-destructive"
                        >
                          <X className="size-4" />
                        </button>
                      </form>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            <CardFooter className="border-t">
              <AddMovementForm propertyId={p.id} />
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="contribuciones" className="mt-6 max-w-3xl">
          <TaxesTab propertyId={p.id} taxes={p.taxes} />
        </TabsContent>

        <TabsContent value="cuentas" className="mt-6 max-w-3xl">
          <BillsTab propertyId={p.id} bills={p.bills} />
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
