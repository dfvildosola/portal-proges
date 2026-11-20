// Rutas de la bitácora (notas con fotos) y de las fotos mismas. Las escribe la pieza D.
//
// La bitácora es solo del equipo para escribir. `paraDueno` marca las notas (y sus fotos) que el
// dueño puede ver; las demás nunca salen hacia un dueño ni una llave: ese filtro se hace en la
// consulta misma (where paraDueno) y otra vez en el recorte.
//
// Las fotos viven en el Drive de la propiedad y la API las entrega revisando el permiso. Nunca
// hay un enlace público (ADR 0015).
import { createRoute, z } from "@hono/zod-openapi";
import { db } from "@proges/db";
import {
  Id,
  NotaCambiar,
  NotaCreada,
  NotaEquipo,
  NotaNueva,
  NotasDeServicio,
  NotasParaDueno,
} from "@proges/contrato";
import { nuevoRouter } from "../entorno";
import { ErrorApi } from "../errores";
import { esDueno, espacioParaEscribirEn, exigirEquipo, legible } from "../permisos";
import { SERVICIO_NO_ENCONTRADO, visibleParaDueno } from "../dominio/trabajo/ficha";
import { EXTENSION_DE_FOTO, MAX_BYTES_FOTO, MAX_FOTOS_POR_NOTA } from "../dominio/trabajo/limites";
import { notaParaDueno, notaParaEquipo } from "../dominio/trabajo/recorte";
import { seleccionNota } from "../dominio/trabajo/selecciones";
import { errores, json } from "./ayuda";

export const notas = nuevoRouter();

const ParamId = z.object({ id: Id });

// ---------------------------------------------------------------------------
// Leer la bitácora de un servicio
// ---------------------------------------------------------------------------

notas.openapi(
  createRoute({
    method: "get",
    path: "/servicios/{id}/notas",
    tags: ["Bitácora"],
    summary: "La bitácora de un servicio",
    description:
      "El equipo ve todas las notas, con su autor. Un dueño o una llave ve solo las marcadas para el dueño, sin autor ni tarea. De la más nueva a la más antigua.",
    request: { params: ParamId },
    responses: { 200: json(z.union([NotasDeServicio, NotasParaDueno]), "Las notas."), ...errores(401, 404) },
  }),
  async (c) => {
    const quien = c.get("quien");
    const { id } = c.req.valid("param");
    const servicio = await legible(
      quien,
      await db.servicioEnCurso.findUnique({
        where: { id },
        select: { organizationId: true, estado: true, porConfirmar: true, porRevisar: true },
      }),
    );
    if (esDueno(quien)) {
      if (!visibleParaDueno(servicio)) throw new ErrorApi(404, SERVICIO_NO_ENCONTRADO);
      const filas = await db.nota.findMany({
        where: { servicioEnCursoId: id, paraDueno: true },
        orderBy: { createdAt: "desc" },
        select: seleccionNota,
      });
      return c.json({ items: filas.map(notaParaDueno) }, 200);
    }
    const filas = await db.nota.findMany({
      where: { servicioEnCursoId: id },
      orderBy: { createdAt: "desc" },
      select: seleccionNota,
    });
    return c.json({ items: filas.map(notaParaEquipo) }, 200);
  },
);

// ---------------------------------------------------------------------------
// Anotar (con fotos)
// ---------------------------------------------------------------------------

notas.openapi(
  createRoute({
    method: "post",
    path: "/servicios/{id}/notas",
    tags: ["Bitácora"],
    summary: "Anotar en la bitácora, con fotos",
    description:
      "Solo el equipo. Se envía como multipart/form-data: texto, paraDueno (true o 1 para que el dueño la vea), tareaId (una tarea abierta de este servicio, opcional) y hasta 6 fotos JPG, PNG o WebP que ya vienen achicadas desde el teléfono. Las fotos se guardan en el Drive de la propiedad. Si alguna falla, la nota igual queda guardada y `aviso` dice qué pasó.",
    request: {
      params: ParamId,
      body: { content: { "multipart/form-data": { schema: NotaNueva } }, required: true },
    },
    responses: { 201: json(NotaCreada, "La nota guardada."), ...errores(400, 401, 403, 404, 409) },
  }),
  async (c) => {
    const quien = c.get("quien");
    const persona = exigirEquipo(quien);
    const { id } = c.req.valid("param");
    const form = c.req.valid("form");
    const texto = (form.texto ?? "").trim();
    const paraDueno = form.paraDueno === "true" || form.paraDueno === "1";
    // Una sola foto llega como archivo y varias como lista; un campo de archivo vacío llega como
    // archivo de 0 bytes y se descarta.
    const fotos = (form.fotos === undefined ? [] : Array.isArray(form.fotos) ? form.fotos : [form.fotos]).filter(
      (f) => f.size > 0,
    );

    if (texto === "" && fotos.length === 0) {
      throw new ErrorApi(400, "Escribe algo o agrega una foto.", { texto: "Escribe algo o agrega una foto." });
    }
    if (fotos.length > MAX_FOTOS_POR_NOTA) {
      throw new ErrorApi(400, `Máximo ${MAX_FOTOS_POR_NOTA} fotos por nota.`, {
        fotos: `Máximo ${MAX_FOTOS_POR_NOTA} fotos por nota.`,
      });
    }
    for (const f of fotos) {
      if (!EXTENSION_DE_FOTO[f.type]) {
        throw new ErrorApi(400, "Solo se aceptan fotos JPG, PNG o WebP.", { fotos: "Solo se aceptan fotos JPG, PNG o WebP." });
      }
      if (f.size > MAX_BYTES_FOTO) {
        throw new ErrorApi(400, "Una foto pesa demasiado: prueba con otra.", { fotos: "Una foto pesa demasiado." });
      }
    }

    const servicio = await db.servicioEnCurso.findUnique({
      where: { id },
      select: { organizationId: true, estado: true, property: { select: { driveCarpetaId: true } } },
    });
    const orgId = await espacioParaEscribirEn(quien, servicio?.organizationId);
    if (!servicio) throw new ErrorApi(404, SERVICIO_NO_ENCONTRADO);
    if (servicio.estado !== "ABIERTO") throw new ErrorApi(409, "Este servicio ya está cerrado.");

    // Una nota solo de fotos no tiene sentido si no hay dónde subirlas.
    if (texto === "" && !servicio.property.driveCarpetaId) {
      throw new ErrorApi(409, "Esta propiedad no tiene carpeta de Drive: enlázala para subir fotos, o escribe un texto.");
    }

    // La tarea, si viene, tiene que ser una abierta de este mismo servicio.
    if (form.tareaId) {
      const tarea = await db.tarea.findFirst({
        where: { id: form.tareaId, servicioEnCursoId: id, organizationId: orgId, hechaEl: null },
        select: { id: true },
      });
      if (!tarea) throw new ErrorApi(400, "Esa tarea ya no está abierta.", { tareaId: "Esa tarea ya no está abierta." });
    }

    const nota = await db.nota.create({
      data: {
        organizationId: orgId,
        servicioEnCursoId: id,
        autorId: persona.usuario.id,
        texto,
        paraDueno,
        tareaId: form.tareaId ?? null,
      },
      select: { id: true },
    });

    // Las fotos se suben una por una; cada una queda registrada apenas sube. Si una falla, se
    // detiene ahí: las que ya subieron se quedan y el aviso cuenta cuántas.
    const { drive } = c.get("dep");
    let subidas = 0;
    let falla: string | null = null;
    for (const [i, foto] of fotos.entries()) {
      try {
        const { driveFileId } = await drive.subirArchivo({
          property: servicio.property,
          nombre: `bitacora-${nota.id}-${i + 1}.${EXTENSION_DE_FOTO[foto.type]}`,
          mime: foto.type,
          datos: Buffer.from(await foto.arrayBuffer()),
        });
        await db.foto.create({
          data: { organizationId: orgId, notaId: nota.id, driveFileId, nombre: foto.name || `foto-${i + 1}`, mime: foto.type },
        });
        subidas++;
      } catch (e) {
        console.error(`[api] No se pudo subir la foto ${i + 1} de la nota ${nota.id}:`, e);
        falla = e instanceof Error ? e.message : "Error desconocido al subir la foto.";
        break;
      }
    }

    let aviso: string | null = null;
    if (falla) {
      // Una nota sin texto y sin ninguna foto no dice nada: se retira y se devuelve el error.
      if (texto === "" && subidas === 0) {
        await db.nota.delete({ where: { id: nota.id } });
        throw new ErrorApi(502, `No se pudieron subir las fotos: ${falla}`);
      }
      const cuantas = subidas === 0 ? "las fotos no" : `solo ${subidas} de ${fotos.length} fotos subieron`;
      aviso = `La nota quedó guardada, pero ${cuantas}: ${falla}`;
    }

    const guardada = await db.nota.findUniqueOrThrow({ where: { id: nota.id }, select: seleccionNota });
    return c.json({ nota: notaParaEquipo(guardada), aviso }, 201);
  },
);

// ---------------------------------------------------------------------------
// Cambiar si la ve el dueño
// ---------------------------------------------------------------------------

notas.openapi(
  createRoute({
    method: "patch",
    path: "/notas/{id}",
    tags: ["Bitácora"],
    summary: "Cambiar si el dueño ve una nota",
    description: "Solo el equipo. Marca o desmarca la nota (y sus fotos) como visible para el dueño.",
    request: { params: ParamId, body: { content: { "application/json": { schema: NotaCambiar } }, required: true } },
    responses: { 200: json(NotaEquipo, "La nota ya cambiada."), ...errores(400, 401, 403, 404) },
  }),
  async (c) => {
    const quien = c.get("quien");
    exigirEquipo(quien);
    const { id } = c.req.valid("param");
    const { paraDueno } = c.req.valid("json");
    const previa = await db.nota.findUnique({ where: { id }, select: { organizationId: true } });
    const orgId = await espacioParaEscribirEn(quien, previa?.organizationId);
    const nota = await db.nota.update({ where: { id, organizationId: orgId }, data: { paraDueno }, select: seleccionNota });
    return c.json(notaParaEquipo(nota), 200);
  },
);

// ---------------------------------------------------------------------------
// Entregar una foto
// ---------------------------------------------------------------------------

notas.openapi(
  createRoute({
    method: "get",
    path: "/fotos/{id}",
    tags: ["Bitácora"],
    summary: "Una foto de la bitácora",
    description:
      "Entrega la foto desde el Drive de la propiedad, revisando el permiso: no hay enlace público. Un dueño o una llave solo ve fotos de notas marcadas para el dueño, de servicios que puede ver. Con ?miniatura=1 entrega la miniatura que genera Drive (para las listas); si todavía no la tiene, entrega el original.",
    request: { params: ParamId, query: z.object({ miniatura: z.enum(["0", "1"]).optional() }) },
    responses: {
      200: {
        description: "La imagen.",
        content: { "image/*": { schema: z.string().meta({ format: "binary" }) } },
      },
      ...errores(401, 404, 502),
    },
  }),
  async (c) => {
    const quien = c.get("quien");
    const { id } = c.req.valid("param");
    const { miniatura } = c.req.valid("query");

    const foto = await legible(
      quien,
      await db.foto.findUnique({
        where: { id },
        select: {
          organizationId: true,
          driveFileId: true,
          nombre: true,
          nota: {
            select: {
              paraDueno: true,
              servicioEnCurso: { select: { estado: true, porConfirmar: true, porRevisar: true } },
            },
          },
        },
      }),
    );
    // Un dueño o una llave: solo la foto de una nota marcada para él, de un servicio que él ve.
    // Una foto sin nota (la de una recepción de obra) nunca es suya.
    if (esDueno(quien)) {
      const n = foto.nota;
      if (!n || !n.paraDueno || !visibleParaDueno(n.servicioEnCurso)) throw new ErrorApi(404, "No se encontró lo que buscas.");
    }

    const { drive } = c.get("dep");
    try {
      const chica = miniatura === "1" ? await drive.miniatura(foto.driveFileId) : null;
      const archivo = chica ? { ...chica, nombre: foto.nombre } : await drive.leerArchivo(foto.driveFileId);
      return c.body(new Uint8Array(archivo.datos), 200, {
        "Content-Type": archivo.mime,
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(archivo.nombre)}`,
        // Privada: solo el navegador de quien pidió puede guardarla, nunca una caché compartida.
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      });
    } catch (e) {
      // Falta la llave de Google, la carpeta no está compartida… el mensaje dice qué hacer.
      console.error(`[api] No se pudo leer la foto ${id} de Drive:`, e);
      throw new ErrorApi(502, e instanceof Error ? e.message : "Drive no entregó la foto.");
    }
  },
);
