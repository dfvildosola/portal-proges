import type { HeaderContext, Row } from "@tanstack/react-table";

import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";

// Piezas que repiten las tablas de datos. Las tablas anteriores a este archivo
// todavía tienen su copia; se cambian a estas al tocarlas (PENDIENTES.md).

// Filtro de columna con varios valores marcados (el de `DataTableFacetedFilter`).
export function inArray<T>(row: Row<T>, id: string, value: unknown): boolean {
  return (value as string[]).includes(row.getValue(id));
}

// Encabezado que ordena la columna al hacer clic.
export function sortHeader<T>(title: string) {
  const Header = ({ column }: HeaderContext<T, unknown>) => (
    <DataTableColumnHeader column={column} title={title} />
  );
  Header.displayName = `SortHeader(${title})`;
  return Header;
}
