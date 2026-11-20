// Los maestros: la libreta de proveedores con los que Proges hace sus obras.
// Cada uno es un proveedor de Odoo al que el portal le suma su especialidad (d23).
// Los ve y los agrega todo el equipo; valen para todos los clientes.

import { HardHat } from "lucide-react";
import { db } from "@/lib/db";
import { espaciosQueLee, ORG_PROGES } from "@/lib/org";
import { exigirEquipo } from "@/lib/sesion";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
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
import { MaestroAcciones } from "./maestro-acciones";
import { MaestroAgregar } from "./maestro-agregar";

// En cuántas obras distintas tiene presupuesto cada maestro. Solo cuenta lo que el equipo
// puede leer (los espacios de los clientes activos).
async function obrasPorMaestro(maestroIds: string[]): Promise<Map<string, number>> {
  const presupuestos = await db.presupuestoMaestro.groupBy({
    by: ["maestroId", "servicioEnCursoId"],
    where: { maestroId: { in: maestroIds }, organizationId: { in: await espaciosQueLee() } },
  });
  const obras = new Map<string, number>();
  for (const p of presupuestos) obras.set(p.maestroId, (obras.get(p.maestroId) ?? 0) + 1);
  return obras;
}

export default async function MaestrosPage() {
  await exigirEquipo();

  const maestros = await db.maestro.findMany({
    where: { organizationId: ORG_PROGES },
    orderBy: [{ activo: "desc" }, { nombre: "asc" }],
  });
  const obras = await obrasPorMaestro(maestros.map((m) => m.id));

  return (
    <>
      <PageHeader
        title="Maestros"
        description="Los proveedores de Odoo con los que Proges hace obras y reparaciones."
        action={<MaestroAgregar />}
      />

      {maestros.length === 0 ? (
        <EmptyState
          icon={HardHat}
          title="Todavía no hay maestros"
          description="Agrega el primero con «Agregar maestro»: lo buscas entre los proveedores de Odoo."
        />
      ) : (
        <Card className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Maestro</TableHead>
                <TableHead>Especialidad</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Obras con presupuesto</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {maestros.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.nombre}</TableCell>
                  <TableCell>{m.especialidad ?? "—"}</TableCell>
                  <TableCell>{m.telefono ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={m.activo ? "success" : "outline"}>
                      {m.activo ? "Activo" : "Desactivado"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{obras.get(m.id) ?? 0}</TableCell>
                  <TableCell>
                    <MaestroAcciones
                      maestro={{
                        id: m.id,
                        nombre: m.nombre,
                        especialidad: m.especialidad,
                        telefono: m.telefono,
                        activo: m.activo,
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </>
  );
}
