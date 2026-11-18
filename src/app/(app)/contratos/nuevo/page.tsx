import Link from "next/link";
import { FileText } from "lucide-react";
import { db } from "@/lib/db";
import { getOrgId } from "@/lib/org";
import { BackLink } from "@/components/back-link";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { ContractForm } from "../contract-form";
import { createContract } from "../actions";

export default async function NuevoContratoPage({
  searchParams,
}: PageProps<"/contratos/nuevo">) {
  const { propertyId } = await searchParams;
  const orgId = await getOrgId();
  const [properties, tenants] = await Promise.all([
    db.property.findMany({
      where: { organizationId: orgId },
      orderBy: { rolSII: "asc" },
      select: { id: true, rolSII: true, direccion: true },
    }),
    db.tenant.findMany({
      where: { organizationId: orgId },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true, rut: true },
    }),
  ]);

  // Un contrato necesita una propiedad y un arrendatario; si falta alguno, guiamos.
  if (properties.length === 0 || tenants.length === 0) {
    const falta =
      properties.length === 0 && tenants.length === 0
        ? "una propiedad y un arrendatario"
        : properties.length === 0
          ? "una propiedad"
          : "un arrendatario";
    return (
      <>
        <BackLink href="/contratos">Contratos</BackLink>
        <PageHeader title="Nuevo contrato" />
        <EmptyState
          icon={FileText}
          title={`Primero necesitas ${falta}`}
          description="Un contrato vincula una propiedad con un arrendatario. Crea lo que falte y vuelve."
          action={
            <div className="flex gap-2">
              {properties.length === 0 && (
                <Button nativeButton={false} render={<Link href="/propiedades/nueva" />}>
                  Nueva propiedad
                </Button>
              )}
              {tenants.length === 0 && (
                <Button
                  variant={properties.length === 0 ? "outline" : "default"}
                  nativeButton={false} render={<Link href="/contactos/nuevo" />}
                >
                  Nuevo contacto
                </Button>
              )}
            </div>
          }
        />
      </>
    );
  }

  return (
    <>
      <BackLink href="/contratos">Contratos</BackLink>
      <PageHeader
        title="Nuevo contrato"
        description="Vincula una propiedad con un arrendatario y define la renta."
      />
      <ContractForm
        action={createContract}
        submitLabel="Crear contrato"
        initial={typeof propertyId === "string" ? { propertyId } : undefined}
        properties={properties.map((p) => ({
          value: p.id,
          label: `${p.rolSII ?? "Sin ROL"} · ${p.direccion}`,
        }))}
        tenants={tenants.map((t) => ({
          value: t.id,
          label: `${t.nombre} · ${t.rut}`,
        }))}
      />
    </>
  );
}
