"use client";

import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { X } from "lucide-react";

import type {
  Currency,
  PropertyGoal,
  PropertyStatus,
  PropertyType,
} from "@/generated/prisma/enums";
import {
  propertyTypeLabels,
  propertyStatusLabels,
  propertyGoalLabels,
  currencyLabels,
  propertyStatusVariant,
  enumOptions,
} from "@/lib/domain";
import { formatMoney, formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/ui/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { inArray, sortHeader } from "@/components/ui/data-table-helpers";
import { DataTableFacetedFilter } from "@/components/ui/data-table-faceted-filter";
import { DataTableViewOptions } from "@/components/ui/data-table-view-options";

// Forma serializable que llega del server (sin Decimal ni Date).
export type PropertyRow = {
  id: string;
  rolSII: string;
  tipo: PropertyType;
  direccion: string;
  comuna: string;
  region: string;
  objetivo: PropertyGoal;
  estado: PropertyStatus;
  monedaPrincipal: Currency;
  valorComercial: number | null;
  valorComercialMoneda: Currency;
  createdAt: string;
};

// Coincidencia para filtros multi-selección (la columna guarda un arreglo de valores).
const columnLabels: Record<string, string> = {
  rolSII: "ROL",
  tipo: "Tipo",
  direccion: "Dirección",
  comuna: "Comuna",
  region: "Región",
  objetivo: "Objetivo",
  estado: "Estado",
  monedaPrincipal: "Moneda",
  valorComercial: "Valor comercial",
  createdAt: "Creada",
};

// Fábrica de cabecera ordenable. Se invoca al construir `columns` (una vez),
// así que cada componente resultante es estable.
const columns: ColumnDef<PropertyRow>[] = [
  {
    accessorKey: "rolSII",
    header: sortHeader("ROL"),
    size: 120,
    cell: ({ row }) => (
      <span className="font-medium">{row.original.rolSII}</span>
    ),
  },
  {
    accessorKey: "tipo",
    header: sortHeader("Tipo"),
    size: 140,
    cell: ({ row }) => propertyTypeLabels[row.original.tipo],
    filterFn: inArray,
  },
  {
    accessorKey: "direccion",
    header: sortHeader("Dirección"),
    size: 240,
  },
  {
    accessorKey: "comuna",
    header: sortHeader("Comuna"),
    size: 140,
  },
  {
    accessorKey: "region",
    header: sortHeader("Región"),
    size: 130,
  },
  {
    accessorKey: "objetivo",
    header: sortHeader("Objetivo"),
    cell: ({ row }) => propertyGoalLabels[row.original.objetivo],
    filterFn: inArray,
  },
  {
    accessorKey: "estado",
    header: sortHeader("Estado"),
    size: 130,
    cell: ({ row }) => (
      <Badge variant={propertyStatusVariant(row.original.estado)}>
        {propertyStatusLabels[row.original.estado]}
      </Badge>
    ),
    filterFn: inArray,
  },
  {
    accessorKey: "monedaPrincipal",
    header: sortHeader("Moneda"),
    size: 110,
    cell: ({ row }) => currencyLabels[row.original.monedaPrincipal],
  },
  {
    accessorKey: "valorComercial",
    header: ({ column }) => (
      <div className="text-right">
        <DataTableColumnHeader column={column} title="Valor comercial" />
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-right tabular-nums">
        {formatMoney(row.original.valorComercial, row.original.valorComercialMoneda)}
      </div>
    ),
  },
  {
    accessorKey: "createdAt",
    header: sortHeader("Creada"),
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {formatDate(new Date(row.original.createdAt))}
      </span>
    ),
  },
];

export function PropertiesTable({ data }: { data: PropertyRow[] }) {
  const router = useRouter();

  return (
    <DataTable
      columns={columns}
      data={data}
      onRowClick={(p) => router.push(`/propiedades/${p.id}`)}
      initialSorting={[{ id: "createdAt", desc: true }]}
      initialVisibility={{
        region: false,
        objetivo: false,
        monedaPrincipal: false,
        valorComercial: false,
        createdAt: false,
      }}
      toolbar={(table) => {
        const filtered =
          table.getState().columnFilters.length > 0 ||
          table.getState().globalFilter;
        return (
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Buscar ROL, dirección, comuna…"
              value={table.getState().globalFilter ?? ""}
              onChange={(e) => table.setGlobalFilter(e.target.value)}
              className="h-8 w-full max-w-xs"
            />
            <DataTableFacetedFilter
              column={table.getColumn("tipo")}
              title="Tipo"
              options={enumOptions(propertyTypeLabels)}
            />
            <DataTableFacetedFilter
              column={table.getColumn("estado")}
              title="Estado"
              options={enumOptions(propertyStatusLabels)}
            />
            {filtered && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8"
                onClick={() => {
                  table.resetColumnFilters();
                  table.setGlobalFilter("");
                }}
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
