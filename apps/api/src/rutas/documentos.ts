// Rutas de documentos, dueños y grupos económicos (pieza C).
//
// Documentos: la lista agrupada de una propiedad con su estado, subir un PDF, borrarlo y pedir el
// archivo. El PDF se guarda con dep.pdf (integraciones/blob.ts) y NUNCA se entrega con un enlace
// público: GET /v1/documentos/{id}/archivo primero revisa quién pregunta y después lo busca.
//
// Dueños: las personas y sociedades dueñas de las propiedades (Owner), sus grupos económicos
// (Grupo: la familia que controla varias entidades) y la copropiedad de cada propiedad con su %
// (PropertyOwner).
import { randomUUID } from "node:crypto";
import { createRoute, z } from "@hono/zod-openapi";
import { db } from "@proges/db";
import {
  DocumentoFicha,
  DocumentoSubida,
  DocumentosRespuesta,
  DuenoCambios,
  DuenoEntidad,
  DuenoNuevo,
  DuenosConsulta,
  DuenosRespuesta,
  GrupoNuevo,
  DuenoGrupo,
  Id,
  PropiedadDueno,
  PropiedadDuenoNuevo,
} from "@proges/contrato";
import { nuevoRouter } from "../entorno";
import { ErrorApi } from "../errores";
import { esDueno, espacioParaCrear, espacioParaEscribirEn, espaciosQueLee, exigirEscritura, legible } from "../permisos";
import { hoyChile } from "../util/fechas";
import { fechaCivil } from "../dominio/ficha/entrada";
import { agruparDocumentos } from "../dominio/ficha/documentos";
import { PAPEL_CATEGORIA } from "../dominio/ficha/papeles";
import { documentoDe, duenoDe, propiedadDuenoDe } from "../dominio/ficha/recorte";
import { errores, json } from "./ayuda";

export const documentos = nuevoRouter();

const ParamId = z.object({ id: Id });
const sinContenido = { description: "Hecho. No devuelve nada." };
const MAX_BYTES = 25 * 1024 * 1024;
const INCLUIR_GRUPO = { grupo: { select: { nombre: true } } } as const;

// ---------------------------------------------------------------------------
// Documentos
// ---------------------------------------------------------------------------

documentos.openapi(
  createRoute({
    method: "get",
    path: "/propiedades/{id}/documentos",
    tags: ["Documentos"],
    summary: "Documentos de una propiedad",
    description:
      "Los documentos de la propiedad agrupados en dominio, municipales, planos, informes y otros. Cada uno trae su estado: `vigente`, `vence` (en los próximos 45 días), `vencido`, o `falta` cuando la propiedad necesita ese papel y nadie lo ha cargado. El archivo se pide aparte, con `/documentos/{id}/archivo`.",
    request: { params: ParamId },
    responses: { 200: json(DocumentosRespuesta, "Los documentos, agrupados."), ...errores(401, 404) },
  }),
  async (c) => {
    const quien = c.get("quien");
    const propiedad = await legible(quien, await db.property.findUnique({ where: { id: c.req.valid("param").id } }));
    const lista = await db.document.findMany({
      where: { propertyId: propiedad.id },
      include: { subidoPor: { select: { nombre: true } } },
    });
    const dueno = esDueno(quien);
    const resultado = agruparDocumentos({ tipo: propiedad.tipo, estado: propiedad.estado, documentos: lista, hoy: hoyChile() });
    return c.json(
      {
        grupos: resultado.grupos.map((g) => ({
          grupo: g.grupo,
          nombre: g.nombre,
          items: g.items.map((i) => ({
            papel: i.papel,
            papelNombre: i.papelNombre,
            estado: i.estado,
            documento: i.documento ? documentoDe(i.documento, dueno) : null,
          })),
        })),
        faltan: resultado.faltan,
        vencenPronto: resultado.vencenPronto,
      },
      200,
    );
  },
);

documentos.openapi(
  createRoute({
    method: "post",
    path: "/propiedades/{id}/documentos",
    tags: ["Documentos"],
    summary: "Subir un documento",
    description:
      "Sube un PDF (hasta 25 MB) como formulario con archivo (`multipart/form-data`). Hay que decir qué `papel` es: con un papel de la lista, el cajón sale solo; con «OTRO» el documento queda sin papel y hay que mandar `tipo`. La fecha de emisión no puede ser futura. Queda anotado quién lo subió. Una llave de la API no puede.",
    request: { params: ParamId, body: { content: { "multipart/form-data": { schema: DocumentoSubida } }, required: true } },
    responses: { 201: json(DocumentoFicha, "El documento guardado."), ...errores(400, 401, 403, 404, 503) },
  }),
  async (c) => {
    const quien = c.get("quien");
    const persona = exigirEscritura(quien);
    const { id } = c.req.valid("param");
    const form = c.req.valid("form");
    const propiedad = await db.property.findUnique({ where: { id } });
    const organizationId = await espacioParaEscribirEn(quien, propiedad?.organizationId);

    const archivo = form.file;
    const campos: Record<string, string> = {};
    if (archivo.size === 0) campos.file = "El archivo está vacío.";
    else if (archivo.size > MAX_BYTES) campos.file = "El archivo pasa de 25 MB.";
    else if (archivo.type !== "application/pdf") campos.file = "Sube un PDF.";
    if (form.papel === "OTRO" && !form.tipo) campos.tipo = "Elige en qué cajón se archiva.";
    if (form.fechaEmision && fechaCivil(form.fechaEmision) > hoyChile()) campos.fechaEmision = "No puede ser una fecha futura.";
    if (Object.keys(campos).length > 0) throw new ErrorApi(400, "Revisa los datos enviados.", campos);

    const papel = form.papel === "OTRO" ? null : form.papel;
    const tipo = papel ? PAPEL_CATEGORIA[papel] : form.tipo!;
    const nombre = form.nombre?.trim() || archivo.name;

    const { pdf } = c.get("dep");
    const datos = new Uint8Array(await archivo.arrayBuffer());
    const { clave } = await pdf.guardar({
      ruta: `proges/${organizationId}/propiedades/${id}/${randomUUID()}.pdf`,
      mime: "application/pdf",
      datos,
    });
    try {
      const creado = await db.document.create({
        data: {
          organizationId,
          propertyId: id,
          tipo,
          papel,
          nombre,
          blobKey: clave,
          fechaEmision: form.fechaEmision ? fechaCivil(form.fechaEmision) : null,
          fechaVencimiento: form.fechaVencimiento ? fechaCivil(form.fechaVencimiento) : null,
          subidoPorId: persona.usuario.id,
        },
        include: { subidoPor: { select: { nombre: true } } },
      });
      return c.json(documentoDe(creado, false), 201);
    } catch (error) {
      // El archivo ya está guardado pero la base no lo anotó: se saca para no dejar uno huérfano.
      await pdf.borrar(clave).catch((e: unknown) => {
        console.error("subida de documento: no se pudo sacar el archivo huérfano", { clave }, e);
      });
      throw error;
    }
  },
);

documentos.openapi(
  createRoute({
    method: "get",
    path: "/documentos/{id}/archivo",
    tags: ["Documentos"],
    summary: "El archivo de un documento",
    description:
      "Entrega el PDF del documento. La API primero revisa que puedas ver la propiedad (de otro cliente responde 404) y después lo busca: el archivo nunca tiene un enlace público.",
    request: { params: ParamId },
    responses: {
      200: { content: { "application/pdf": { schema: z.string().meta({ format: "binary" }) } }, description: "El PDF." },
      ...errores(401, 404, 503),
    },
  }),
  async (c) => {
    const quien = c.get("quien");
    const documento = await legible(quien, await db.document.findUnique({ where: { id: c.req.valid("param").id } }));
    const { datos, mime } = await c.get("dep").pdf.leer(documento.blobKey);
    const nombreSeguro = encodeURIComponent(documento.nombre.replace(/\.pdf$/i, "") + ".pdf");
    // Se copia a un ArrayBuffer propio: así el cuerpo es un tipo que Response siempre acepta.
    const cuerpo = new Uint8Array(datos).buffer as ArrayBuffer;
    return c.body(cuerpo, 200, {
      "Content-Type": mime,
      "Content-Disposition": `inline; filename*=UTF-8''${nombreSeguro}`,
      // Es un documento privado: que ningún intermediario lo guarde.
      "Cache-Control": "private, no-store",
    }) as never;
  },
);

documentos.openapi(
  createRoute({
    method: "delete",
    path: "/documentos/{id}",
    tags: ["Documentos"],
    summary: "Borrar un documento",
    description: "Borra el documento y su archivo. Una llave de la API no puede.",
    request: { params: ParamId },
    responses: { 204: sinContenido, ...errores(401, 403, 404) },
  }),
  async (c) => {
    const quien = c.get("quien");
    exigirEscritura(quien);
    const documento = await db.document.findUnique({ where: { id: c.req.valid("param").id } });
    await espacioParaEscribirEn(quien, documento?.organizationId);
    await db.document.delete({ where: { id: documento!.id } });
    // Si el almacén falla, la fila ya salió de la lista; el archivo que queda se anota en el
    // registro del servidor con su dirección para poder limpiarlo a mano.
    await c
      .get("dep")
      .pdf.borrar(documento!.blobKey)
      .catch((e: unknown) => {
        console.error("borrar documento: no se pudo borrar el archivo del almacén", { documentoId: documento!.id, clave: documento!.blobKey }, e);
      });
    return c.body(null, 204);
  },
);

// ---------------------------------------------------------------------------
// Dueños y grupos económicos
// ---------------------------------------------------------------------------

documentos.openapi(
  createRoute({
    method: "get",
    path: "/duenos",
    tags: ["Dueños"],
    summary: "Dueños y grupos económicos",
    description:
      "Las personas y sociedades dueñas de propiedades, y los grupos económicos que las agrupan (la familia o persona que controla varias). El equipo ve los de todos los clientes (y puede filtrar con `cliente`); un cliente o una llave, solo los suyos.",
    request: { query: DuenosConsulta },
    responses: { 200: json(DuenosRespuesta, "Las entidades y los grupos."), ...errores(400, 401) },
  }),
  async (c) => {
    const quien = c.get("quien");
    const orgIds = await espaciosQueLee(quien, c.req.valid("query").cliente);
    const [duenos, grupos] = await Promise.all([
      db.owner.findMany({ where: { organizationId: { in: orgIds } }, include: INCLUIR_GRUPO, orderBy: { nombre: "asc" } }),
      db.grupo.findMany({
        where: { organizationId: { in: orgIds } },
        include: { _count: { select: { owners: true } } },
        orderBy: { nombre: "asc" },
      }),
    ]);
    return c.json(
      {
        duenos: duenos.map(duenoDe),
        grupos: grupos.map((g) => ({
          id: g.id,
          clienteId: g.organizationId,
          nombre: g.nombre,
          rut: g.rut,
          entidades: g._count.owners,
        })),
      },
      200,
    );
  },
);

// Un grupo tiene que ser del mismo cliente que la entidad: si no, 400 en el campo `grupoId`.
async function exigirGrupoDe(organizationId: string, grupoId: string): Promise<void> {
  const grupo = await db.grupo.findFirst({ where: { id: grupoId, organizationId }, select: { id: true } });
  if (!grupo) throw new ErrorApi(400, "Revisa los datos enviados.", { grupoId: "Ese grupo no existe o es de otro cliente." });
}

documentos.openapi(
  createRoute({
    method: "post",
    path: "/duenos",
    tags: ["Dueños"],
    summary: "Crear una entidad dueña",
    description:
      "Crea una persona o sociedad dueña, todavía sin propiedades, y opcionalmente la pone en un grupo económico. El equipo elige el cliente con `clienteId`; un cliente crea siempre en el suyo.",
    request: { body: { content: { "application/json": { schema: DuenoNuevo } }, required: true } },
    responses: { 201: json(DuenoEntidad, "La entidad creada."), ...errores(400, 401, 403) },
  }),
  async (c) => {
    const quien = c.get("quien");
    exigirEscritura(quien);
    const entrada = c.req.valid("json");
    const organizationId = await espacioParaCrear(quien, entrada.clienteId);
    if (entrada.grupoId) await exigirGrupoDe(organizationId, entrada.grupoId);
    const creado = await db.owner.create({
      data: { organizationId, nombre: entrada.nombre, rut: entrada.rut, tipo: entrada.tipo, grupoId: entrada.grupoId ?? null },
      include: INCLUIR_GRUPO,
    });
    return c.json(duenoDe(creado), 201);
  },
);

documentos.openapi(
  createRoute({
    method: "patch",
    path: "/duenos/{id}",
    tags: ["Dueños"],
    summary: "Cambiar una entidad dueña",
    description: "Cambia sus datos o la pasa a otro grupo económico (`grupoId`; en `null` la saca de su grupo).",
    request: { params: ParamId, body: { content: { "application/json": { schema: DuenoCambios } }, required: true } },
    responses: { 200: json(DuenoEntidad, "La entidad con sus datos nuevos."), ...errores(400, 401, 403, 404) },
  }),
  async (c) => {
    const quien = c.get("quien");
    exigirEscritura(quien);
    const cambios = c.req.valid("json");
    const dueno = await db.owner.findUnique({ where: { id: c.req.valid("param").id } });
    const organizationId = await espacioParaEscribirEn(quien, dueno?.organizationId);
    if (cambios.grupoId) await exigirGrupoDe(organizationId, cambios.grupoId);
    const actualizado = await db.owner.update({
      where: { id: dueno!.id },
      data: { nombre: cambios.nombre, rut: cambios.rut, tipo: cambios.tipo, grupoId: cambios.grupoId },
      include: INCLUIR_GRUPO,
    });
    return c.json(duenoDe(actualizado), 200);
  },
);

documentos.openapi(
  createRoute({
    method: "post",
    path: "/grupos",
    tags: ["Dueños"],
    summary: "Crear un grupo económico",
    description: "Crea un grupo económico vacío (la familia o persona que controla varias entidades); después se le asignan entidades con `PATCH /duenos/{id}`.",
    request: { body: { content: { "application/json": { schema: GrupoNuevo } }, required: true } },
    responses: { 201: json(DuenoGrupo, "El grupo creado."), ...errores(400, 401, 403) },
  }),
  async (c) => {
    const quien = c.get("quien");
    exigirEscritura(quien);
    const entrada = c.req.valid("json");
    const organizationId = await espacioParaCrear(quien, entrada.clienteId);
    const grupo = await db.grupo.create({ data: { organizationId, nombre: entrada.nombre, rut: entrada.rut?.trim() || null } });
    return c.json({ id: grupo.id, clienteId: grupo.organizationId, nombre: grupo.nombre, rut: grupo.rut, entidades: 0 }, 201);
  },
);

documentos.openapi(
  createRoute({
    method: "delete",
    path: "/grupos/{id}",
    tags: ["Dueños"],
    summary: "Borrar un grupo económico",
    description: "Borra el grupo. Sus entidades no se borran: quedan sin grupo.",
    request: { params: ParamId },
    responses: { 204: sinContenido, ...errores(401, 403, 404) },
  }),
  async (c) => {
    const quien = c.get("quien");
    exigirEscritura(quien);
    const grupo = await db.grupo.findUnique({ where: { id: c.req.valid("param").id } });
    await espacioParaEscribirEn(quien, grupo?.organizationId);
    await db.grupo.delete({ where: { id: grupo!.id } });
    return c.body(null, 204);
  },
);

// ---------------------------------------------------------------------------
// Los dueños de una propiedad (copropiedad)
// ---------------------------------------------------------------------------

const INCLUIR_DUENO = { owner: { include: INCLUIR_GRUPO } } as const;

documentos.openapi(
  createRoute({
    method: "get",
    path: "/propiedades/{id}/duenos",
    tags: ["Dueños"],
    summary: "Dueños de una propiedad",
    description: "Quiénes son los dueños de la propiedad y qué porcentaje tiene cada uno.",
    request: { params: ParamId },
    responses: { 200: json(z.array(PropiedadDueno), "Los dueños con su porcentaje."), ...errores(401, 404) },
  }),
  async (c) => {
    const propiedad = await legible(c.get("quien"), await db.property.findUnique({ where: { id: c.req.valid("param").id } }));
    const lista = await db.propertyOwner.findMany({
      where: { propertyId: propiedad.id },
      include: INCLUIR_DUENO,
      orderBy: { porcentaje: "desc" },
    });
    return c.json(lista.map(propiedadDuenoDe), 200);
  },
);

documentos.openapi(
  createRoute({
    method: "post",
    path: "/propiedades/{id}/duenos",
    tags: ["Dueños"],
    summary: "Agregar un dueño a una propiedad",
    description:
      "Agrega un dueño con su porcentaje. Puede ser una entidad que ya existe (`duenoId`, del mismo cliente) o una nueva (`nombre`, `rut` y `tipo`): así una misma sociedad no se duplica entre propiedades. Si esa entidad ya figura en la propiedad, responde 409.",
    request: { params: ParamId, body: { content: { "application/json": { schema: PropiedadDuenoNuevo } }, required: true } },
    responses: { 201: json(PropiedadDueno, "El dueño agregado."), ...errores(400, 401, 403, 404, 409) },
  }),
  async (c) => {
    const quien = c.get("quien");
    exigirEscritura(quien);
    const { id } = c.req.valid("param");
    const entrada = c.req.valid("json");
    const propiedad = await db.property.findUnique({ where: { id } });
    const organizationId = await espacioParaEscribirEn(quien, propiedad?.organizationId);

    const porcentaje = Number(entrada.porcentaje);
    if (!(porcentaje > 0 && porcentaje <= 100)) {
      throw new ErrorApi(400, "Revisa los datos enviados.", { porcentaje: "Debe ser un número entre 0 y 100." });
    }

    let duenoId: string;
    if (entrada.duenoId) {
      const existente = await db.owner.findFirst({ where: { id: entrada.duenoId, organizationId }, select: { id: true } });
      if (!existente) throw new ErrorApi(400, "Revisa los datos enviados.", { duenoId: "No se encontró esa entidad." });
      duenoId = existente.id;
    } else {
      const faltan: Record<string, string> = {};
      if (!entrada.nombre) faltan.nombre = "El nombre es obligatorio.";
      if (!entrada.rut) faltan.rut = "El RUT es obligatorio.";
      if (!entrada.tipo) faltan.tipo = "Elige persona o sociedad.";
      if (Object.keys(faltan).length > 0) throw new ErrorApi(400, "Manda `duenoId` o los datos de la entidad nueva.", faltan);
      duenoId = (
        await db.owner.create({ data: { organizationId, nombre: entrada.nombre!, rut: entrada.rut!, tipo: entrada.tipo! } })
      ).id;
    }

    const repetido = await db.propertyOwner.findUnique({
      where: { propertyId_ownerId: { propertyId: id, ownerId: duenoId } },
      select: { id: true },
    });
    if (repetido) throw new ErrorApi(409, "Esa entidad ya figura como dueña de esta propiedad.");

    const creada = await db.propertyOwner.create({
      data: { organizationId, propertyId: id, ownerId: duenoId, porcentaje: entrada.porcentaje },
      include: INCLUIR_DUENO,
    });
    return c.json(propiedadDuenoDe(creada), 201);
  },
);

documentos.openapi(
  createRoute({
    method: "delete",
    path: "/propiedades/{id}/duenos/{relacionId}",
    tags: ["Dueños"],
    summary: "Quitar un dueño de una propiedad",
    description: "Quita al dueño de la propiedad (la entidad sigue existiendo). `relacionId` es el `id` que trae cada dueño en la lista de la propiedad.",
    request: { params: z.object({ id: Id, relacionId: Id }) },
    responses: { 204: sinContenido, ...errores(401, 403, 404) },
  }),
  async (c) => {
    const quien = c.get("quien");
    exigirEscritura(quien);
    const { id, relacionId } = c.req.valid("param");
    const propiedad = await db.property.findUnique({ where: { id } });
    await espacioParaEscribirEn(quien, propiedad?.organizationId);
    const { count } = await db.propertyOwner.deleteMany({ where: { id: relacionId, propertyId: id } });
    if (count === 0) throw new ErrorApi(404, "No se encontró ese dueño en la propiedad.");
    return c.body(null, 204);
  },
);
