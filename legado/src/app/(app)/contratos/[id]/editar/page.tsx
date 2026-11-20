import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { clientesParaElegir, nombresPorId, puedeLeerEn } from "@/lib/org";
import { BackLink } from "@/components/back-link";
import { PageHeader } from "@/components/page-header";
import { toDateInputValue } from "@/lib/format";
import { ContractForm } from "../../contract-form";
import { updateContract } from "../../actions";

export default async function EditarContratoPage({
  params,
}: PageProps<"/contratos/[id]/editar">) {
  const { id } = await params;
  // Primero el contrato por su id; su espacio decide qué propiedades y contactos se ofrecen
  // (un contrato nunca mezcla clientes).
  const c = await db.leaseContract.findUnique({ where: { id } });
  if (!c || !(await puedeLeerEn(c.organizationId))) notFound();
  const nombreDe = nombresPorId(await clientesParaElegir());
  const cliente = nombreDe.has(c.organizationId) ? `${nombreDe.get(c.organizationId)} · ` : "";
  const [properties, tenants] = await Promise.all([
    db.property.findMany({
      where: { organizationId: c.organizationId },
      orderBy: { rolSII: "asc" },
      select: { id: true, rolSII: true, direccion: true },
    }),
    db.tenant.findMany({
      where: { organizationId: c.organizationId },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true, rut: true },
    }),
  ]);

  return (
    <>
      <BackLink href={`/contratos/${c.id}`}>Volver al contrato</BackLink>
      <PageHeader title="Editar contrato" />
      <ContractForm
        action={updateContract}
        submitLabel="Guardar cambios"
        initial={{
          id: c.id,
          propertyId: c.propertyId,
          tenantId: c.tenantId,
          monto: c.monto.toString(),
          moneda: c.moneda,
          reajusteTipo: c.reajusteTipo,
          reajusteFrecuenciaMeses:
            c.reajusteFrecuenciaMeses?.toString() ?? undefined,
          fechaInicio: toDateInputValue(c.fechaInicio),
          fechaTermino: toDateInputValue(c.fechaTermino),
          diaPago: c.diaPago.toString(),
          renovacionAutomatica: c.renovacionAutomatica,
          diasAviso: c.diasAviso.toString(),
          plazoMeses: c.plazoMeses.toString(),
          garantia: c.garantia?.toString(),
          // Solo si ya tiene salida: el formulario muestra el campo para corregirla.
          fechaSalida: c.fechaSalida ? toDateInputValue(c.fechaSalida) : undefined,
          ultimoReajuste: c.ultimoReajuste
            ? toDateInputValue(c.ultimoReajuste)
            : undefined,
        }}
        properties={properties.map((p) => ({
          value: p.id,
          label: `${cliente}${p.rolSII ?? "Sin ROL"} · ${p.direccion}`,
        }))}
        tenants={tenants.map((t) => ({
          value: t.id,
          label: `${cliente}${t.nombre} · ${t.rut}`,
        }))}
      />
    </>
  );
}
