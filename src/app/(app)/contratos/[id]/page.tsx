import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Building2, User } from "lucide-react";
import { db } from "@/lib/db";
import { hoyChile } from "@/lib/fechas";
import { estadoContrato } from "@/lib/contratos";
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
import {
  estadoContratoLabels,
  estadoContratoVariant,
  adjustmentTypeLabels,
} from "@/lib/domain";
import { formatMoney, formatDate } from "@/lib/format";
import { DeleteContractButton } from "./delete-button";

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

export default async function ContratoDetallePage({
  params,
}: PageProps<"/contratos/[id]">) {
  const { id } = await params;
  const orgId = await getOrgId();
  const hoy = hoyChile();
  const c = await db.leaseContract.findFirst({
    where: { id, organizationId: orgId },
    include: {
      property: { select: { id: true, rolSII: true, direccion: true, comuna: true } },
      tenant: {
        select: { id: true, nombre: true, rut: true, email: true, telefono: true },
      },
    },
  });
  if (!c) notFound();
  const estado = estadoContrato(c, hoy);

  const reajuste = c.aplicaReajuste
    ? `${adjustmentTypeLabels[c.reajusteTipo]}${
        c.reajusteFrecuenciaMeses ? ` · cada ${c.reajusteFrecuenciaMeses} meses` : ""
      }`
    : "Sin reajuste";

  return (
    <>
      <BackLink href="/contratos">Contratos</BackLink>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              {formatMoney(c.monto, c.moneda)}
            </h1>
            <Badge variant={estadoContratoVariant(estado)}>
              {estadoContratoLabels[estado]}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {c.property.rolSII} · {c.tenant.nombre}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            nativeButton={false} render={<Link href={`/contratos/${c.id}/editar`} />}
          >
            <Pencil className="size-4" />
            Editar
          </Button>
          <DeleteContractButton id={c.id} />
        </div>
      </div>

      <div className="grid max-w-3xl gap-6">
        {/* Condiciones */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Condiciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-x-8 sm:grid-cols-2">
              <DataItem label="Arriendo" value={formatMoney(c.monto, c.moneda)} />
              <DataItem label="Reajuste" value={reajuste} />
              <DataItem label="Inicio" value={formatDate(c.fechaInicio)} />
              <DataItem label="Término" value={formatDate(c.fechaTermino)} />
              <DataItem label="Día de pago" value={`Día ${c.diaPago} de cada mes`} />
              <DataItem label="Estado" value={estadoContratoLabels[estado]} />
            </div>
          </CardContent>
        </Card>

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
              <p className="text-sm font-medium">{c.tenant.nombre}</p>
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
