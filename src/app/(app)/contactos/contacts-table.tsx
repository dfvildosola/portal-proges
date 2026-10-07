"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/ui/data-table";
import { sortHeader } from "@/components/ui/data-table-helpers";
import { DataTableViewOptions } from "@/components/ui/data-table-view-options";
import { DeleteTenantButton } from "./delete-tenant-button";

// Forma serializable que llega del server.
export type TenantRow = {
  id: string;
  nombre: string;
  rut: string;
  email: string | null;
  telefono: string | null;
  contratos: number;
};

const columnLabels: Record<string, string> = {
  nombre: "Nombre",
  rut: "RUT",
  email: "Email",
  telefono: "Teléfono",
  contratos: "Contratos",
};

const columns: ColumnDef<TenantRow>[] = [
  {
    accessorKey: "nombre",
    header: sortHeader("Nombre"),
    size: 200,
    cell: ({ row }) => <span className="font-medium">{row.original.nombre}</span>,
  },
  {
    accessorKey: "rut",
    header: sortHeader("RUT"),
    size: 140,
  },
  {
    accessorKey: "email",
    header: sortHeader("Email"),
    size: 220,
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.email ?? "—"}</span>
    ),
  },
  {
    accessorKey: "telefono",
    header: sortHeader("Teléfono"),
    size: 160,
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.original.telefono ?? "—"}
      </span>
    ),
  },
  {
    accessorKey: "contratos",
    header: sortHeader("Contratos"),
    size: 110,
    cell: ({ row }) =>
      row.original.contratos > 0 ? (
        <Badge variant="secondary">{row.original.contratos}</Badge>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    id: "acciones",
    size: 90,
    enableResizing: false,
    header: () => <span className="sr-only">Acciones</span>,
    cell: ({ row }) => (
      <div className="flex items-center justify-end gap-1">
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Editar ${row.original.nombre}`}
          nativeButton={false} render={<Link href={`/contactos/${row.original.id}/editar`} />}
        >
          <Pencil className="size-4" />
        </Button>
        <DeleteTenantButton id={row.original.id} nombre={row.original.nombre} />
      </div>
    ),
  },
];

export function ContactsTable({ data }: { data: TenantRow[] }) {
  return (
    <DataTable
      columns={columns}
      data={data}
      initialSorting={[{ id: "nombre", desc: false }]}
      toolbar={(table) => {
        const filtered = Boolean(table.getState().globalFilter);
        return (
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Buscar nombre, RUT o email…"
              value={table.getState().globalFilter ?? ""}
              onChange={(e) => table.setGlobalFilter(e.target.value)}
              className="h-8 w-full max-w-xs"
            />
            {filtered && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8"
                onClick={() => table.setGlobalFilter("")}
              >
                Limpiar
                <X className="size-4" />
              </Button>
            )}
            <div className="ml-auto">
              <DataTableViewOptions table={table} labels={columnLabels} />
            </div>
          </div>
        );
      }}
    />
  );
}
