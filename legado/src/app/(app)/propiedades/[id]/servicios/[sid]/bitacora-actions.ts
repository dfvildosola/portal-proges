"use server";

// Acciones de la bitácora de un proyecto: anotar (con fotos), borrar una nota propia y enlazar
// la carpeta del Drive de la propiedad.
//
// La bitácora es solo del EQUIPO (el dueño no escribe: TAREA.md §4). Cada acción parte pidiendo
// un integrante activo del equipo y vuelve a leer el proyecto desde la base: el espacio donde se
// escribe sale del organizationId DEL REGISTRO, nunca de algo que mande el navegador.

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { espacioParaEscribirEn } from "@/lib/org";
import { PROYECTO_CERRADO } from "@/lib/servicios";
import { equipoEnAccion } from "@/lib/sesion";
import { hoyChile } from "@/lib/fechas";
import { idDeCarpeta, subirArchivo } from "@/lib/archivos";
import { toFieldErrors } from "@/lib/form-helpers";
import { MAX_BYTES_FOTO, MAX_FOTOS_POR_NOTA } from "./bitacora-limites";

export type BitacoraFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  // La nota se guardó, pero algo no salió del todo bien (las fotos). No es un error: el texto ya
  // quedó guardado, así que el formulario se vacía igual y el aviso se muestra aparte.
  aviso?: string;
  ok?: boolean;
};

const TIPOS_DE_FOTO: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

const notaSchema = z.object({
  servicioId: z.string().trim().min(1),
  texto: z.string().trim().max(4000, "Máximo 4000 caracteres"),
  // Los controles de «la ve el dueño» y «tarea» viajan como campos ocultos.
  paraDueno: z.string().optional(),
  tareaId: z.string().trim().optional(),
});

function revalidar(propertyId: string, servicioId: string) {
  revalidatePath(`/propiedades/${propertyId}/servicios/${servicioId}`);
}

// Anota en la bitácora del proyecto. Si las fotos fallan (la propiedad no tiene carpeta, falta la
// llave de Google, Drive niega el acceso…) la nota queda guardada sin ellas y el aviso lo dice.
export async function crearNota(_prev: BitacoraFormState, formData: FormData): Promise<BitacoraFormState> {
  const usuario = await equipoEnAccion();

  const parsed = notaSchema.safeParse({
    servicioId: formData.get("servicioId"),
    texto: formData.get("texto") ?? "",
    paraDueno: formData.get("paraDueno") ?? undefined,
    tareaId: formData.get("tareaId") ?? undefined,
  });
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error) };
  const { servicioId, texto, paraDueno, tareaId } = parsed.data;

  const fotos = formData.getAll("fotos").filter((f): f is File => f instanceof File && f.size > 0);
  if (texto === "" && fotos.length === 0) return { fieldErrors: { texto: "Escribe algo o agrega una foto" } };
  if (fotos.length > MAX_FOTOS_POR_NOTA) {
    return { fieldErrors: { fotos: `Máximo ${MAX_FOTOS_POR_NOTA} fotos por nota` } };
  }
  for (const f of fotos) {
    if (!TIPOS_DE_FOTO[f.type]) return { fieldErrors: { fotos: "Solo se aceptan fotos JPG, PNG o WebP" } };
    if (f.size > MAX_BYTES_FOTO) return { fieldErrors: { fotos: "Una foto pesa demasiado: prueba con otra" } };
  }

  const servicio = await db.servicioEnCurso.findUnique({
    where: { id: servicioId },
    select: { id: true, organizationId: true, propertyId: true, estado: true, property: { select: { driveCarpetaId: true } } },
  });
  if (!servicio) return { error: "El proyecto no existe." };
  const orgId = await espacioParaEscribirEn(servicio.organizationId);
  if (servicio.estado !== "ABIERTO") return { error: PROYECTO_CERRADO };

  // Una nota solo de fotos no tiene sentido si no hay dónde subirlas.
  if (texto === "" && !servicio.property.driveCarpetaId) {
    return { error: "Esta propiedad no tiene carpeta de Drive: enlázala para subir fotos, o escribe un texto." };
  }

  // La tarea, si viene, tiene que ser una abierta de este mismo proyecto.
  if (tareaId) {
    const tarea = await db.tarea.findFirst({
      where: { id: tareaId, servicioEnCursoId: servicio.id, organizationId: orgId, hechaEl: null },
      select: { id: true },
    });
    if (!tarea) return { fieldErrors: { tareaId: "Esa tarea ya no está abierta" } };
  }

  const nota = await db.nota.create({
    data: {
      organizationId: orgId,
      servicioEnCursoId: servicio.id,
      autorId: usuario.id,
      texto,
      paraDueno: paraDueno === "1",
      tareaId: tareaId || null,
    },
    select: { id: true },
  });

  // Las fotos se suben una por una; cada una queda registrada apenas sube. Si una falla, se
  // detiene ahí: las que ya subieron se quedan y el aviso cuenta cuántas.
  let subidas = 0;
  let falla: string | null = null;
  for (const [i, foto] of fotos.entries()) {
    try {
      const { driveFileId } = await subirArchivo({
        property: servicio.property,
        nombre: `bitacora-${nota.id}-${i + 1}.${TIPOS_DE_FOTO[foto.type]}`,
        mime: foto.type,
        datos: Buffer.from(await foto.arrayBuffer()),
      });
      await db.foto.create({
        data: { organizationId: orgId, notaId: nota.id, driveFileId, nombre: foto.name || `foto-${i + 1}`, mime: foto.type },
      });
      subidas++;
    } catch (e) {
      falla = e instanceof Error ? e.message : "Error desconocido al subir la foto.";
      break;
    }
  }

  revalidar(servicio.propertyId, servicio.id);

  if (falla) {
    // Una nota sin texto y sin ninguna foto no dice nada: se retira y se devuelve el error.
    if (texto === "" && subidas === 0) {
      await db.nota.delete({ where: { id: nota.id } });
      return { error: `No se pudo subir las fotos: ${falla}` };
    }
    const cuantas = subidas === 0 ? "las fotos no" : `solo ${subidas} de ${fotos.length} fotos subieron`;
    return { ok: true, aviso: `La nota quedó guardada, pero ${cuantas}: ${falla}` };
  }
  return { ok: true };
}

// Borra una nota. Solo la puede borrar quien la escribió y solo el mismo día (en hora de Chile):
// después es parte del registro de lo que pasó. Las fotos dejan de verse en el portal; los
// archivos quedan en la carpeta del Drive.
export async function borrarNota(_prev: BitacoraFormState, formData: FormData): Promise<BitacoraFormState> {
  const usuario = await equipoEnAccion();
  const notaId = String(formData.get("notaId") ?? "");
  if (!notaId) return { error: "Falta la nota." };

  const nota = await db.nota.findUnique({
    where: { id: notaId },
    select: {
      id: true,
      organizationId: true,
      autorId: true,
      createdAt: true,
      servicioEnCurso: { select: { id: true, propertyId: true } },
    },
  });
  if (!nota) return { error: "La nota ya no existe." };
  await espacioParaEscribirEn(nota.organizationId);

  if (nota.autorId !== usuario.id) return { error: "Solo quien escribió la nota puede borrarla." };
  if (hoyChile(nota.createdAt).getTime() !== hoyChile().getTime()) {
    return { error: "Una nota solo se puede borrar el mismo día en que se escribió." };
  }

  await db.nota.delete({ where: { id: nota.id } });
  revalidar(nota.servicioEnCurso.propertyId, nota.servicioEnCurso.id);
  return { ok: true };
}

const carpetaSchema = z.object({
  servicioId: z.string().trim().min(1),
  carpeta: z.string().trim().min(1, "Pega el enlace de la carpeta"),
});

// Enlaza la carpeta del Drive de la propiedad del proyecto: se pega su URL y se guarda el id.
// La propiedad se saca del proyecto, no del formulario.
export async function enlazarCarpeta(_prev: BitacoraFormState, formData: FormData): Promise<BitacoraFormState> {
  const usuario = await equipoEnAccion();

  const parsed = carpetaSchema.safeParse({
    servicioId: formData.get("servicioId"),
    carpeta: formData.get("carpeta") ?? "",
  });
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error) };

  const id = idDeCarpeta(parsed.data.carpeta);
  if (!id) {
    return {
      fieldErrors: { carpeta: "No reconozco ese enlace. Abre la carpeta en Drive y copia la dirección del navegador." },
    };
  }

  const servicio = await db.servicioEnCurso.findUnique({
    where: { id: parsed.data.servicioId },
    select: { id: true, propertyId: true, property: { select: { organizationId: true } } },
  });
  if (!servicio) return { error: "El proyecto no existe." };
  await espacioParaEscribirEn(servicio.property.organizationId);

  await db.property.update({
    where: { id: servicio.propertyId },
    data: { driveCarpetaId: id, modificadoPorId: usuario.id },
  });
  revalidatePath(`/propiedades/${servicio.propertyId}`);
  revalidar(servicio.propertyId, servicio.id);
  return { ok: true };
}
