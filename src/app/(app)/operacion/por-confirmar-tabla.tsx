"use client";

// «Por confirmar»: los servicios que la carga inicial dedujo del Drive y que el
// equipo tiene que revisar. Puede haber decenas, por eso lleva búsqueda y orden.

import type { ColumnDef } from "@tanstack/react-table";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/ui/data-table";
import { sortHeader } from "@/components/ui/data-table-helpers";
import { TIPOS_SERVICIO } from "@/lib/servicios";
import { AbrirEnCliente, useAbrirEnCliente } from "./abrir-en-cliente";
import { enlaceServicio, type FilaServicio } from "./filas";

const columnas: ColumnDef<FilaServicio>[] = [
  {
    accessorKey: "direccion",
    header: sortHeader("Propiedad"),
    size: 260,
    cell: ({ row }) => (
      <div>
        <span className="font-medium">{row.original.direccion}</span>
        <span className="block text-xs text-muted-foreground">
          {row.original.rol ?? "Sin ROL"}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "cliente",
    header: sortHeader("Cliente"),
    size: 150,
  },
  {
    id: "servicio",
    accessorFn: (f) => `${TIPOS_SERVICIO[f.tipo].nombre} · ${f.servicio}`,
    header: sortHeader("Servicio"),
    size: 260,
  },
  {
    accessorKey: "etapa",
    header: sortHeader("Etapa"),
    size: 160,
  },
  {
    id: "responsable",
    accessorFn: (f) => f.responsable ?? "Sin responsable",
    header: sortHeader("Responsable"),
    size: 150,
  },
  {
    accessorKey: "desdeDias",
    header: sortHeader("Desde"),
    size: 170,
    // Se ordena por los días (número) y se muestra el texto ya armado.
    cell: ({ row }) => row.original.desde,
  },
  {
    id: "abrir",
    header: "",
    size: 100,
    enableSorting: false,
    cell: ({ row }) => (
      <AbrirEnCliente
        clienteId={row.original.clienteId}
        href={enlaceServicio(row.original.propertyId, row.original.id)}
      />
    ),
  },
];

export function PorConfirmarTabla({ data }: { data: FilaServicio[] }) {
  // La fila entera también abre el servicio, pero antes cambia al cliente dueño.
  const { abrir } = useAbrirEnCliente();
  return (
    <DataTable
      columns={columnas}
      data={data}
      onRowClick={(f) => abrir(f.clienteId, enlaceServicio(f.propertyId, f.id))}
      initialSorting={[{ id: "direccion", desc: false }]}
      toolbar={(table) => (
        <Input
          placeholder="Buscar propiedad, cliente o servicio…"
          value={table.getState().globalFilter ?? ""}
          onChange={(e) => table.setGlobalFilter(e.target.value)}
          className="h-8 w-full max-w-xs"
        />
      )}
    />
  );
}
