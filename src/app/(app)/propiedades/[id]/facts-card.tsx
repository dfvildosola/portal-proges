import type {
  Owner,
  Property,
  PropertyAssessment,
  PropertyOwner,
  PropertyTag,
  PropertyUnit,
} from "@/generated/prisma/client";
import type { OwnerType } from "@/generated/prisma/enums";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  propertyTypeLabels,
  propertyGoalLabels,
  currencyLabels,
  ownerTypeLabels,
  propertyUnitTypeLabels,
} from "@/lib/domain";
import { formatMoney, formatM2 } from "@/lib/format";
import {
  AddOwnerDialog,
  AddTagDialog,
  AddUnitDialog,
  AddAssessmentDialog,
} from "./owners-tags-forms";
import { Lista, Quitar, Seccion, sub } from "./facts-parts";
import { removeOwner, removeTag, removeUnit, removeAssessment } from "../facts-actions";

type PropiedadFicha = Pick<
  Property,
  | "id"
  | "rolSII"
  | "tipo"
  | "direccion"
  | "comuna"
  | "region"
  | "objetivo"
  | "monedaPrincipal"
  | "m2Terreno"
  | "m2Construidos"
  | "anoConstruccion"
>;

// Par etiqueta/valor dentro de la grilla de datos.
function DataItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 py-2">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

// Los datos de la propiedad, sus dueños, avalúos, anexos y etiquetas. Se ve aquí;
// agregar se hace en cuadros (los botones «+ Agregar»).
export function FactsCard({
  property: p,
  owners,
  tags,
  units,
  assessments,
  entidadesDisponibles,
}: {
  property: PropiedadFicha;
  owners: (PropertyOwner & { owner: Owner })[];
  tags: PropertyTag[];
  units: PropertyUnit[];
  assessments: PropertyAssessment[];
  entidadesDisponibles: { id: string; nombre: string; tipo: OwnerType }[];
}) {
  const totalPorcentaje = owners.reduce(
    (suma, po) => suma + Number(po.porcentaje),
    0,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Datos de la propiedad</CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        <Seccion titulo="Ficha">
          <div className="grid gap-x-8 sm:grid-cols-2">
            <DataItem label="Tipo" value={propertyTypeLabels[p.tipo]} />
            <DataItem label="Objetivo" value={propertyGoalLabels[p.objetivo]} />
            <DataItem label="ROL SII" value={p.rolSII} />
            <DataItem label="Dirección" value={p.direccion} />
            <DataItem label="Comuna" value={p.comuna} />
            <DataItem label="Región" value={p.region} />
            <DataItem
              label="Moneda principal"
              value={currencyLabels[p.monedaPrincipal]}
            />
            <DataItem label="M² terreno" value={formatM2(p.m2Terreno)} />
            <DataItem label="M² construidos" value={formatM2(p.m2Construidos)} />
            <DataItem
              label="Año construcción"
              value={p.anoConstruccion ? String(p.anoConstruccion) : "—"}
            />
          </div>
        </Seccion>

        <Seccion
          titulo="Dueños"
          extra={
            owners.length > 0 && (
              <Badge variant={totalPorcentaje === 100 ? "outline" : "secondary"}>
                {totalPorcentaje}% asignado
              </Badge>
            )
          }
        >
          <Lista
            vacio="Sin dueños cargados."
            filas={owners.map((po) => ({
              key: po.id,
              texto: (
                <>
                  <span className="text-sm font-medium">{po.owner.nombre}</span>
                  <span className={sub}>
                    {ownerTypeLabels[po.owner.tipo]} · {po.owner.rut}
                  </span>
                </>
              ),
              derecha: (
                <>
                  <span className="text-sm font-medium tabular-nums">
                    {Number(po.porcentaje)}%
                  </span>
                  <Quitar
                    action={removeOwner}
                    campos={{ propertyOwnerId: po.id, propertyId: p.id }}
                    label="Quitar dueño"
                  />
                </>
              ),
            }))}
          />
          <AddOwnerDialog propertyId={p.id} entidades={entidadesDisponibles} />
        </Seccion>

        <Seccion titulo="Avalúo fiscal">
          <Lista
            vacio="Sin avalúos cargados."
            filas={assessments.map((a, i) => {
              // Variación contra el avalúo del año anterior (la lista viene del más
              // nuevo al más antiguo).
              const prev = assessments[i + 1];
              const pct =
                prev && Number(prev.valor) > 0
                  ? ((Number(a.valor) - Number(prev.valor)) /
                      Number(prev.valor)) *
                    100
                  : null;
              return {
                key: a.id,
                texto: (
                  <>
                    <span className="text-sm font-medium tabular-nums">
                      {formatMoney(a.valor, "CLP")}
                    </span>
                    <span className={`${sub} font-medium`}>{a.anio}</span>
                    {pct !== null && prev && (
                      <span
                        className={`ml-2 text-xs tabular-nums ${pct >= 0 ? "text-success" : "text-destructive"}`}
                      >
                        {pct >= 0 ? "+" : ""}
                        {pct.toFixed(1)}% vs {prev.anio}
                      </span>
                    )}
                  </>
                ),
                derecha: (
                  <Quitar
                    action={removeAssessment}
                    campos={{ assessmentId: a.id, propertyId: p.id }}
                    label="Quitar avalúo"
                  />
                ),
              };
            })}
          />
          <AddAssessmentDialog propertyId={p.id} />
        </Seccion>

        <Seccion titulo="Anexos (estacionamientos y bodegas)">
          <Lista
            vacio="Sin estacionamientos ni bodegas cargados."
            filas={units.map((u) => ({
              key: u.id,
              texto: (
                <>
                  <span className="text-sm font-medium">
                    {propertyUnitTypeLabels[u.tipo]} {u.numero}
                  </span>
                  <span className={sub}>
                    {u.rolSII ? `ROL ${u.rolSII}` : "Sin ROL"}
                    {u.avaluoFiscal != null &&
                      ` · av. ${formatMoney(u.avaluoFiscal, "CLP")}`}
                  </span>
                </>
              ),
              derecha: (
                <Quitar
                  action={removeUnit}
                  campos={{ unitId: u.id, propertyId: p.id }}
                  label="Quitar anexo"
                />
              ),
            }))}
          />
          <AddUnitDialog propertyId={p.id} />
        </Seccion>

        <Seccion titulo="Etiquetas">
          <div className="flex flex-wrap items-center gap-2">
            {tags.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin etiquetas.</p>
            ) : (
              tags.map((t) => (
                <Badge key={t.id} variant="secondary" className="gap-1 pr-1">
                  {t.nombre}
                  <Quitar
                    action={removeTag}
                    campos={{ propertyId: p.id, tagId: t.id }}
                    label={`Quitar ${t.nombre}`}
                    className="size-3"
                  />
                </Badge>
              ))
            )}
          </div>
          <AddTagDialog propertyId={p.id} />
        </Seccion>
      </CardContent>
    </Card>
  );
}
