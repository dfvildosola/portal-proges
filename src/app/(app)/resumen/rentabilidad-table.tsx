"use client";

import Link from "next/link";
import type { ColumnDef, HeaderContext } from "@tanstack/react-table";
import { X } from "lucide-react";

import type {
  PropertyGoal,
  PropertyStatus,
  PropertyType,
} from "@/generated/prisma/enums";
import {
  propertyTypeLabels,
  propertyGoalLabels,
  propertyStatusLabels,
  propertyStatusVariant,
  enumOptions,
} from "@/lib/domain";
import { formatMoney } from "@/lib/format";

function formatPct(n: number, digits = 1): string {
  return `${new Intl.NumberFormat("es-CL", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n)}%`;
}
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/ui/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { DataTableFacetedFilter } from "@/components/ui/data-table-faceted-filter";

export type RentabilidadRow = {
  id: string;
  rol: string;
  direccion: string;
  tipo: PropertyType;
  objetivo: PropertyGoal;
  estado: PropertyStatus;
  valorCLP: number;
  annualCLP: number;
  capRate: number | null;
};

function sortHeader(title: string) {
  const Header = ({ column }: HeaderContext<RentabilidadRow, unknown>) => (
    <DataTableColumnHeader column={column} title={title} />
  );
  Header.displayName = `SortHeader(${title})`;
  return Header;
}

const inArray: ColumnDef<RentabilidadRow>["filterFn"] = (row, id, value) =>
  (value as string[]).includes(row.getValue(id));

const columns: ColumnDef<RentabilidadRow>[] = [
  {
    accessorKey: "rol",
    header: sortHeader("Propiedad"),
    size: 220,
    cell: ({ row }) => (
      <div>
        <Link
          href={`/propiedades/${row.original.id}`}
          className="font-medium underline-offset-2 hover:underline"
        >
          {row.original.rol}
        </Link>
        <div className="text-xs text-muted-foreground">{row.original.direccion}</div>
      </div>
    ),
  },
  {
    accessorKey: "tipo",
    header: sortHeader("Tipo"),
    size: 130,
    cell: ({ row }) => propertyTypeLabels[row.original.tipo],
    filterFn: inArray,
  },
  {
    accessorKey: "objetivo",
    header: sortHeader("Objetivo"),
    size: 120,
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {propertyGoalLabels[row.original.objetivo]}
      </span>
    ),
    filterFn: inArray,
  },
  {
    accessorKey: "estado",
    header: sortHeader("Estado"),
    size: 120,
    cell: ({ row }) => (
      <Badge variant={propertyStatusVariant(row.original.estado)}>
        {propertyStatusLabels[row.original.estado]}
      </Badge>
    ),
    filterFn: inArray,
  },
  {
    accessorKey: "valorCLP",
    header: ({ column }) => (
      <div className="text-right">
        <DataTableColumnHeader column={column} title="Valor comercial" />
      </div>
    ),
    size: 160,
    cell: ({ row }) => (
      <div className="text-right tabular-nums">
        {formatMoney(row.original.valorCLP, "CLP")}
      </div>
    ),
  },
  {
    accessorKey: "annualCLP",
    header: ({ column }) => (
      <div className="text-right">
        <DataTableColumnHeader column={column} title="Arriendo anual" />
      </div>
    ),
    size: 150,
    cell: ({ row }) => (
      <div className="text-right tabular-nums">
        {row.original.annualCLP > 0 ? (
          formatMoney(row.original.annualCLP, "CLP")
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </div>
    ),
  },
  {
    accessorKey: "capRate",
    header: ({ column }) => (
      <div className="text-right">
        <DataTableColumnHeader column={column} title="Cap rate" />
      </div>
    ),
    size: 110,
    sortUndefined: "last",
    cell: ({ row }) => (
      <div className="text-right tabular-nums">
        {row.original.capRate !== null ? (
          <span className="font-medium">{formatPct(row.original.capRate)}</span>
        ) : (
          <Badge variant="secondary">Sin contrato</Badge>
        )}
      </div>
    ),
  },
];

export function RentabilidadTable({ data }: { data: RentabilidadRow[] }) {
  return (
    <DataTable
      columns={columns}
      data={data}
      initialSorting={[{ id: "capRate", desc: true }]}
      pageSize={25}
      pageSizeOptions={[25, 50, 100]}
      toolbar={(table) => {
        const filtered =
          table.getState().columnFilters.length > 0 ||
          table.getState().globalFilter;
        return (
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Buscar ROL, dirección…"
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
              column={table.getColumn("objetivo")}
              title="Objetivo"
              options={enumOptions(propertyGoalLabels)}
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
          </div>
        );
      }}
    />
  );
}
