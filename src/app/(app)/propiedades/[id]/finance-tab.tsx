import { X } from "lucide-react";
import type {
  Movement,
  PropertyBill,
  PropertyTax,
} from "@/generated/prisma/client";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  movementTypeLabels,
  movementCategoryLabels,
  movementTypeVariant,
} from "@/lib/domain";
import { formatMoney, formatDate } from "@/lib/format";
import { AddMovementForm } from "./economic-forms";
import { TaxesTab } from "./taxes-tab";
import { BillsTab } from "./bills-tab";
import { removeMovement } from "../actions";

// Contenido de la pestaña «Finanzas» de la ficha: movimientos, contribuciones
// y cuentas, cada uno en su tarjeta con título.
export function FinanceTab({
  propertyId,
  movements,
  taxes,
  bills,
}: {
  propertyId: string;
  movements: Movement[];
  taxes: PropertyTax[];
  bills: PropertyBill[];
}) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Movimientos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {movements.length === 0 ? (
            <div className="rounded-lg border border-dashed bg-muted/30 p-6 text-center">
              <p className="text-sm font-medium">Sin movimientos registrados</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Registra ingresos y gastos asociados a esta propiedad.
              </p>
            </div>
          ) : (
            <div className="divide-y rounded-lg border">
              {movements.map((m) => (
                <div
                  key={m.id}
                  className="flex items-start justify-between px-3 py-2.5"
                >
                  <div>
                    <span className="text-sm font-medium tabular-nums">
                      {formatMoney(m.monto, m.moneda)}
                    </span>
                    <Badge
                      variant={movementTypeVariant(m.tipo)}
                      className="ml-2 text-xs"
                    >
                      {movementTypeLabels[m.tipo]}
                    </Badge>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {movementCategoryLabels[m.categoria]}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {formatDate(m.fecha)}
                      {m.descripcion && ` · ${m.descripcion}`}
                    </span>
                  </div>
                  <form action={removeMovement}>
                    <input type="hidden" name="movementId" value={m.id} />
                    <input type="hidden" name="propertyId" value={propertyId} />
                    <button
                      type="submit"
                      aria-label="Quitar movimiento"
                      className="text-muted-foreground transition-colors hover:text-destructive"
                    >
                      <X className="size-4" />
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </CardContent>
        <CardFooter className="border-t">
          <AddMovementForm propertyId={propertyId} />
        </CardFooter>
      </Card>

      <TaxesTab propertyId={propertyId} taxes={taxes} />

      <BillsTab propertyId={propertyId} bills={bills} />
    </div>
  );
}
