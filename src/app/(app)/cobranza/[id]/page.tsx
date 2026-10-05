import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2, User } from "lucide-react";
import { db } from "@/lib/db";
import { getOrgId } from "@/lib/org";
import { BackLink } from "@/components/back-link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { chargeStatusLabels, chargeStatusVariant } from "@/lib/domain";
import {
  formatMoney,
  formatDate,
  formatPeriodo,
  toDateInputValue,
} from "@/lib/format";
import { hoyChile } from "@/lib/fechas";
import { esParcial, saldoCobro } from "@/lib/cobros";
import { updateChargeStatus } from "../actions";
import { DeleteChargeButton } from "./delete-charge-button";
import { PayForm } from "./pay-form";

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

export default async function CobroDetallePage({
  params,
}: PageProps<"/cobranza/[id]">) {
  const { id } = await params;
  const orgId = await getOrgId();
  const charge = await db.rentCharge.findFirst({
    where: { id, organizationId: orgId },
    include: {
      contract: {
        include: {
          property: {
            select: { id: true, rolSII: true, direccion: true, comuna: true },
          },
          tenant: {
            select: {
              id: true,
              nombre: true,
              rut: true,
              email: true,
              telefono: true,
            },
          },
        },
      },
    },
  });
  if (!charge) notFound();

  const c = charge.contract;
  const isPaid = charge.estado === "PAGADO";
  const isPartial = esParcial(charge);
  const saldo = saldoCobro(charge);

  return (
    <>
      <BackLink href={`/cobranza?mes=${charge.periodo}`}>Cobranza</BackLink>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold capitalize tracking-tight">
              {formatPeriodo(charge.periodo)}
            </h1>
            <Badge variant={chargeStatusVariant(charge.estado)}>
              {chargeStatusLabels[charge.estado]}
            </Badge>
            {isPartial && <Badge variant="warning">Parcial</Badge>}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {c.property.rolSII} · {c.tenant.nombre}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {charge.estado === "PENDIENTE" && (
            <form action={updateChargeStatus}>
              <input type="hidden" name="id" value={charge.id} />
              <input type="hidden" name="estado" value="ATRASADO" />
              <Button type="submit" variant="outline" size="sm">
                Marcar atrasado
              </Button>
            </form>
          )}
          {(charge.estado !== "PENDIENTE" || isPartial) && (
            <form action={updateChargeStatus}>
              <input type="hidden" name="id" value={charge.id} />
              <input type="hidden" name="estado" value="PENDIENTE" />
              <Button type="submit" variant="outline" size="sm">
                Revertir a pendiente
              </Button>
            </form>
          )}
          <DeleteChargeButton id={charge.id} />
        </div>
      </div>

      <div className="grid max-w-3xl gap-6">
        {/* Detalle del cobro */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Detalle del cobro</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-x-8 sm:grid-cols-2">
              <DataItem label="Período" value={formatPeriodo(charge.periodo)} />
              <DataItem
                label="Monto esperado"
                value={formatMoney(charge.montoEsperado, charge.moneda)}
              />
              <DataItem
                label="Vencimiento"
                value={formatDate(charge.fechaVencimiento)}
              />
              <DataItem
                label="Estado"
                value={chargeStatusLabels[charge.estado]}
              />
              {isPartial && (
                <DataItem
                  label="Pagado hasta ahora"
                  value={`Pagado ${formatMoney(charge.montoPagado, charge.moneda)} de ${formatMoney(charge.montoEsperado, charge.moneda)} · falta ${formatMoney(saldo, charge.moneda)}`}
                />
              )}
              {(isPaid || isPartial) && charge.fechaPago && (
                <DataItem
                  label={isPartial ? "Fecha del último pago" : "Fecha de pago"}
                  value={formatDate(charge.fechaPago)}
                />
              )}
              {isPaid && charge.montoPagado !== null && (
                <DataItem
                  label="Monto pagado"
                  value={formatMoney(charge.montoPagado, charge.moneda)}
                />
              )}
              {charge.interesMora !== null && (
                <DataItem
                  label="Interés mora"
                  value={formatMoney(charge.interesMora, charge.moneda)}
                />
              )}
              {charge.notas && (
                <DataItem label="Notas" value={charge.notas} />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Formulario de pago */}
        {!isPaid && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {isPartial ? "Registrar otro pago" : "Registrar pago"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* key: se vuelve a armar cuando cambia el saldo (p. ej. tras «Revertir»), para que proponga el monto nuevo. */}
              <PayForm
                key={saldo}
                chargeId={charge.id}
                defaultAmount={String(saldo)}
                defaultDate={toDateInputValue(hoyChile())}
              />
            </CardContent>
          </Card>
        )}

        {/* Propiedad y arrendatario */}
        <div className="grid gap-6 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="size-4 text-muted-foreground" />
                Propiedad
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <Link
                href={`/propiedades/${c.property.id}`}
                className="text-sm font-medium hover:underline"
              >
                {c.property.rolSII}
              </Link>
              <p className="text-sm text-muted-foreground">
                {c.property.direccion}, {c.property.comuna}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="size-4 text-muted-foreground" />
                Arrendatario
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <Link
                href={`/contactos/${c.tenant.id}/editar`}
                className="text-sm font-medium hover:underline"
              >
                {c.tenant.nombre}
              </Link>
              <p className="text-sm text-muted-foreground">{c.tenant.rut}</p>
              {c.tenant.email && (
                <p className="text-sm text-muted-foreground">{c.tenant.email}</p>
              )}
              {c.tenant.telefono && (
                <p className="text-sm text-muted-foreground">
                  {c.tenant.telefono}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
