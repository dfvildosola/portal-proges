"use client";

import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { X } from "lucide-react";

import type { Currency, AdjustmentType } from "@/generated/prisma/enums";
import type { EstadoContrato } from "@/lib/contratos";
import {
  estadoContratoLabels,
  estadoContratoVariant,
  adjustmentTypeLabels,
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
export type ContractRow = {
  id: string;
  propertyRol: string;
  propertyDireccion: string;
  tenantNombre: string;
  monto: number;
  moneda: Currency;
  aplicaReajuste: boolean;
  reajusteTipo: AdjustmentType;
  reajusteFrecuenciaMeses: number | null;
  fechaInicio: string;
  fechaTermino: string;
  estado: EstadoContrato;
};

const columnLabels: Record<string, string> = {
  propertyRol: "Propiedad",
  tenantNombre: "Arrendatario",
  monto: "Arriendo",
  reajusteTipo: "Reajuste",
  fechaInicio: "Vigencia",
  estado: "Estado",
};

const columns: ColumnDef<ContractRow>[] = [
  {
    accessorKey: "propertyRol",
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
    accessorKey: "tenantNombre",
    header: sortHeader("Arrendatario"),
    size: 180,
  },
  {
    accessorKey: "monto",
    size: 140,
    header: ({ column }) => (
      <div className="text-right">
        <DataTableColumnHeader column={column} title="Arriendo" />
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-right tabular-nums">
        {formatMoney(row.original.monto, row.original.moneda)}
      </div>
    ),
  },
  {
    accessorKey: "reajusteTipo",
    header: sortHeader("Reajuste"),
    size: 120,
    cell: ({ row }) =>
      row.original.aplicaReajuste
        ? adjustmentTypeLabels[row.original.reajusteTipo]
        : "—",
    filterFn: inArray,
  },
  {
    accessorKey: "fechaInicio",
    header: sortHeader("Vigencia"),
    size: 190,
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {formatDate(new Date(row.original.fechaInicio))} →{" "}
        {formatDate(new Date(row.original.fechaTermino))}
      </span>
    ),
  },
  {
    accessorKey: "estado",
    header: sortHeader("Estado"),
    size: 120,
    cell: ({ row }) => (
      <Badge variant={estadoContratoVariant(row.original.estado)}>
        {estadoContratoLabels[row.original.estado]}
      </Badge>
    ),
    filterFn: inArray,
  },
];

export function ContractsTable({ data }: { data: ContractRow[] }) {
  const router = useRouter();

  return (
    <DataTable
      columns={columns}
      data={data}
      onRowClick={(c) => router.push(`/contratos/${c.id}`)}
      initialSorting={[{ id: "fechaInicio", desc: true }]}
      initialVisibility={{ reajusteTipo: false }}
      toolbar={(table) => {
        const filtered =
          table.getState().columnFilters.length > 0 ||
          table.getState().globalFilter;
        return (
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Buscar propiedad o arrendatario…"
              value={table.getState().globalFilter ?? ""}
              onChange={(e) => table.setGlobalFilter(e.target.value)}
              className="h-8 w-full max-w-xs"
            />
            <DataTableFacetedFilter
              column={table.getColumn("estado")}
              title="Estado"
              options={enumOptions(estadoContratoLabels)}
            />
            <DataTableFacetedFilter
              column={table.getColumn("reajusteTipo")}
              title="Reajuste"
              options={enumOptions(adjustmentTypeLabels)}
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
