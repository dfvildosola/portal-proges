"use client";

import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { X } from "lucide-react";

import type { BillType, Currency } from "@/generated/prisma/enums";
import {
  billStatusLabels,
  billStatusVariant,
  billTypeLabels,
  enumOptions,
} from "@/lib/domain";
import { formatMoney, formatDate, formatPeriodo } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/ui/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { DataTableFacetedFilter } from "@/components/ui/data-table-faceted-filter";
import { DataTableViewOptions } from "@/components/ui/data-table-view-options";
import { inArray, sortHeader } from "@/components/ui/data-table-helpers";

// Estado a la vista: «Vencida» es una pendiente cuyo vencimiento ya pasó
// (se calcula en la página con la fecha de hoy en Chile).
export type EstadoCuenta = "PENDIENTE" | "VENCIDA" | "PAGADA";

const estadoLabels: Record<EstadoCuenta, string> = {
  PENDIENTE: billStatusLabels.PENDIENTE,
  VENCIDA: "Vencida",
  PAGADA: billStatusLabels.PAGADA,
};

const estadoVariant = (e: EstadoCuenta) =>
  e === "VENCIDA" ? "destructive" : billStatusVariant(e);

export type BillRow = {
  id: string;
  tipo: BillType;
  periodo: string;
  monto: number | null;
  moneda: Currency;
  fechaVencimiento: string;
  fechaPago: string | null;
  estado: EstadoCuenta;
  propertyId: string;
  propertyRol: string;
  propertyDireccion: string;
};

const columnLabels: Record<string, string> = {
  propiedad: "Propiedad",
  tipo: "Tipo",
  periodo: "Período",
  monto: "Monto",
  fechaVencimiento: "Vence",
  estado: "Estado",
  fechaPago: "Pagada el",
};

const columns: ColumnDef<BillRow>[] = [
  {
    // ROL y dirección juntos, para que el buscador encuentre por cualquiera.
    id: "propiedad",
    accessorFn: (b) => `${b.propertyRol} ${b.propertyDireccion}`,
    header: sortHeader("Propiedad"),
    size: 220,
    cell: ({ row }) => (
      <div>
        <span className="font-medium">{row.original.propertyRol}</span>
        <span className="block text-xs text-muted-foreground">
          {row.original.propertyDireccion}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "tipo",
    header: sortHeader("Tipo"),
    size: 130,
    cell: ({ row }) => billTypeLabels[row.original.tipo],
    filterFn: inArray,
  },
  {
    accessorKey: "periodo",
    header: sortHeader("Período"),
    size: 140,
    cell: ({ row }) => formatPeriodo(row.original.periodo),
  },
  {
    accessorKey: "monto",
    size: 130,
    header: ({ column }) => (
      <div className="text-right">
        <DataTableColumnHeader column={column} title="Monto" />
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-right tabular-nums">
        {row.original.monto !== null
          ? formatMoney(row.original.monto, row.original.moneda)
          : "—"}
      </div>
    ),
  },
  {
    accessorKey: "fechaVencimiento",
    header: sortHeader("Vence"),
    size: 110,
    cell: ({ row }) => formatDate(new Date(row.original.fechaVencimiento)),
  },
  {
    accessorKey: "estado",
    header: sortHeader("Estado"),
    size: 110,
    cell: ({ row }) => (
      <Badge variant={estadoVariant(row.original.estado)}>
        {estadoLabels[row.original.estado]}
      </Badge>
    ),
    filterFn: inArray,
  },
  {
    accessorKey: "fechaPago",
    header: sortHeader("Pagada el"),
    size: 110,
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.original.fechaPago
          ? formatDate(new Date(row.original.fechaPago))
          : "—"}
      </span>
    ),
  },
];

// Las cuentas se marcan pagadas en la ficha de su propiedad: la fila lleva ahí.
export function BillsTable({ data }: { data: BillRow[] }) {
  const router = useRouter();

  return (
    <DataTable
      columns={columns}
      data={data}
      onRowClick={(b) => router.push(`/propiedades/${b.propertyId}`)}
      toolbar={(table) => {
        const filtered =
          table.getState().columnFilters.length > 0 ||
          table.getState().globalFilter;
        return (
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Buscar propiedad…"
              value={table.getState().globalFilter ?? ""}
              onChange={(e) => table.setGlobalFilter(e.target.value)}
              className="h-8 w-full max-w-xs"
            />
            <DataTableFacetedFilter
              column={table.getColumn("tipo")}
              title="Tipo"
              options={enumOptions(billTypeLabels)}
            />
            <DataTableFacetedFilter
              column={table.getColumn("estado")}
              title="Estado"
              options={enumOptions(estadoLabels)}
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
