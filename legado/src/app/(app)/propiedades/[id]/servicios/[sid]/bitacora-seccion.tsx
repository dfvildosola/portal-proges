// La bitácora de un proyecto, para el EQUIPO: arriba el formulario para anotar, abajo las notas
// con lo más nuevo primero. El dueño no ve esta sección: él recibe solo las notas marcadas
// «la ve el dueño», por src/lib/vista-cliente.ts.
//
// Las fotos se piden a /archivos/<id> (ruta del servidor que revisa el permiso): la miniatura en
// la lista, y el original al tocarla.

import Image from "next/image";
import { notFound } from "next/navigation";
import { Eye } from "lucide-react";
import { db } from "@/lib/db";
import { exigirLectura } from "@/lib/org";
import { exigirEquipo } from "@/lib/sesion";
import { hoyChile } from "@/lib/fechas";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BitacoraBorrar } from "./bitacora-borrar";
import { BitacoraCarpetaForm } from "./bitacora-carpeta-form";
import { BitacoraNotaForm } from "./bitacora-nota-form";

const MAX_NOTAS = 100;

// Fecha y hora de la nota en Chile (el servidor corre en UTC: se pide la zona a propósito).
const fechaYHora = new Intl.DateTimeFormat("es-CL", {
  timeZone: "America/Santiago",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export async function BitacoraSeccion({ servicioEnCursoId }: { servicioEnCursoId: string }) {
  const usuario = await exigirEquipo();

  const servicio = await db.servicioEnCurso.findUnique({
    where: { id: servicioEnCursoId },
    select: { id: true, organizationId: true, property: { select: { driveCarpetaId: true } } },
  });
  if (!servicio) notFound();
  // El espacio sale del registro, no de la URL: si el usuario no lo puede leer, lanza «Sin permiso».
  await exigirLectura(servicio.organizationId);

  const [notas, tareas] = await Promise.all([
    db.nota.findMany({
      where: { servicioEnCursoId: servicio.id, organizationId: servicio.organizationId },
      orderBy: { createdAt: "desc" },
      take: MAX_NOTAS,
      select: {
        id: true,
        texto: true,
        paraDueno: true,
        createdAt: true,
        autorId: true,
        autor: { select: { nombre: true } },
        tarea: { select: { que: true } },
        fotos: { orderBy: { createdAt: "asc" }, select: { id: true, driveFileId: true, nombre: true } },
      },
    }),
    db.tarea.findMany({
      where: { servicioEnCursoId: servicio.id, organizationId: servicio.organizationId, hechaEl: null },
      orderBy: { createdAt: "asc" },
      select: { id: true, que: true },
    }),
  ]);

  const hoy = hoyChile().getTime();
  const tieneCarpeta = servicio.property.driveCarpetaId !== null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bitácora</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {!tieneCarpeta && <BitacoraCarpetaForm servicioEnCursoId={servicio.id} />}
        <BitacoraNotaForm servicioEnCursoId={servicio.id} tareas={tareas} puedeSubirFotos={tieneCarpeta} />

        {notas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no hay notas en este proyecto.</p>
        ) : (
          <ul className="divide-y">
            {notas.map((n) => {
              // Borrar: solo el autor y solo el mismo día (el servidor lo vuelve a comprobar).
              const puedeBorrar = n.autorId === usuario.id && hoyChile(n.createdAt).getTime() === hoy;
              return (
                <li key={n.id} className="space-y-2 py-3 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{n.autor.nombre}</span>
                    <span>{fechaYHora.format(n.createdAt)}</span>
                    {n.paraDueno && (
                      <Badge variant="info">
                        <Eye className="size-3" />
                        La ve el dueño
                      </Badge>
                    )}
                  </div>
                  {n.texto && <p className="text-sm whitespace-pre-wrap">{n.texto}</p>}
                  {n.tarea && <p className="text-xs text-muted-foreground">Tarea: {n.tarea.que}</p>}
                  {n.fotos.length > 0 && (
                    <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {n.fotos.map((f) => (
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
                              sizes="(min-width: 640px) 160px, 33vw"
                              className="object-cover"
                            />
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                  {puedeBorrar && <BitacoraBorrar notaId={n.id} />}
                </li>
              );
            })}
          </ul>
        )}
        {notas.length === MAX_NOTAS && (
          <p className="text-xs text-muted-foreground">Se muestran las últimas {MAX_NOTAS} notas.</p>
        )}
      </CardContent>
    </Card>
  );
}
