import Link from "next/link";
import { Users, Plus } from "lucide-react";
import { db } from "@/lib/db";
import { clientesParaElegir, espaciosQueLee, nombresPorId } from "@/lib/org";
import { FiltroCliente } from "@/components/filtro-cliente";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { ContactsTable, type TenantRow } from "./contacts-table";

export default async function ContactosPage({
  searchParams,
}: PageProps<"/contactos">) {
  const sp = await searchParams;
  const { error } = sp;
  // El equipo ve todos los clientes juntos y puede filtrar por uno (?cliente=).
  const filtro = typeof sp.cliente === "string" ? sp.cliente : null;
  const clientes = await clientesParaElegir();
  const nombreDe = nombresPorId(clientes);
  const tenants = await db.tenant.findMany({
    where: { organizationId: { in: await espaciosQueLee(filtro) } },
    orderBy: { nombre: "asc" },
    include: { _count: { select: { contracts: true } } },
  });

  const rows: TenantRow[] = tenants.map((t) => ({
    id: t.id,
    nombre: t.nombre,
    rut: t.rut,
    email: t.email,
    telefono: t.telefono,
    contratos: t._count.contracts,
    clienteNombre: nombreDe.get(t.organizationId) ?? "",
  }));

  return (
    <>
      <PageHeader
        title="Contactos"
        description="Arrendatarios de la cartera, vinculados a sus contratos."
        action={
          <div className="flex flex-wrap items-center justify-end gap-2">
            {clientes && <FiltroCliente clientes={clientes} actual={filtro} />}
            <Button nativeButton={false} render={<Link href="/contactos/nuevo" />}>
              <Plus className="size-4" />
              Nuevo contacto
            </Button>
          </div>
        }
      />

      {error === "con-contratos" && (
        <p className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
          No se puede eliminar un contacto con contratos vinculados. Termina o
          reasigna sus contratos primero.
        </p>
      )}

      {rows.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Todavía no hay contactos"
          description="Crea un arrendatario para poder asociarlo a un contrato de arriendo."
          action={
            <Button nativeButton={false} render={<Link href="/contactos/nuevo" />}>
              <Plus className="size-4" />
              Nuevo contacto
            </Button>
          }
        />
      ) : (
        <ContactsTable data={rows} mostrarCliente={clientes !== null} />
      )}
    </>
  );
}
