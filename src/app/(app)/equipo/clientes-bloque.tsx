// Bloque «Clientes» de /equipo: la lista de espacios de clientes, con cuántas propiedades
// y usuarios tiene cada uno. Se crean, se renombran y se desactivan (no se borran).

import { Building2 } from "lucide-react";
import { db } from "@/lib/db";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClienteDialogo } from "./cliente-dialogo";
import { ClienteEstadoBoton } from "./cliente-estado-boton";

export type ClienteFila = { id: string; nombre: string; activa: boolean };

// Lee los clientes (activos primero, por nombre). La página los comparte con el bloque de usuarios.
export async function leerClientes(): Promise<ClienteFila[]> {
  return db.organizacion.findMany({
    where: { tipo: "CLIENTE" },
    orderBy: [{ activa: "desc" }, { nombre: "asc" }],
    select: { id: true, nombre: true, activa: true },
  });
}

export async function ClientesBloque({
  clientes,
  usuariosPorCliente,
}: {
  clientes: ClienteFila[];
  usuariosPorCliente: Map<string, number>;
}) {
  // Cuántas propiedades tiene cada cliente: una sola consulta agrupada.
  const propiedades = await db.property.groupBy({
    by: ["organizationId"],
    _count: { _all: true },
  });
  const propiedadesPorCliente = new Map(propiedades.map((p) => [p.organizationId, p._count._all]));

  return (
    <section className="mb-10">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Clientes</h2>
          <p className="text-sm text-muted-foreground">
            Cada cliente tiene su espacio con su propia cartera.
          </p>
        </div>
        <ClienteDialogo />
      </div>

      {clientes.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Todavía no hay clientes"
          description="Crea el primero con «Nuevo cliente»."
        />
      ) : (
        <Card className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Propiedades</TableHead>
                <TableHead className="text-right">Usuarios</TableHead>
                <TableHead className="w-48" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientes.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.nombre}</TableCell>
                  <TableCell>
                    <Badge variant={c.activa ? "success" : "outline"}>
                      {c.activa ? "Activo" : "Desactivado"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {propiedadesPorCliente.get(c.id) ?? 0}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {usuariosPorCliente.get(c.id) ?? 0}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-start justify-end gap-1">
                      <ClienteDialogo cliente={{ id: c.id, nombre: c.nombre }} />
                      <ClienteEstadoBoton id={c.id} activa={c.activa} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </section>
  );
}
