// Bloque «Usuarios» de /equipo: quién entra al portal, con qué rol y, si es de un cliente,
// a qué cliente pertenece. Un usuario nunca se borra: se desactiva.

import Link from "next/link";
import { Users } from "lucide-react";
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
import type { Usuario } from "@/generated/prisma/client";
import { UsuarioDialogo } from "./usuario-dialogo";
import type { UsuarioValores } from "./usuario-form";
import type { ClienteFila } from "./clientes-bloque";

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

export function UsuariosBloque({
  usuarios,
  clientes,
  yoId,
}: {
  usuarios: Usuario[];
  clientes: ClienteFila[];
  yoId: string;
}) {
  const nombreCliente = new Map(clientes.map((c) => [c.id, c.nombre]));

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Usuarios</h2>
          <p className="text-sm text-muted-foreground">Quién entra al portal y con qué rol.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" nativeButton={false} render={<Link href="/equipo/etapas" />}>
            Etapas
          </Button>
          <UsuarioDialogo clientes={clientes} />
        </div>
      </div>

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
                <TableHead>Cliente</TableHead>
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
                  clienteId: u.rol === "CLIENTE" ? u.organizationId : null,
                  admin: u.admin,
                  activo: u.activo,
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
                    <TableCell className="text-muted-foreground">
                      {u.rol === "CLIENTE" ? (nombreCliente.get(u.organizationId) ?? "—") : "—"}
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
                      <UsuarioDialogo usuario={valores} esYo={u.id === yoId} clientes={clientes} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </section>
  );
}
