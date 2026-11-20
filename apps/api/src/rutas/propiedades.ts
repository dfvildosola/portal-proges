// Rutas de propiedades y su ficha clínica (pieza C).
//
// Aquí: la lista, crear, cambiar y borrar una propiedad; la ficha en una llamada; el historial;
// las reparaciones; y lo que cuelga de la propiedad (unidades anexas y avalúos). Los documentos y
// los dueños están en documentos.ts, y los vencimientos en vencimientos.ts.
//
// Cada ruta solo lee, llama y responde: las reglas están en dominio/ficha/. Permisos primero:
// toda lectura filtra por espaciosQueLee (o revisa con legible), y toda escritura pasa por
// exigirEscritura y espacioParaEscribirEn (o espacioParaCrear). Lo que sale hacia un dueño o una
// llave va recortado (esDueno) con las funciones de dominio/ficha/.
import { createRoute, z } from "@hono/zod-openapi";
import { db } from "@proges/db";
import {
  FichaReparaciones,
  FichaResumen,
  HistorialConsulta,
  HistorialPagina,
  Id,
  PropiedadAvaluo,
  PropiedadAvaluoNuevo,
  PropiedadCambios,
  PropiedadDatos,
  PropiedadNueva,
  PropiedadUnidad,
  PropiedadUnidadNueva,
  PropiedadesConsulta,
  PropiedadesPagina,
} from "@proges/contrato";
import { nuevoRouter } from "../entorno";
import type { Drive } from "../integraciones/tipos";
import { ErrorApi } from "../errores";
import { esDueno, espacioParaCrear, espacioParaEscribirEn, espaciosQueLee, exigirEquipo, exigirEscritura, legible } from "../permisos";
import { esIdDeArchivo, idDeCarpeta } from "../integraciones/drive";
import { borrarPdf } from "../dominio/comun/pdf-drive";
import { hoyChile } from "../util/fechas";
import { camposDeLaEntrada, problemaDeMonto, validarPropiedad } from "../dominio/ficha/entrada";
import { fichaResumen, historialDe, listarPropiedades, reparacionesDe } from "../dominio/ficha/lectura";
import { filtrarHistorial } from "../dominio/ficha/historial";
import { avaluoDe, datosDePropiedad, unidadDe } from "../dominio/ficha/recorte";
import { errores, json } from "./ayuda";

export const propiedades = nuevoRouter();

const ParamId = z.object({ id: Id });
const sinContenido = { description: "Hecho. No devuelve nada." };

// La propiedad que se lee: 404 si no existe o es de otro cliente.
async function propiedadLegible(quien: Parameters<typeof legible>[0], id: string) {
  return legible(quien, await db.property.findUnique({ where: { id } }));
}

// La propiedad que se toca: 403 a una llave, 404 si no existe o es de otro cliente.
async function propiedadEscribible(quien: Parameters<typeof legible>[0], id: string) {
  const propiedad = await db.property.findUnique({ where: { id } });
  await espacioParaEscribirEn(quien, propiedad?.organizationId);
  return propiedad!;
}

// Lo que la persona pegó (el enlace de la carpeta o su id) como id de carpeta, revisado contra
// Drive. Solo el equipo la enlaza: un cliente no decide dónde viven los archivos de Proges.
async function carpetaEnlazable(quien: Parameters<typeof legible>[0], drive: Drive, pegado: string): Promise<string> {
  exigirEquipo(quien);
  const id = idDeCarpeta(pegado);
  if (!id) {
    const mensaje = "Eso no parece una carpeta de Drive: pega el enlace de la carpeta o su id.";
    throw new ErrorApi(400, mensaje, { driveCarpetaId: mensaje });
  }
  let revision: Awaited<ReturnType<Drive["comprobarCarpeta"]>>;
  try {
    revision = await drive.comprobarCarpeta(id);
  } catch (e) {
    console.error("[api] No se pudo revisar la carpeta de Drive", e);
    throw new ErrorApi(502, `No se pudo revisar la carpeta en Drive: ${e instanceof Error ? e.message : "error desconocido"}`);
  }
  if (!revision.ok) throw new ErrorApi(400, revision.motivo, { driveCarpetaId: revision.motivo });
  return id;
}

// ---------------------------------------------------------------------------
// La lista y el CRUD
// ---------------------------------------------------------------------------

propiedades.openapi(
  createRoute({
    method: "get",
    path: "/propiedades",
    tags: ["Propiedades"],
    summary: "Lista de propiedades",
    description:
      "Las propiedades que puedes ver, ordenadas por comuna y dirección. Cada una trae cuántos servicios tiene en curso, el «esperando a» más antiguo y lo último que pasó, para saber dónde hay trabajo. El equipo ve las de todos los clientes (y puede filtrar con `cliente`); un cliente o una llave, solo las suyas.",
    request: { query: PropiedadesConsulta },
    responses: { 200: json(PropiedadesPagina, "Una página de propiedades."), ...errores(400, 401) },
  }),
  async (c) => {
    const quien = c.get("quien");
    const consulta = c.req.valid("query");
    const orgIds = await espaciosQueLee(quien, consulta.cliente);
    const { items, total } = await listarPropiedades(orgIds, consulta, esDueno(quien), hoyChile());
    return c.json({ items, paginacion: { pagina: consulta.pagina, porPagina: consulta.porPagina, total } }, 200);
  },
);

propiedades.openapi(
  createRoute({
    method: "post",
    path: "/propiedades",
    tags: ["Propiedades"],
    summary: "Crear una propiedad",
    description:
      "Crea una propiedad. El equipo elige el cliente con `clienteId`; un cliente crea siempre en el suyo (lo que mande en `clienteId` se ignora). Una llave de la API no puede crear.",
    request: { body: { content: { "application/json": { schema: PropiedadNueva } }, required: true } },
    responses: { 201: json(PropiedadDatos, "La propiedad creada."), ...errores(400, 401, 403) },
  }),
  async (c) => {
    const quien = c.get("quien");
    const persona = exigirEscritura(quien);
    const entrada = c.req.valid("json");
    const organizationId = await espacioParaCrear(quien, entrada.clienteId);
    validarPropiedad(entrada, hoyChile());
    const creada = await db.property.create({
      data: {
        ...camposDeLaEntrada(entrada),
        organizationId,
        tipo: entrada.tipo,
        direccion: entrada.direccion,
        comuna: entrada.comuna,
        region: entrada.region,
        modificadoPorId: persona.usuario.id,
      },
    });
    return c.json(datosDePropiedad(creada), 201);
  },
);

propiedades.openapi(
  createRoute({
    method: "patch",
    path: "/propiedades/{id}",
    tags: ["Propiedades"],
    summary: "Cambiar los datos de una propiedad",
    description:
      "Cambia los datos de la ficha: dirección, estado, valor comercial, compra, deuda y demás. Solo se cambia lo que se manda; un bloque de plata (`valorComercial`, `compra`, `deuda`) se manda entero, y mandarlo en `null` lo borra. Queda anotado quién guardó por última vez. Con `driveCarpetaId` (solo el equipo) se enlaza la carpeta de Drive de la propiedad: se manda el enlace o el id, y la API comprueba que la cuenta de servicio de Proges la puede abrir; si no, responde 400 diciendo que hay que compartirla con su correo. Una llave de la API no puede.",
    request: {
      params: ParamId,
      body: { content: { "application/json": { schema: PropiedadCambios } }, required: true },
    },
    responses: { 200: json(PropiedadDatos, "La propiedad con sus datos nuevos."), ...errores(400, 401, 403, 404, 502) },
  }),
  async (c) => {
    const quien = c.get("quien");
    const persona = exigirEscritura(quien);
    const { id } = c.req.valid("param");
    const cambios = c.req.valid("json");
    const propiedad = await propiedadEscribible(quien, id);
    validarPropiedad(cambios, hoyChile());
    // La carpeta de Drive se enlaza solo si es del equipo y la cuenta de servicio la puede abrir.
    const driveCarpetaId =
      cambios.driveCarpetaId === undefined ? undefined : await carpetaEnlazable(quien, c.get("dep").drive, cambios.driveCarpetaId);
    const actualizada = await db.property.update({
      where: { id: propiedad.id },
      data: {
        ...camposDeLaEntrada(cambios),
        ...(driveCarpetaId === undefined ? {} : { driveCarpetaId }),
        modificadoPorId: persona.usuario.id,
      },
    });
    return c.json(datosDePropiedad(actualizada), 200);
  },
);

propiedades.openapi(
  createRoute({
    method: "delete",
    path: "/propiedades/{id}",
    tags: ["Propiedades"],
    summary: "Borrar una propiedad",
    description:
      "Borra una propiedad y lo suyo (documentos, contratos, cuentas) y manda los PDF de sus documentos a la papelera de Drive. Si tiene servicios no se puede: borrarla se llevaría su historial. En ese caso hay que cancelar sus servicios en vez de borrarla.",
    request: { params: ParamId },
    responses: { 204: sinContenido, ...errores(401, 403, 404, 409) },
  }),
  async (c) => {
    const quien = c.get("quien");
    exigirEscritura(quien);
    const { id } = c.req.valid("param");
    const propiedad = await propiedadEscribible(quien, id);
    const servicios = await db.servicioEnCurso.count({ where: { propertyId: propiedad.id } });
    if (servicios > 0) {
      throw new ErrorApi(409, "Esta propiedad tiene servicios con historial y no se puede borrar. Cancela sus servicios en vez de borrarla.");
    }
    // Las fotos no hay que mirarlas: cuelgan de notas y partidas, que cuelgan de servicios, y con
    // servicios no se llega hasta aquí. Quedan los PDF de los documentos, que se borran en cascada.
    const documentos = await db.document.findMany({ where: { propertyId: propiedad.id }, select: { id: true, blobKey: true } });
    // Primero la base y después la papelera, igual que en DELETE /documentos/{id}: si Drive falla,
    // lo peor es un archivo suelto en la papelera de Drive (borrarPdf lo anota con su id para
    // limpiarlo a mano), y no una propiedad a medio borrar con documentos que apuntan a un
    // archivo que ya no está.
    await db.property.delete({ where: { id: propiedad.id } });
    const { drive } = c.get("dep");
    await Promise.all(
      documentos
        .filter((d) => esIdDeArchivo(d.blobKey))
        .map((d) => borrarPdf(drive, d.blobKey, { documentoId: d.id, propiedadId: propiedad.id })),
    );
    return c.body(null, 204);
  },
);

// ---------------------------------------------------------------------------
// La ficha clínica
// ---------------------------------------------------------------------------

propiedades.openapi(
  createRoute({
    method: "get",
    path: "/propiedades/{id}",
    tags: ["Propiedades"],
    summary: "La ficha de una propiedad",
    description:
      "El resumen de la ficha en una sola llamada: los datos, las cifras (servicios desde que llegó y lo cobrado al dueño en reparaciones; solo para el equipo, también el costo de los maestros y el margen), las alertas (documentos que faltan o vencen, contribuciones por vencer), los servicios en curso con a quién se espera, y los últimos 4 hechos del historial.",
    request: { params: ParamId },
    responses: { 200: json(FichaResumen, "La ficha de la propiedad."), ...errores(401, 404) },
  }),
  async (c) => {
    const quien = c.get("quien");
    const propiedad = await propiedadLegible(quien, c.req.valid("param").id);
    return c.json(await fichaResumen(propiedad, esDueno(quien), hoyChile()), 200);
  },
);

propiedades.openapi(
  createRoute({
    method: "get",
    path: "/propiedades/{id}/historial",
    tags: ["Propiedades"],
    summary: "El historial de una propiedad",
    description:
      "Todo lo que ha pasado en la propiedad en una sola línea de tiempo, de lo más nuevo a lo más antiguo: servicios abiertos y cerrados, notas de la bitácora, cambios de precio y de «esperando a», visitas, ofertas, documentos subidos, presupuestos aprobados y recepciones de partidas. Con `tipo` se filtra: reparaciones, papeles, visitas o venta-arriendo. Para un dueño o una llave salen solo las notas marcadas para el dueño, sin nombres de interesados ni de quien ofertó, sin plata de los maestros y sin las ofertas que Proges aún no le mostró.",
    request: { params: ParamId, query: HistorialConsulta },
    responses: { 200: json(HistorialPagina, "Una página del historial."), ...errores(400, 401, 404) },
  }),
  async (c) => {
    const quien = c.get("quien");
    const propiedad = await propiedadLegible(quien, c.req.valid("param").id);
    const { tipo, pagina, porPagina } = c.req.valid("query");
    const todos = filtrarHistorial(await historialDe(propiedad.id, esDueno(quien)), tipo);
    const items = todos.slice((pagina - 1) * porPagina, pagina * porPagina);
    return c.json({ items, paginacion: { pagina, porPagina, total: todos.length } }, 200);
  },
);

propiedades.openapi(
  createRoute({
    method: "get",
    path: "/propiedades/{id}/reparaciones",
    tags: ["Propiedades"],
    summary: "Las reparaciones de una propiedad",
    description:
      "Cada obra (servicio de tipo obra) con lo cobrado al dueño (la orden de Odoo) y sus partidas: recinto, qué se hizo, recepción y cuántas fotos. Trae también el total cobrado por recinto. Solo para el equipo, cada obra suma el costo aprobado a los maestros, el margen y los días planificados contra los reales. Un dueño o una llave ven solo lo cobrado y las partidas.",
    request: { params: ParamId },
    responses: { 200: json(FichaReparaciones, "Las obras de la propiedad."), ...errores(401, 404) },
  }),
  async (c) => {
    const quien = c.get("quien");
    const propiedad = await propiedadLegible(quien, c.req.valid("param").id);
    return c.json(await reparacionesDe(propiedad.id, esDueno(quien), hoyChile()), 200);
  },
);

// ---------------------------------------------------------------------------
// Unidades anexas (estacionamientos y bodegas)
// ---------------------------------------------------------------------------

propiedades.openapi(
  createRoute({
    method: "get",
    path: "/propiedades/{id}/unidades",
    tags: ["Propiedades"],
    summary: "Unidades anexas de una propiedad",
    description: "Los estacionamientos y bodegas que se administran junto a la propiedad.",
    request: { params: ParamId },
    responses: { 200: json(z.array(PropiedadUnidad), "Las unidades anexas."), ...errores(401, 404) },
  }),
  async (c) => {
    const propiedad = await propiedadLegible(c.get("quien"), c.req.valid("param").id);
    const unidades = await db.propertyUnit.findMany({
      where: { propertyId: propiedad.id },
      orderBy: [{ tipo: "asc" }, { numero: "asc" }],
    });
    return c.json(unidades.map(unidadDe), 200);
  },
);

propiedades.openapi(
  createRoute({
    method: "post",
    path: "/propiedades/{id}/unidades",
    tags: ["Propiedades"],
    summary: "Agregar una unidad anexa",
    description: "Agrega un estacionamiento o una bodega a la propiedad. Su ROL y su avalúo (en pesos) son opcionales.",
    request: { params: ParamId, body: { content: { "application/json": { schema: PropiedadUnidadNueva } }, required: true } },
    responses: { 201: json(PropiedadUnidad, "La unidad creada."), ...errores(400, 401, 403, 404) },
  }),
  async (c) => {
    const quien = c.get("quien");
    exigirEscritura(quien);
    const propiedad = await propiedadEscribible(quien, c.req.valid("param").id);
    const entrada = c.req.valid("json");
    const problema = entrada.avaluoFiscal ? problemaDeMonto(entrada.avaluoFiscal) : null;
    if (problema) throw new ErrorApi(400, "Revisa los datos enviados.", { avaluoFiscal: problema });
    const unidad = await db.propertyUnit.create({
      data: {
        organizationId: propiedad.organizationId,
        propertyId: propiedad.id,
        tipo: entrada.tipo,
        numero: entrada.numero,
        rolSII: entrada.rolSII?.trim() || null,
        avaluoFiscal: entrada.avaluoFiscal ?? null,
      },
    });
    return c.json(unidadDe(unidad), 201);
  },
);

propiedades.openapi(
  createRoute({
    method: "delete",
    path: "/propiedades/{id}/unidades/{unidadId}",
    tags: ["Propiedades"],
    summary: "Quitar una unidad anexa",
    request: { params: z.object({ id: Id, unidadId: Id }) },
    responses: { 204: sinContenido, ...errores(401, 403, 404) },
  }),
  async (c) => {
    const quien = c.get("quien");
    exigirEscritura(quien);
    const { id, unidadId } = c.req.valid("param");
    const propiedad = await propiedadEscribible(quien, id);
    const { count } = await db.propertyUnit.deleteMany({ where: { id: unidadId, propertyId: propiedad.id } });
    if (count === 0) throw new ErrorApi(404, "No se encontró la unidad.");
    return c.body(null, 204);
  },
);

// ---------------------------------------------------------------------------
// Avalúos fiscales (uno por año)
// ---------------------------------------------------------------------------

propiedades.openapi(
  createRoute({
    method: "get",
    path: "/propiedades/{id}/avaluos",
    tags: ["Propiedades"],
    summary: "Avalúos fiscales de una propiedad",
    description: "El historial de avalúos fiscales, uno por año, del más nuevo al más antiguo. Sirve para ver cuánto se reajustó entre períodos.",
    request: { params: ParamId },
    responses: { 200: json(z.array(PropiedadAvaluo), "Los avalúos."), ...errores(401, 404) },
  }),
  async (c) => {
    const propiedad = await propiedadLegible(c.get("quien"), c.req.valid("param").id);
    const avaluos = await db.propertyAssessment.findMany({ where: { propertyId: propiedad.id }, orderBy: { anio: "desc" } });
    return c.json(avaluos.map(avaluoDe), 200);
  },
);

propiedades.openapi(
  createRoute({
    method: "post",
    path: "/propiedades/{id}/avaluos",
    tags: ["Propiedades"],
    summary: "Anotar el avalúo de un año",
    description: "Anota el avalúo fiscal (en pesos) de un año. Si ese año ya tiene avalúo, responde 409.",
    request: { params: ParamId, body: { content: { "application/json": { schema: PropiedadAvaluoNuevo } }, required: true } },
    responses: { 201: json(PropiedadAvaluo, "El avalúo creado."), ...errores(400, 401, 403, 404, 409) },
  }),
  async (c) => {
    const quien = c.get("quien");
    exigirEscritura(quien);
    const propiedad = await propiedadEscribible(quien, c.req.valid("param").id);
    const entrada = c.req.valid("json");
    const problema = problemaDeMonto(entrada.valor);
    if (problema) throw new ErrorApi(400, "Revisa los datos enviados.", { valor: problema });
    const repetido = await db.propertyAssessment.findUnique({
      where: { propertyId_anio: { propertyId: propiedad.id, anio: entrada.anio } },
      select: { id: true },
    });
    if (repetido) throw new ErrorApi(409, `Ya existe un avalúo para el año ${entrada.anio}.`);
    const avaluo = await db.propertyAssessment.create({
      data: { organizationId: propiedad.organizationId, propertyId: propiedad.id, anio: entrada.anio, valor: entrada.valor },
    });
    return c.json(avaluoDe(avaluo), 201);
  },
);

propiedades.openapi(
  createRoute({
    method: "delete",
    path: "/propiedades/{id}/avaluos/{avaluoId}",
    tags: ["Propiedades"],
    summary: "Quitar un avalúo",
    request: { params: z.object({ id: Id, avaluoId: Id }) },
    responses: { 204: sinContenido, ...errores(401, 403, 404) },
  }),
  async (c) => {
    const quien = c.get("quien");
    exigirEscritura(quien);
    const { id, avaluoId } = c.req.valid("param");
    const propiedad = await propiedadEscribible(quien, id);
    const { count } = await db.propertyAssessment.deleteMany({ where: { id: avaluoId, propertyId: propiedad.id } });
    if (count === 0) throw new ErrorApi(404, "No se encontró el avalúo.");
    return c.body(null, 204);
  },
);
