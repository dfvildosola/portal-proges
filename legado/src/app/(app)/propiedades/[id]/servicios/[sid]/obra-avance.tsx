// Sección «Avance» de un proyecto (solo EQUIPO): las partidas de la orden, por recinto.
//
// El avance se marca por recinto (aplica a todas sus líneas) y, si un recinto va desparejo, se
// abre y se marca línea por línea. En un servicio suelto (partidas sin recinto) es una lista de
// casillas: marcada = 100 %. Las partidas que Odoo ya no trae salen tachadas y no cuentan.
// El avance de cada recinto lo calcula avancePonderado de src/lib/obra.ts, igual que el de la obra.

import { notFound } from "next/navigation";
import { exigirLectura } from "@/lib/org";
import { equipoEnAccion } from "@/lib/sesion";
import { avancePonderado } from "@/lib/obra";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cargarDatosDeObra, type PartidaDeObra } from "./obra-datos";
import { AvanceBotones, AvanceCasilla } from "./obra-avance-form";

const SIN_RECINTO = "Sin recinto";

const nombreDeLinea = (p: PartidaDeObra) => (p.codigo ? `${p.codigo} · ${p.descripcion}` : p.descripcion);

export async function ObraAvance({ servicioEnCursoId }: { servicioEnCursoId: string }) {
  await equipoEnAccion();

  const datos = await cargarDatosDeObra(servicioEnCursoId);
  if (!datos) notFound();
  await exigirLectura(datos.organizationId);

  const partidas = datos.partidas;
  const vigentes = partidas.filter((p) => !p.quitadaEnOdoo);
  const sinRecintos = partidas.length > 0 && partidas.every((p) => p.recinto === null);

  // Los recintos en el orden de la orden (las partidas ya vienen por posición).
  const grupos: { recinto: string | null; partidas: PartidaDeObra[] }[] = [];
  for (const p of partidas) {
    const grupo = grupos.find((g) => g.recinto === p.recinto);
    if (grupo) grupo.partidas.push(p);
    else grupos.push({ recinto: p.recinto, partidas: [p] });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Avance</CardTitle>
        <CardDescription>
          {sinRecintos
            ? "Marca cada línea cuando esté hecha."
            : "Marca el avance de cada recinto; si va desparejo, ábrelo y marca línea por línea."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {partidas.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Todavía no hay partidas: se crean al enlazar la orden de Odoo del proyecto.
          </p>
        )}

        {sinRecintos && (
          <ul className="divide-y rounded-lg border px-3">
            {partidas.map((p) =>
              p.quitadaEnOdoo ? (
                <li key={p.id} className="py-2 text-sm text-muted-foreground line-through">
                  {nombreDeLinea(p)} <Badge variant="warning">Quitada en Odoo</Badge>
                </li>
              ) : (
                <li key={p.id}>
                  <AvanceCasilla partidaId={p.id} marcada={p.avance === 100} texto={nombreDeLinea(p)} />
                </li>
              ),
            )}
          </ul>
        )}

        {!sinRecintos &&
          grupos.map((g) => {
            const vivas = g.partidas.filter((p) => !p.quitadaEnOdoo);
            const avance = avancePonderado(vivas);
            return (
              <details key={g.recinto ?? SIN_RECINTO} className="rounded-lg border">
                <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
                  <span className="font-medium">{g.recinto ?? SIN_RECINTO}</span>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {avance.toLocaleString("es-CL")} % · {vivas.length} {vivas.length === 1 ? "línea" : "líneas"}
                  </span>
                </summary>
                <div className="space-y-3 border-t px-3 py-3">
                  {vivas.length > 0 && (
                    <AvanceBotones
                      alcance="recinto"
                      servicioEnCursoId={datos.servicioId}
                      recinto={g.recinto}
                      actual={avance}
                    />
                  )}
                  <ul className="divide-y">
                    {g.partidas.map((p) => (
                      <li key={p.id} className="flex flex-col gap-1.5 py-2">
                        <p className={`text-sm ${p.quitadaEnOdoo ? "text-muted-foreground line-through" : ""}`}>
                          {nombreDeLinea(p)}{" "}
                          {p.quitadaEnOdoo && <Badge variant="warning">Quitada en Odoo</Badge>}
                        </p>
                        {!p.quitadaEnOdoo && <AvanceBotones alcance="partida" partidaId={p.id} actual={p.avance} />}
                      </li>
                    ))}
                  </ul>
                </div>
              </details>
            );
          })}

        {vigentes.length > 0 && !sinRecintos && (
          <p className="text-xs text-muted-foreground">
            Cada botón de arriba aplica a todas las líneas del recinto; los de cada línea, solo a esa.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
