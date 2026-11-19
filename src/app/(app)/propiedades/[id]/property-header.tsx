import Link from "next/link";
import { FolderOpen, Pencil } from "lucide-react";
import type { Property } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { propertyTypeLabels, propertyGoalLabels, propertyStatusLabels } from "@/lib/domain";
import { formatM2 } from "@/lib/format";
import { DeletePropertyButton } from "./delete-button";
import { StatusQuickEdit } from "./status-quick-edit";

// Encabezado de la ficha: la dirección es el título; debajo, tipo · comuna · m² ·
// ROL; a la derecha, el estado (editable), el objetivo y las acciones.
// El cliente edita su propiedad; el equipo la ve en solo lectura (ADR 0010) y es el único
// que ve el enlace a la carpeta del Drive de Proges.
export function PropertyHeader({
  property,
  esEquipo,
}: {
  esEquipo: boolean;
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
    | "driveCarpetaId"
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
    property.rolSII ? `ROL ${property.rolSII}` : "Sin ROL",
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
        {esEquipo ? (
          <Badge variant="outline">{propertyStatusLabels[property.estado]}</Badge>
        ) : (
          <StatusQuickEdit propertyId={property.id} current={property.estado} />
        )}
        <Badge variant="outline">
          Objetivo: {propertyGoalLabels[property.objetivo]}
        </Badge>
        {esEquipo && property.driveCarpetaId && (
          // Se abre en otra pestaña: cada persona del equipo entra con su propia cuenta de Google.
          <Button
            variant="outline"
            nativeButton={false}
            render={
              <a
                href={`https://drive.google.com/drive/folders/${property.driveCarpetaId}`}
                target="_blank"
                rel="noopener noreferrer"
              />
            }
          >
            <FolderOpen className="size-4" />
            Carpeta en Drive
          </Button>
        )}
        {!esEquipo && (
          <>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href={`/propiedades/${property.id}/editar`} />}
        >
          <Pencil className="size-4" />
          Editar
        </Button>
        <DeletePropertyButton id={property.id} />
          </>
        )}
      </div>
    </div>
  );
}
