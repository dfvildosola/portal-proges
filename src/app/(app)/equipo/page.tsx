import Link from "next/link";
import { Users } from "lucide-react";
import { db } from "@/lib/db";
import { getOrgId } from "@/lib/org";
import { exigirAdmin } from "@/lib/sesion";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UsuarioDialogo } from "./usuario-dialogo";
import type { GrupoOpcion, UsuarioValores } from "./usuario-form";

// El último ingreso es un instante (con hora), no una fecha «solo fecha»: se muestra
// en hora de Chile sin importar dónde corra el servidor.
function fechaHoraChile(instante: Date | null): string {
  if (!instante) return "Nunca";
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    dateStyle: "short",
    timeStyle: "short",
  }).format(instante);
}

export default async function EquipoPage() {
  const yo = await exigirAdmin();
  const orgId = await getOrgId();

  const [usuarios, grupos] = await Promise.all([
    db.usuario.findMany({
      where: { organizationId: orgId },
      orderBy: [{ activo: "desc" }, { nombre: "asc" }],
      include: {
        grupo: { select: { nombre: true } },
        sociedades: { select: { ownerId: true, owner: { select: { nombre: true } } } },
      },
    }),
    db.grupo.findMany({
      where: { organizationId: orgId },
      orderBy: { nombre: "asc" },
      select: {
        id: true,
        nombre: true,
        owners: { orderBy: { nombre: "asc" }, select: { id: true, nombre: true } },
      },
    }),
  ]);

  const opcionesGrupo: GrupoOpcion[] = grupos.map((g) => ({
    id: g.id,
    nombre: g.nombre,
    sociedades: g.owners,
  }));

  return (
    <>
      <PageHeader
        title="Equipo"
        description="Quién entra al portal, con qué rol y qué ve cada cliente."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" nativeButton={false} render={<Link href="/equipo/etapas" />}>
              Etapas
            </Button>
            <UsuarioDialogo grupos={opcionesGrupo} />
          </div>
        }
      />

      {usuarios.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Todavía no hay usuarios"
          description="Crea el primero con «Nuevo usuario»."
        />
      ) : (
        <Card className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Correo</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Grupo y alcance</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Último ingreso</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {usuarios.map((u) => {
                const valores: UsuarioValores = {
                  id: u.id,
                  nombre: u.nombre,
                  email: u.email,
                  rol: u.rol,
                  admin: u.admin,
                  activo: u.activo,
                  grupoId: u.grupoId,
                  alcance: u.alcance,
                  sociedadIds: u.sociedades.map((s) => s.ownerId),
                };
                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.nombre}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant={u.rol === "EQUIPO" ? "info" : "arena"}>
                          {u.rol === "EQUIPO" ? "Equipo" : "Cliente"}
                        </Badge>
                        {u.admin && <Badge variant="secondary">Admin</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-normal text-muted-foreground">
                      {u.rol === "CLIENTE"
                        ? `${u.grupo?.nombre ?? "—"} · ${
                            u.alcance === "GRUPO"
                              ? "todo el grupo"
                              : u.sociedades.map((s) => s.owner.nombre).join(", ")
                          }`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.activo ? "success" : "outline"}>
                        {u.activo ? "Activo" : "Desactivado"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {fechaHoraChile(u.ultimoIngreso)}
                    </TableCell>
                    <TableCell>
                      <UsuarioDialogo usuario={valores} grupos={opcionesGrupo} esYo={u.id === yo.id} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </>
  );
}
