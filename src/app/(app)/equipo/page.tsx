// Administración del portal (solo admin): los clientes (cada uno es un espacio) y los usuarios.
// Las etapas de los servicios se editan en /equipo/etapas.

import { db } from "@/lib/db";
import { exigirAdmin } from "@/lib/sesion";
import { PageHeader } from "@/components/page-header";
import { ClientesBloque, leerClientes } from "./clientes-bloque";
import { UsuariosBloque } from "./usuarios-bloque";

export default async function EquipoPage() {
  const yo = await exigirAdmin();
  const [clientes, usuarios] = await Promise.all([
    leerClientes(),
    // Todos los usuarios del portal: equipo y clientes.
    db.usuario.findMany({ orderBy: [{ activo: "desc" }, { nombre: "asc" }] }),
  ]);

  // Cuántos usuarios tiene cada cliente (los del equipo viven en org_proges, no cuentan acá).
  const usuariosPorCliente = new Map<string, number>();
  for (const u of usuarios) {
    if (u.rol !== "CLIENTE") continue;
    usuariosPorCliente.set(u.organizationId, (usuariosPorCliente.get(u.organizationId) ?? 0) + 1);
  }

  return (
    <>
      <PageHeader
        title="Equipo"
        description="Los clientes del portal y quién entra a él."
      />
      <ClientesBloque clientes={clientes} usuariosPorCliente={usuariosPorCliente} />
      <UsuariosBloque usuarios={usuarios} clientes={clientes} yoId={yo.id} />
    </>
  );
}
