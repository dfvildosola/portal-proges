import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getOrgId } from "@/lib/org";
import { BackLink } from "@/components/back-link";
import { PageHeader } from "@/components/page-header";
import { PropertyForm } from "../../property-form";
import { updateProperty } from "../../actions";

// Las fechas se guardan a medianoche UTC: se leen en UTC como "AAAA-MM-DD".
const dia = (d: Date | null) => d?.toISOString().slice(0, 10);

export default async function EditarPropiedadPage({
  params,
}: PageProps<"/propiedades/[id]/editar">) {
  const { id } = await params;
  const orgId = await getOrgId();
  const p = await db.property.findFirst({
    where: { id, organizationId: orgId },
  });
  if (!p) notFound();

  return (
    <>
      <BackLink href={`/propiedades/${p.id}`}>Volver a la ficha</BackLink>
      <PageHeader title="Editar propiedad" description={p.rolSII} />
      <PropertyForm
        action={updateProperty}
        submitLabel="Guardar cambios"
        initial={{
          id: p.id,
          rolSII: p.rolSII,
          tipo: p.tipo,
          direccion: p.direccion,
          comuna: p.comuna,
          region: p.region,
          objetivo: p.objetivo,
          estado: p.estado,
          monedaPrincipal: p.monedaPrincipal,
          m2Terreno: p.m2Terreno?.toString(),
          m2Construidos: p.m2Construidos?.toString(),
          anoConstruccion: p.anoConstruccion?.toString(),
          valorComercial: p.valorComercial?.toString(),
          valorComercialMoneda: p.valorComercialMoneda,
          valorComercialFecha: dia(p.valorComercialFecha),
          valorComercialFuente: p.valorComercialFuente ?? undefined,
          compraFecha: dia(p.compraFecha),
          compraPrecio: p.compraPrecio?.toString(),
          compraMoneda: p.compraMoneda,
          deudaSaldo: p.deudaSaldo?.toString(),
          deudaMoneda: p.deudaMoneda,
          deudaFecha: dia(p.deudaFecha),
          deudaBanco: p.deudaBanco ?? undefined,
          deudaDividendo: p.deudaDividendo?.toString(),
          deudaTermino: dia(p.deudaTermino),
          exentaContribuciones: p.exentaContribuciones,
        }}
      />
    </>
  );
}
