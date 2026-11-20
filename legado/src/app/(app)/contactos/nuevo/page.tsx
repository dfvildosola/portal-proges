import { BackLink } from "@/components/back-link";
import { PageHeader } from "@/components/page-header";
import { clientesParaElegir } from "@/lib/org";
import { TenantForm } from "../tenant-form";
import { createTenant } from "../actions";

export default async function NuevoContactoPage() {
  // Solo el equipo elige el cliente (null si quien entró es un dueño: crea en lo suyo).
  const clientes = await clientesParaElegir();
  return (
    <>
      <BackLink href="/contactos">Contactos</BackLink>
      <PageHeader
        title="Nuevo contacto"
        description="Registra un arrendatario para asociarlo a un contrato."
      />
      <TenantForm action={createTenant} submitLabel="Crear contacto" clientes={clientes ?? undefined} />
    </>
  );
}
