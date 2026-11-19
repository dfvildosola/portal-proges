// Tabla simple de servicios abiertos. La usa «Por tipo y etapa», donde cada
// lista es corta. «Por confirmar» usa la tabla con búsqueda y orden.

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { enlaceServicio, type FilaServicio } from "./filas";

export function TablaServicios({ filas }: { filas: FilaServicio[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Propiedad</TableHead>
          <TableHead>Responsable</TableHead>
          <TableHead>En esta etapa desde</TableHead>
          <TableHead className="w-24" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {filas.map((f) => (
          <TableRow key={f.id}>
            <TableCell className="whitespace-normal">
              <span className="font-medium">{f.direccion}</span>
              <span className="block text-xs text-muted-foreground">
                {f.servicio}
              </span>
              <span className="mt-1 flex flex-wrap gap-1">
                <Badge variant="outline">{f.cliente}</Badge>
                {f.porConfirmar && <Badge variant="warning">Por confirmar</Badge>}
              </span>
            </TableCell>
            <TableCell className="text-muted-foreground">
              {f.responsable ?? "Sin responsable"}
            </TableCell>
            <TableCell className="text-muted-foreground">{f.desde}</TableCell>
            <TableCell className="text-right">
              <Button
                size="sm"
                variant="outline"
                nativeButton={false}
                render={<Link href={enlaceServicio(f.propertyId, f.id)} />}
              >
                Abrir
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
