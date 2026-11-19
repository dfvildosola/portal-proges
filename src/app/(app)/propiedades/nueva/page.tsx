import { BackLink } from "@/components/back-link";
import { PageHeader } from "@/components/page-header";
import { clientesParaElegir } from "@/lib/org";
import { PropertyForm } from "../property-form";
import { createProperty } from "../actions";

export default async function NuevaPropiedadPage() {
  // Solo el equipo elige el cliente (null si quien entró es un dueño: crea en lo suyo).
  const clientes = await clientesParaElegir();
  return (
    <>
      <BackLink href="/propiedades">Propiedades</BackLink>
      <PageHeader
        title="Nueva propiedad"
        description={clientes ? "Carga una propiedad a la cartera de un cliente." : "Carga una propiedad a tu cartera."}
      />
      <PropertyForm
        action={createProperty}
        submitLabel="Crear propiedad"
        clientes={clientes ?? undefined}
      />
    </>
  );
}
