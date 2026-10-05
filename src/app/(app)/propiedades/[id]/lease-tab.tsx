import Link from "next/link";
import { Plus } from "lucide-react";
import type { LeaseContract, Tenant } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { estadoContratoLabels, estadoContratoVariant } from "@/lib/domain";
import { estadoContrato, terminoVigente } from "@/lib/contratos";
import { formatMoney, formatDate } from "@/lib/format";

// Contrato con el arrendatario que lo firmó (lo que carga la ficha).
export type LeaseContractRow = LeaseContract & {
  tenant: Pick<Tenant, "nombre" | "rut">;
};

// Contenido de la pestaña «Arriendo» de la ficha: los contratos de la propiedad.
export function LeaseTab({
  propertyId,
  contracts,
  hoy,
}: {
  propertyId: string;
  contracts: LeaseContractRow[];
  hoy: Date;
}) {
  if (contracts.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-muted/30 p-8 text-center">
        <p className="text-sm font-medium">Sin contratos de arriendo</p>
        <p className="text-sm text-muted-foreground">
          Esta propiedad no tiene contratos cargados.
        </p>
        <Button
          size="sm"
          nativeButton={false}
          render={<Link href={`/contratos/nuevo?propertyId=${propertyId}`} />}
        >
          <Plus className="size-4" />
          Nuevo contrato
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {contracts.length} {contracts.length === 1 ? "contrato" : "contratos"}{" "}
          en esta propiedad.
        </p>
        <Button
          size="sm"
          variant="outline"
          nativeButton={false}
          render={<Link href={`/contratos/nuevo?propertyId=${propertyId}`} />}
        >
          <Plus className="size-4" />
          Nuevo contrato
        </Button>
      </div>
      <div className="divide-y rounded-lg border">
        {contracts.map((c) => {
          const estado = estadoContrato(c, hoy);
          // Fin del período que corresponde: la salida, o el término del período
          // en curso si ya se renovó solo.
          const fin = terminoVigente(c, hoy);
          const renovado =
            !c.fechaSalida && fin.getTime() !== c.fechaTermino.getTime();
          return (
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
                  {formatDate(c.fechaInicio)} → {formatDate(fin)}
                  {renovado && " · se renueva sola"}
                </span>
              </div>
              <Badge variant={estadoContratoVariant(estado)}>
                {estadoContratoLabels[estado]}
              </Badge>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
