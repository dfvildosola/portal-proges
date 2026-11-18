import Link from "next/link";
import { Building2, Plus } from "lucide-react";
import { db } from "@/lib/db";
import { getOrgId } from "@/lib/org";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { PropertiesTable, type PropertyRow } from "./properties-table";

export default async function PropiedadesPage() {
  const orgId = await getOrgId();
  const properties = await db.property.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: "desc" },
  });

  // Aplanamos a una forma serializable (Decimal/Date no cruzan a Client Components).
  const rows: PropertyRow[] = properties.map((p) => ({
    id: p.id,
    rolSII: p.rolSII ?? "Sin ROL",
    tipo: p.tipo,
    direccion: p.direccion,
    comuna: p.comuna,
    region: p.region,
    objetivo: p.objetivo,
    estado: p.estado,
    monedaPrincipal: p.monedaPrincipal,
    valorComercial: p.valorComercial ? Number(p.valorComercial) : null,
    valorComercialMoneda: p.valorComercialMoneda,
    createdAt: p.createdAt.toISOString(),
  }));

  return (
    <>
      <PageHeader
        title="Propiedades"
        description="Tu cartera. Cada propiedad abre su ficha con documentos, contrato, económico y alertas."
        action={
          <Button nativeButton={false} render={<Link href="/propiedades/nueva" />}>
            <Plus className="size-4" />
            Nueva propiedad
          </Button>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Todavía no hay propiedades"
          description="Crea la primera propiedad para empezar a cargar tu cartera."
          action={
            <Button nativeButton={false} render={<Link href="/propiedades/nueva" />}>
              <Plus className="size-4" />
              Nueva propiedad
            </Button>
          }
        />
      ) : (
        <PropertiesTable data={rows} />
      )}
    </>
  );
}
