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
import { diaChile } from "@/lib/servicios";
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
  edificio: string; // vacío si no tiene
  comuna: string;
  region: string;
  objetivo: PropertyGoal;
  estado: PropertyStatus;
  monedaPrincipal: Currency;
  valorComercial: number | null;
  valorComercialMoneda: Currency;
  createdAt: string;
  clienteNombre: string; // vacío si quien mira es un cliente
  // Solo los llena el equipo (para el cliente van en cero o vacíos y las columnas no se muestran).
  proyectosAbiertos: number;
  tareasAbiertas: number;
  tareasAtrasadas: number; // de las abiertas, las que ya vencieron
  ultimaNovedad: string; // fecha ISO de la última nota o cambio de un proyecto; vacío si no hay
  enAdministracion: boolean;
};

// Coincidencia para filtros multi-selección (la columna guarda un arreglo de valores).
const columnLabels: Record<string, string> = {
  rolSII: "ROL",
  clienteNombre: "Cliente",
  tipo: "Tipo",
  direccion: "Dirección",
  edificio: "Edificio",
  comuna: "Comuna",
  region: "Región",
  objetivo: "Objetivo",
  estado: "Estado",
  monedaPrincipal: "Moneda",
  valorComercial: "Valor comercial",
  createdAt: "Creada",
  proyectosAbiertos: "Proyectos abiertos",
  tareasAbiertas: "Tareas abiertas",
  ultimaNovedad: "Última novedad",
  enAdministracion: "Administración",
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
    accessorKey: "clienteNombre",
    header: sortHeader("Cliente"),
    size: 140,
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
    // Oculta: existe para que la búsqueda de texto también encuentre por edificio.
    accessorKey: "edificio",
    header: sortHeader("Edificio"),
    size: 140,
  },
  {
    accessorKey: "proyectosAbiertos",
    header: sortHeader("Proyectos"),
    size: 110,
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.proyectosAbiertos}</span>
    ),
  },
  {
    accessorKey: "tareasAbiertas",
    header: sortHeader("Tareas"),
    size: 150,
    cell: ({ row }) => {
      const { tareasAbiertas, tareasAtrasadas } = row.original;
      if (tareasAbiertas === 0) return <span className="text-muted-foreground">—</span>;
      return (
        <span className="tabular-nums">
          {tareasAbiertas}
          {tareasAtrasadas > 0 && (
            <span className="ml-1.5 font-medium text-destructive">
              ({tareasAtrasadas} {tareasAtrasadas === 1 ? "atrasada" : "atrasadas"})
            </span>
          )}
        </span>
      );
    },
  },
  {
    accessorKey: "ultimaNovedad",
    header: sortHeader("Última novedad"),
    size: 140,
    cell: ({ row }) =>
      row.original.ultimaNovedad ? (
        <span className="text-muted-foreground">
          {formatDate(diaChile(new Date(row.original.ultimaNovedad)))}
        </span>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    accessorKey: "enAdministracion",
    header: sortHeader("Administración"),
    size: 150,
    cell: ({ row }) =>
      row.original.enAdministracion ? <Badge variant="info">En administración</Badge> : null,
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

// Columnas que son solo del equipo: el cliente ve su listado como siempre.
const SOLO_EQUIPO = new Set([
  "clienteNombre",
  "edificio",
  "proyectosAbiertos",
  "tareasAbiertas",
  "ultimaNovedad",
  "enAdministracion",
]);
const idDe = (c: ColumnDef<PropertyRow>) => ("accessorKey" in c ? String(c.accessorKey) : "");

// La propiedad del equipo lleva debajo el edificio (si hay) y la comuna, para reconocerla de un vistazo.
const columnasEquipo: ColumnDef<PropertyRow>[] = columns.map((c) =>
  idDe(c) === "direccion"
    ? {
        ...c,
        size: 260,
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate">{row.original.direccion}</p>
            <p className="truncate text-xs text-muted-foreground">
              {[row.original.edificio, row.original.comuna].filter(Boolean).join(" · ")}
            </p>
          </div>
        ),
      }
    : c,
);
const columnasCliente = columns.filter((c) => !SOLO_EQUIPO.has(idDe(c)));

// `mostrarCliente` es lo mismo que «quien mira es del equipo»: solo el equipo ve varios clientes
// juntos y el trabajo en curso de cada propiedad.
export function PropertiesTable({ data, mostrarCliente }: { data: PropertyRow[]; mostrarCliente: boolean }) {
  const router = useRouter();
  const columnas = mostrarCliente ? columnasEquipo : columnasCliente;

  return (
    <DataTable
      columns={columnas}
      data={data}
      onRowClick={(p) => router.push(`/propiedades/${p.id}`)}
      // El equipo ordena por lo más reciente que pasó; el cliente, por las más nuevas.
      initialSorting={[mostrarCliente ? { id: "ultimaNovedad", desc: true } : { id: "createdAt", desc: true }]}
      initialVisibility={{
        region: false,
        objetivo: false,
        monedaPrincipal: false,
        valorComercial: false,
        createdAt: false,
        // Para el equipo la dirección ya trae la comuna y el edificio, y el resto va a la vista de columnas.
        ...(mostrarCliente
          ? { edificio: false, rolSII: false, tipo: false, comuna: false, estado: false }
          : {}),
      }}
      toolbar={(table) => {
        const filtered =
          table.getState().columnFilters.length > 0 ||
          table.getState().globalFilter;
        return (
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Buscar ROL, dirección, edificio, comuna, cliente…"
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
