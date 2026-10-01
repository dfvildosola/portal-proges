import { X } from "lucide-react";
import type { PropertyTax } from "@/generated/prisma/client";
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
import { taxStatusLabels, taxStatusVariant } from "@/lib/domain";
import { formatMoney, formatDate } from "@/lib/format";
import { AddTaxForm, GenerateYearTaxesForm, UpdateTaxMontoForm } from "./economic-forms";
import { markTaxPaid, removeTax } from "../actions";

// Contenido de la pestaña «Contribuciones» de la ficha de propiedad.
export function TaxesTab({
  propertyId,
  taxes,
}: {
  propertyId: string;
  taxes: PropertyTax[];
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Contribuciones</CardTitle>
        <GenerateYearTaxesForm propertyId={propertyId} />
      </CardHeader>
      <CardContent className="space-y-3">
        {taxes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Sin contribuciones registradas.
          </p>
        ) : (
          <div className="divide-y rounded-lg border">
            {taxes.map((t) => (
              <div
                key={t.id}
                className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <span className="text-sm font-medium">
                    Cuota {t.cuota} · {t.anio}
                  </span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {t.monto !== null ? `${formatMoney(t.monto)} · ` : ""}vence{" "}
                    {formatDate(t.fechaVencimiento)}
                  </span>
                  {t.estado === "PAGADA" && t.fechaPago && (
                    <span className="block text-xs text-muted-foreground">
                      Pagada el {formatDate(t.fechaPago)}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={taxStatusVariant(t.estado)}>
                    {taxStatusLabels[t.estado]}
                  </Badge>
                  {t.estado === "PENDIENTE" && t.monto === null && (
                    <UpdateTaxMontoForm taxId={t.id} propertyId={propertyId} />
                  )}
                  {t.estado === "PENDIENTE" && t.monto !== null && (
                    <form
                      action={markTaxPaid}
                      className="flex items-center gap-1"
                    >
                      <input type="hidden" name="taxId" value={t.id} />
                      <input
                        type="hidden"
                        name="propertyId"
                        value={propertyId}
                      />
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
                  <form action={removeTax}>
                    <input type="hidden" name="taxId" value={t.id} />
                    <input
                      type="hidden"
                      name="propertyId"
                      value={propertyId}
                    />
                    <button
                      type="submit"
                      aria-label="Quitar contribución"
                      className="text-muted-foreground transition-colors hover:text-destructive"
                    >
                      <X className="size-4" />
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="border-t">
        <AddTaxForm propertyId={propertyId} />
      </CardFooter>
    </Card>
  );
}
