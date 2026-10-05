import { Receipt } from "lucide-react";
import { db } from "@/lib/db";
import { getOrgId } from "@/lib/org";
import { hoyChile } from "@/lib/fechas";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { BillsTable, type BillRow } from "./bills-table";

export default async function CuentasPage() {
  const orgId = await getOrgId();
  const bills = await db.propertyBill.findMany({
    where: { organizationId: orgId },
    include: {
      property: { select: { id: true, rolSII: true, direccion: true } },
    },
    // Pendientes primero (las vencidas quedan arriba), y dentro de cada grupo las que vencen antes.
    orderBy: [{ estado: "asc" }, { fechaVencimiento: "asc" }],
  });

  const hoy = hoyChile();
  const rows: BillRow[] = bills.map((b) => ({
    id: b.id,
    tipo: b.tipo,
    periodo: b.periodo,
    monto: b.monto !== null ? Number(b.monto) : null,
    moneda: b.moneda,
    fechaVencimiento: b.fechaVencimiento.toISOString(),
    fechaPago: b.fechaPago?.toISOString() ?? null,
    estado:
      b.estado === "PAGADA"
        ? "PAGADA"
        : b.fechaVencimiento < hoy
          ? "VENCIDA"
          : "PENDIENTE",
    propertyId: b.property.id,
    propertyRol: b.property.rolSII,
    propertyDireccion: b.property.direccion,
  }));

  return (
    <>
      <PageHeader
        title="Cuentas"
        description="Gastos comunes, luz, agua y gas de todas las propiedades."
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Sin cuentas"
          description="Todavía no hay cuentas. Se anotan desde la pestaña «Cuentas» de cada propiedad."
        />
      ) : (
        <BillsTable data={rows} />
      )}
    </>
  );
}
