import { Receipt } from "lucide-react";
import { db } from "@/lib/db";
import { clientesParaElegir, espaciosQueLee, nombresPorId } from "@/lib/org";
import { FiltroCliente } from "@/components/filtro-cliente";
import { hoyChile } from "@/lib/fechas";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { BillsTable, type BillRow } from "./bills-table";

export default async function CuentasPage({
  searchParams,
}: PageProps<"/cuentas">) {
  const sp = await searchParams;
  // El equipo ve todos los clientes juntos y puede filtrar por uno (?cliente=).
  const filtro = typeof sp.cliente === "string" ? sp.cliente : null;
  const clientes = await clientesParaElegir();
  const nombreDe = nombresPorId(clientes);
  const bills = await db.propertyBill.findMany({
    where: { organizationId: { in: await espaciosQueLee(filtro) } },
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
    propertyRol: b.property.rolSII ?? "Sin ROL",
    propertyDireccion: b.property.direccion,
    clienteNombre: nombreDe.get(b.organizationId) ?? "",
  }));

  return (
    <>
      <PageHeader
        title="Cuentas"
        description="Gastos comunes, luz, agua y gas de todas las propiedades."
        action={clientes && <FiltroCliente clientes={clientes} actual={filtro} />}
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
