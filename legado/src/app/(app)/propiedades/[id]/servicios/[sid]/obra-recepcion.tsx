// Sección «Recepción» de un proyecto de obra (solo EQUIPO, d16): partida por partida, conforme u
// observada. Una observada lleva lo que hay que corregir, sus fotos y una tarea abierta; al volver
// a recibirla conforme, la tarea queda hecha. La obra no se cierra con partidas pendientes u
// observadas: el resumen de arriba lo dice con resumenRecepcion y obraSePuedeCerrar (obra.ts).

import { notFound } from "next/navigation";
import Image from "next/image";
import { db } from "@/lib/db";
import { exigirLectura } from "@/lib/org";
import { equipoEnAccion } from "@/lib/sesion";
import { obraSePuedeCerrar, resumenRecepcion } from "@/lib/obra";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cargarDatosDeObra, type PartidaDeObra } from "./obra-datos";
import { ObservarBoton, RecibirConformeBoton } from "./obra-recepcion-form";

const ESTADOS = {
  PENDIENTE: { texto: "Por recibir", variante: "secondary" },
  CONFORME: { texto: "Conforme", variante: "success" },
  OBSERVADA: { texto: "Observada", variante: "warning" },
} as const;

// Cuándo se recibió: es un instante real (no una fecha civil), se muestra en hora de Chile.
const fechaChile = new Intl.DateTimeFormat("es-CL", { timeZone: "America/Santiago", dateStyle: "short" });

const SIN_RECINTO = "Sin recinto";

export async function ObraRecepcion({ servicioEnCursoId }: { servicioEnCursoId: string }) {
  await equipoEnAccion();

  const datos = await cargarDatosDeObra(servicioEnCursoId);
  if (!datos) notFound();
  await exigirLectura(datos.organizationId);

  const ids = datos.partidas.map((p) => p.id);
  const [propiedad, responsables, fotos, tareas] = await Promise.all([
    db.property.findUnique({ where: { id: datos.propertyId }, select: { driveCarpetaId: true } }),
    db.usuario.findMany({
      where: { rol: "EQUIPO", activo: true },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true },
    }),
    db.foto.findMany({
      where: { partidaId: { in: ids }, organizationId: datos.organizationId },
      orderBy: { createdAt: "asc" },
      select: { id: true, partidaId: true, driveFileId: true, nombre: true },
    }),
    db.tarea.findMany({
      where: { partidaId: { in: ids }, organizationId: datos.organizationId, hechaEl: null },
      select: { partidaId: true, responsable: { select: { nombre: true } } },
    }),
  ]);
  const puedeSubirFotos = Boolean(propiedad?.driveCarpetaId);
  const fotosDe = (id: string) => fotos.filter((f) => f.partidaId === id);
  const tareaDe = (id: string) => tareas.find((t) => t.partidaId === id);

  const resumen = resumenRecepcion(datos.partidas);
  const sePuedeCerrar = datos.partidas.length > 0 && obraSePuedeCerrar(datos.partidas);

  const grupos: { recinto: string | null; partidas: PartidaDeObra[] }[] = [];
  for (const p of datos.partidas) {
    const grupo = grupos.find((g) => g.recinto === p.recinto);
    if (grupo) grupo.partidas.push(p);
    else grupos.push({ recinto: p.recinto, partidas: [p] });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recepción</CardTitle>
        <CardDescription>
          {datos.partidas.length === 0
            ? "Todavía no hay partidas para recibir."
            : `${resumen.conformes} conformes · ${resumen.observadas} observadas · ${resumen.pendientes} por recibir. ${
                sePuedeCerrar ? "La obra se puede cerrar." : "La obra no se puede cerrar hasta que todas estén conformes."
              }`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {grupos.map((g) => (
          <section key={g.recinto ?? SIN_RECINTO} className="space-y-2">
            {!(g.recinto === null && grupos.length === 1) && (
              <h3 className="text-sm font-semibold">{g.recinto ?? SIN_RECINTO}</h3>
            )}
            <ul className="space-y-2">
              {g.partidas.map((p) => {
                const estado = ESTADOS[p.recepcion];
                const susFotos = fotosDe(p.id);
                const tarea = tareaDe(p.id);
                const nombre = p.codigo ? `${p.codigo} · ${p.descripcion}` : p.descripcion;
                if (p.quitadaEnOdoo) {
                  return (
                    <li key={p.id} className="rounded-lg border p-3 text-sm text-muted-foreground line-through">
                      {nombre} <Badge variant="warning">Quitada en Odoo</Badge>
                    </li>
                  );
                }
                return (
                  <li key={p.id} className="space-y-2 rounded-lg border p-3">
                    <p className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-medium">{nombre}</span>
                      <Badge variant={estado.variante}>{estado.texto}</Badge>
                      {p.recibidaEl && p.recepcion !== "PENDIENTE" && (
                        <span className="text-xs text-muted-foreground">{fechaChile.format(p.recibidaEl)}</span>
                      )}
                    </p>
                    {p.observacion && p.recepcion === "OBSERVADA" && (
                      <p className="whitespace-pre-line text-sm">{p.observacion}</p>
                    )}
                    {p.recepcion === "OBSERVADA" && (
                      <p className="text-xs text-muted-foreground">
                        {tarea
                          ? `Tarea de corregir abierta · ${tarea.responsable?.nombre ?? "sin responsable"}`
                          : "Sin tarea abierta"}
                      </p>
                    )}
                    {susFotos.length > 0 && (
                      <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                        {susFotos.map((f) => (
                          <li key={f.id}>
                            <a
                              href={`/archivos/${f.driveFileId}`}
                              target="_blank"
                              rel="noopener"
                              className="relative block aspect-square overflow-hidden rounded-lg bg-muted"
                            >
                              <Image
                                src={`/archivos/${f.driveFileId}?miniatura=1`}
                                alt={f.nombre}
                                fill
                                unoptimized
                                sizes="(min-width: 640px) 120px, 25vw"
                                className="object-cover"
                              />
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="flex flex-wrap items-start gap-2">
                      {p.recepcion !== "CONFORME" && (
                        <RecibirConformeBoton
                          partidaId={p.id}
                          texto={p.recepcion === "OBSERVADA" ? "Recibir conforme" : "Conforme"}
                        />
                      )}
                      <ObservarBoton
                        partidaId={p.id}
                        descripcion={p.descripcion}
                        observacionActual={p.recepcion === "OBSERVADA" ? (p.observacion ?? "") : ""}
                        responsables={responsables}
                        puedeSubirFotos={puedeSubirFotos}
                        texto={
                          p.recepcion === "OBSERVADA"
                            ? "Cambiar observación"
                            : p.recepcion === "CONFORME"
                              ? "Observar de nuevo"
                              : "Observar"
                        }
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </CardContent>
    </Card>
  );
}
