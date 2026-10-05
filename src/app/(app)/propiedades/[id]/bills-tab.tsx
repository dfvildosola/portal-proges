import { X } from "lucide-react";
import { hoyChile } from "@/lib/fechas";
import type { PropertyBill } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { billTypeLabels, billStatusLabels, billStatusVariant } from "@/lib/domain";
import { formatMoney, formatDate } from "@/lib/format";
import { AddBillForm } from "./economic-forms";
import { markBillPaid, removeBill } from "../../cuentas/actions";

// Contenido de la pestaña «Cuentas» (gastos comunes, luz, agua, gas...) de la ficha.
export function BillsTab({
  propertyId,
  bills,
}: {
  propertyId: string;
  bills: PropertyBill[];
}) {
  const hoy = hoyChile();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Cuentas por pagar</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {bills.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Sin cuentas registradas.
          </p>
        ) : (
          <div className="divide-y rounded-lg border">
            {bills.map((b) => {
              const vencida = b.estado === "PENDIENTE" && b.fechaVencimiento < hoy;
              return (
                <div
                  key={b.id}
                  className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <span className="text-sm font-medium">
                      {billTypeLabels[b.tipo]} · {b.periodo}
                    </span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {b.monto !== null ? `${formatMoney(b.monto, b.moneda)} · ` : ""}vence{" "}
                      {formatDate(b.fechaVencimiento)}
                    </span>
                    {b.estado === "PAGADA" && b.fechaPago && (
                      <span className="block text-xs text-muted-foreground">
                        Pagada el {formatDate(b.fechaPago)}
                      </span>
                    )}
                    {b.notas && (
                      <span className="block text-xs text-muted-foreground">
                        {b.notas}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {vencida ? (
                      <Badge variant="destructive">Vencida</Badge>
                    ) : (
                      <Badge variant={billStatusVariant(b.estado)}>
                        {billStatusLabels[b.estado]}
                      </Badge>
                    )}
                    {b.estado === "PENDIENTE" && (
                      <form action={markBillPaid} className="flex items-center gap-1">
                        <input type="hidden" name="billId" value={b.id} />
                        <input type="hidden" name="propertyId" value={propertyId} />
                        <Input
                          name="fechaPago"
                          type="date"
                          required
                          className="h-7 w-36 text-xs"
                        />
                        <Button
                          type="submit"
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs"
                        >
                          Marcar pagada
                        </Button>
                      </form>
                    )}
                    <form action={removeBill}>
                      <input type="hidden" name="billId" value={b.id} />
                      <input type="hidden" name="propertyId" value={propertyId} />
                      <button
                        type="submit"
                        aria-label="Quitar cuenta"
                        className="text-muted-foreground transition-colors hover:text-destructive"
                      >
                        <X className="size-4" />
                      </button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
      <CardFooter className="border-t">
        <AddBillForm propertyId={propertyId} />
      </CardFooter>
    </Card>
  );
}
