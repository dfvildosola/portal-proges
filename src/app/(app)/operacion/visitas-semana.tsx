// «Visitas de la semana»: las de los últimos 7 días, con propiedad, quién la
// hizo y su evaluación. No se muestra el contacto del interesado: acá no aporta.

import Link from "next/link";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TIPOS_SERVICIO } from "@/lib/servicios";
import { enlaceServicio, type FilaVisita } from "./filas";

export function VisitasSemana({ visitas }: { visitas: FilaVisita[] }) {
  if (visitas.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No se registraron visitas en los últimos 7 días.
      </p>
    );
  }
  return (
    <Card className="py-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Propiedad</TableHead>
            <TableHead>La hizo</TableHead>
            <TableHead className="text-right">Evaluación</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visitas.map((v) => (
            <TableRow key={v.id}>
              <TableCell className="tabular-nums">{v.fecha}</TableCell>
              <TableCell className="whitespace-normal">
                <Link
                  href={enlaceServicio(v.propertyId, v.servicioId)}
                  className="font-medium hover:underline"
                >
                  {v.direccion}
                </Link>
                <span className="block text-xs text-muted-foreground">
                  {TIPOS_SERVICIO[v.tipo].nombre}
                </span>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {v.hechaPor ?? "—"}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {v.evaluacion !== null ? `${v.evaluacion} de 5` : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
