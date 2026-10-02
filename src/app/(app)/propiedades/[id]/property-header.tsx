import Link from "next/link";
import { Pencil } from "lucide-react";
import type { Property } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { propertyTypeLabels, propertyGoalLabels } from "@/lib/domain";
import { formatM2 } from "@/lib/format";
import { DeletePropertyButton } from "./delete-button";
import { StatusQuickEdit } from "./status-quick-edit";

// Encabezado de la ficha: la dirección es el título; debajo, tipo · comuna · m² ·
// ROL; a la derecha, el estado (editable), el objetivo y las acciones.
export function PropertyHeader({
  property,
}: {
  property: Pick<
    Property,
    | "id"
    | "direccion"
    | "comuna"
    | "tipo"
    | "rolSII"
    | "estado"
    | "objetivo"
    | "m2Construidos"
    | "m2Terreno"
  >;
}) {
  // Se muestra la superficie que mejor describe la propiedad: lo construido si
  // existe y, si no, el terreno.
  const superficie =
    property.m2Construidos !== null
      ? `${formatM2(property.m2Construidos)} construidos`
      : property.m2Terreno !== null
        ? `${formatM2(property.m2Terreno)} de terreno`
        : null;
  const subtitulo = [
    propertyTypeLabels[property.tipo],
    property.comuna,
    superficie,
    `ROL ${property.rolSII}`,
  ].filter(Boolean);

  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight">
          {property.direccion}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {subtitulo.join(" · ")}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <StatusQuickEdit propertyId={property.id} current={property.estado} />
        <Badge variant="outline">
          Objetivo: {propertyGoalLabels[property.objetivo]}
        </Badge>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href={`/propiedades/${property.id}/editar`} />}
        >
          <Pencil className="size-4" />
          Editar
        </Button>
        <DeletePropertyButton id={property.id} />
      </div>
    </div>
  );
}
