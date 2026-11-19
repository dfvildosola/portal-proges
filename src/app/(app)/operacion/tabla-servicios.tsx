// Tabla simple de servicios abiertos. La usa «Por tipo y etapa», donde cada
// lista es corta. «Por confirmar» usa la tabla con búsqueda y orden.

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { enlaceServicio, type FilaServicio } from "./filas";

export function TablaServicios({ filas }: { filas: FilaServicio[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Propiedad</TableHead>
          <TableHead>Responsable</TableHead>
          <TableHead>En esta etapa desde</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filas.map((f) => (
          <TableRow key={f.id}>
            <TableCell className="whitespace-normal">
              <Link
                href={enlaceServicio(f.propertyId, f.id)}
                className="font-medium hover:underline"
              >
                {f.direccion}
              </Link>
              <span className="block text-xs text-muted-foreground">
                {f.servicio}
              </span>
              {f.porConfirmar && (
                <Badge variant="warning" className="mt-1">
                  Por confirmar
                </Badge>
              )}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {f.responsable ?? "Sin responsable"}
            </TableCell>
            <TableCell className="text-muted-foreground">{f.desde}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
