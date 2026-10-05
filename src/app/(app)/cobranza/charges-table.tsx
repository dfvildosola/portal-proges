"use client";

import { useRouter } from "next/navigation";
import type { ColumnDef, HeaderContext } from "@tanstack/react-table";
import { X } from "lucide-react";

import type { Currency, ChargeStatus } from "@/generated/prisma/enums";
import {
  chargeStatusLabels,
  chargeStatusVariant,
  enumOptions,
} from "@/lib/domain";
import { formatMoney, formatDate } from "@/lib/format";
import { esParcial } from "@/lib/cobros";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/ui/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { DataTableFacetedFilter } from "@/components/ui/data-table-faceted-filter";
import { DataTableViewOptions } from "@/components/ui/data-table-view-options";

export type ChargeRow = {
  id: string;
  contractId: string;
  periodo: string;
  montoEsperado: number;
  moneda: Currency;
  fechaVencimiento: string;
  estado: ChargeStatus;
  fechaPago: string | null;
  montoPagado: number | null;
  interesMora: number | null;
  notas: string | null;
  propertyId: string;
  propertyRol: string;
  propertyDireccion: string;
  tenantNombre: string;
};

const inArray: ColumnDef<ChargeRow>["filterFn"] = (row, id, value) =>
  (value as string[]).includes(row.getValue(id));

const columnLabels: Record<string, string> = {
  propertyRol: "Propiedad",
  tenantNombre: "Arrendatario",
  montoEsperado: "Monto esperado",
  fechaVencimiento: "Vencimiento",
  estado: "Estado",
  montoPagado: "Monto pagado",
};

function sortHeader(title: string) {
  const Header = ({ column }: HeaderContext<ChargeRow, unknown>) => (
    <DataTableColumnHeader column={column} title={title} />
  );
  Header.displayName = `SortHeader(${title})`;
  return Header;
}

const columns: ColumnDef<ChargeRow>[] = [
  {
    accessorKey: "propertyRol",
    header: sortHeader("Propiedad"),
    size: 200,
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
    size: 160,
  },
  {
    accessorKey: "montoEsperado",
    size: 150,
    header: ({ column }) => (
      <div className="text-right">
        <DataTableColumnHeader column={column} title="Monto esperado" />
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-right tabular-nums">
        {formatMoney(row.original.montoEsperado, row.original.moneda)}
      </div>
    ),
  },
  {
    accessorKey: "fechaVencimiento",
    header: sortHeader("Vencimiento"),
    size: 120,
    cell: ({ row }) => formatDate(new Date(row.original.fechaVencimiento)),
  },
  {
    accessorKey: "estado",
    header: sortHeader("Estado"),
    size: 150,
    cell: ({ row }) => (
      <div className="flex flex-wrap items-center gap-1">
        <Badge variant={chargeStatusVariant(row.original.estado)}>
          {chargeStatusLabels[row.original.estado]}
        </Badge>
        {esParcial(row.original) && <Badge variant="warning">Parcial</Badge>}
      </div>
    ),
    filterFn: inArray,
  },
  {
    accessorKey: "montoPagado",
    size: 150,
    header: ({ column }) => (
      <div className="text-right">
        <DataTableColumnHeader column={column} title="Monto pagado" />
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-right tabular-nums text-muted-foreground">
        {row.original.montoPagado !== null
          ? formatMoney(row.original.montoPagado, row.original.moneda)
          : "—"}
      </div>
    ),
  },
];

export function ChargesTable({ data }: { data: ChargeRow[] }) {
  const router = useRouter();

  return (
    <DataTable
      columns={columns}
      data={data}
      onRowClick={(c) => router.push(`/cobranza/${c.id}`)}
      initialSorting={[{ id: "estado", desc: false }]}
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
              options={enumOptions(chargeStatusLabels)}
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
