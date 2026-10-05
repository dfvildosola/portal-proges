import Link from "next/link";
import { FileText, Plus } from "lucide-react";
import { db } from "@/lib/db";
import { hoyChile } from "@/lib/fechas";
import { estadoContrato } from "@/lib/contratos";
import { getOrgId } from "@/lib/org";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { ContractsTable, type ContractRow } from "./contracts-table";

export default async function ContratosPage() {
  const orgId = await getOrgId();
  const hoy = hoyChile();
  const contracts = await db.leaseContract.findMany({
    where: { organizationId: orgId },
    orderBy: { fechaInicio: "desc" },
    include: {
      property: { select: { rolSII: true, direccion: true } },
      tenant: { select: { nombre: true } },
    },
  });

  // Aplanamos a una forma serializable (Decimal/Date no cruzan a Client Components).
  const rows: ContractRow[] = contracts.map((c) => ({
    id: c.id,
    propertyRol: c.property.rolSII,
    propertyDireccion: c.property.direccion,
    tenantNombre: c.tenant.nombre,
    monto: Number(c.monto),
    moneda: c.moneda,
    aplicaReajuste: c.aplicaReajuste,
    reajusteTipo: c.reajusteTipo,
    reajusteFrecuenciaMeses: c.reajusteFrecuenciaMeses,
    fechaInicio: c.fechaInicio.toISOString(),
    fechaTermino: c.fechaTermino.toISOString(),
    estado: estadoContrato(c, hoy),
  }));

  return (
    <>
      <PageHeader
        title="Contratos"
        description="Los arriendos de la cartera: vigentes, por vencer, con sus datos de reajuste."
        action={
          <Button nativeButton={false} render={<Link href="/contratos/nuevo" />}>
            <Plus className="size-4" />
            Nuevo contrato
          </Button>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Todavía no hay contratos"
          description="Crea un contrato de arriendo vinculando una propiedad y un arrendatario."
          action={
            <Button nativeButton={false} render={<Link href="/contratos/nuevo" />}>
              <Plus className="size-4" />
              Nuevo contrato
            </Button>
          }
        />
      ) : (
        <ContractsTable data={rows} />
      )}
    </>
  );
}
