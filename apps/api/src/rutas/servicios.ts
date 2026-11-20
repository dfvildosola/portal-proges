// Rutas de servicios (lo que Proges hace en una propiedad) y «esperando a». Las escribe la pieza D.
//
// Un servicio, en la base, es un ServicioEnCurso. Cada ruta lee o escribe con las funciones de
// permisos.ts: toda lectura filtra por espaciosQueLee y toda escritura es del equipo y pasa por
// espacioParaEscribirEn (el espacio sale del servicio, nunca de la petición).
import { createRoute, z } from "@hono/zod-openapi";
import { db, ORG_PROGES, type Prisma } from "@proges/db";
import {
  Id,
  ServicioAbrir,
  ServicioCambiar,
  ServicioCerrar,
  ServicioEquipo,
  ServicioFicha,
  ServiciosConsulta,
  ServiciosRespuesta,
  ServiciosSugeridos,
} from "@proges/contrato";
import { nuevoRouter } from "../entorno";
import { ErrorApi } from "../errores";
import { esDueno, espacioParaEscribirEn, espaciosQueLee, exigirEquipo } from "../permisos";
import { hoyChile } from "../util/fechas";
import { tipoUnicoDeFamilia } from "../dominio/trabajo/catalogo";
import { clientesPorId, filasDelTablero } from "../dominio/trabajo/consultas";
import { exigirResponsableValido } from "../dominio/trabajo/pedidos";
import { planearEspera } from "../dominio/trabajo/espera";
import { fichaDelServicio, fichaParaEquipo, SERVICIO_NO_ENCONTRADO, VISIBLE_PARA_DUENO } from "../dominio/trabajo/ficha";
import { filaParaDueno, filaParaEquipo } from "../dominio/trabajo/recorte";
import { seleccionFila } from "../dominio/trabajo/selecciones";
import { agruparTablero } from "../dominio/trabajo/tablero";
import { familiasDelTipo } from "../dominio/trabajo/servicios";
import { errores, json } from "./ayuda";

export const servicios = nuevoRouter();

const ParamId = z.object({ id: Id });

// ---------------------------------------------------------------------------
// Tablero y lista
// ---------------------------------------------------------------------------

servicios.openapi(
  createRoute({
    method: "get",
    path: "/servicios",
    tags: ["Servicios"],
    summary: "El tablero de servicios, o una lista",
    description:
      "vista=tablero (solo el equipo): los servicios abiertos según quién tiene la pelota. NUEVO: vienen de un pedido y nadie los reparte. NOS_TOCA: no se espera a nadie y hay tareas pendientes, o aún no tiene tareas. ESPERANDO: se espera a alguien, con los días que lleva. POR_ENTREGAR: sin espera, con al menos una tarea y todas hechas. vista=lista: una página de servicios; un dueño o una llave ve solo los suyos, sin responsable.",
    request: { query: ServiciosConsulta },
    responses: { 200: json(ServiciosRespuesta, "El tablero o la página de servicios."), ...errores(400, 401, 403) },
  }),
  async (c) => {
    const quien = c.get("quien");
    const q = c.req.valid("query");
    const hoy = hoyChile();

    if (q.vista === "tablero") {
      exigirEquipo(quien);
      const orgIds = await espaciosQueLee(quien, q.cliente);
      const filas = await filasDelTablero(orgIds, { tipo: q.tipo, responsable: q.responsable }, hoy);
      return c.json({ vista: "tablero" as const, ...agruparTablero(filas) }, 200);
    }

    const orgIds = await espaciosQueLee(quien, q.cliente);
    const dueno = esDueno(quien);
    const where: Prisma.ServicioEnCursoWhereInput = {
      organizationId: { in: orgIds },
      ...(q.tipo ? { tipo: q.tipo } : {}),
      ...(q.estado ? { estado: q.estado } : {}),
      ...(q.propiedadId ? { propertyId: q.propiedadId } : {}),
      ...(dueno ? { AND: [VISIBLE_PARA_DUENO] } : {}),
    };
    const [total, filas] = await Promise.all([
      db.servicioEnCurso.count({ where }),
      db.servicioEnCurso.findMany({
        where,
        orderBy: [{ abiertoEl: "desc" }, { id: "asc" }],
        skip: (q.pagina - 1) * q.porPagina,
        take: q.porPagina,
        select: seleccionFila,
      }),
    ]);
    const clienteDe = await clientesPorId(filas.map((f) => f.organizationId));
    const items = filas.map((s) => (dueno ? filaParaDueno(s, hoy) : filaParaEquipo(s, hoy, clienteDe(s.organizationId))));
    return c.json({ vista: "lista" as const, items, paginacion: { pagina: q.pagina, porPagina: q.porPagina, total } }, 200);
  },
);

// ---------------------------------------------------------------------------
// Sugeridos para «Anotar» (va antes de /servicios/{id}: si no, «sugeridos» se tomaría por un id)
// ---------------------------------------------------------------------------

servicios.openapi(
  createRoute({
    method: "get",
    path: "/servicios/sugeridos",
    tags: ["Servicios"],
    summary: "Servicios sugeridos para anotar",
    description:
      "Los servicios abiertos donde la persona tiene tareas que vencen hoy o ya vencieron, los de más tareas primero. «Anotar» los propone para guardar la nota sin tener que buscar.",
    responses: { 200: json(ServiciosSugeridos, "Hasta 10 servicios."), ...errores(401, 403) },
  }),
  async (c) => {
    const quien = c.get("quien");
    const persona = exigirEquipo(quien);
    const hoy = hoyChile();
    const orgIds = await espaciosQueLee(quien);
    const tareas = await db.tarea.findMany({
      where: {
        organizationId: { in: orgIds },
        responsableId: persona.usuario.id,
        hechaEl: null,
        vence: { lte: hoy },
        servicioEnCurso: { estado: "ABIERTO" },
      },
      select: {
        servicioEnCurso: {
          select: {
            id: true,
            organizationId: true,
            tipo: true,
            servicio: { select: { nombre: true } },
            property: { select: { id: true, direccion: true, comuna: true } },
          },
        },
      },
    });
    const cuenta = new Map<string, { s: (typeof tareas)[number]["servicioEnCurso"]; n: number }>();
    for (const t of tareas) {
      const previa = cuenta.get(t.servicioEnCurso.id);
      cuenta.set(t.servicioEnCurso.id, { s: t.servicioEnCurso, n: (previa?.n ?? 0) + 1 });
    }
    const clienteDe = await clientesPorId(tareas.map((t) => t.servicioEnCurso.organizationId));
    const items = [...cuenta.values()]
      .sort((a, b) => b.n - a.n)
      .slice(0, 10)
      .map(({ s, n }) => ({
        id: s.id,
        tipo: s.tipo,
        nombre: s.servicio.nombre,
        propiedad: { id: s.property.id, direccion: s.property.direccion, comuna: s.property.comuna },
        cliente: clienteDe(s.organizationId),
        tareasHoy: n,
      }));
    return c.json({ items }, 200);
  },
);

// ---------------------------------------------------------------------------
// Abrir a mano
// ---------------------------------------------------------------------------

servicios.openapi(
  createRoute({
    method: "post",
    path: "/servicios",
    tags: ["Servicios"],
    summary: "Abrir un servicio a mano",
    description:
      "Solo el equipo. Abre un servicio del catálogo en una propiedad, con responsable y nota opcionales. El tipo se deduce de la familia del catálogo; si esa familia sirve a varios tipos (NV, ADMP, SC) hay que mandarlo.",
    request: { body: { content: { "application/json": { schema: ServicioAbrir } }, required: true } },
    responses: { 201: json(ServicioEquipo, "El servicio abierto."), ...errores(400, 401, 403, 404) },
  }),
  async (c) => {
    const quien = c.get("quien");
    exigirEquipo(quien);
    const datos = c.req.valid("json");

    // El espacio es el de la propiedad, no uno que mande la web.
    const propiedad = await db.property.findUnique({ where: { id: datos.propiedadId }, select: { organizationId: true } });
    const orgId = await espacioParaEscribirEn(quien, propiedad?.organizationId);

    // El servicio del catálogo (de Proges) debe estar activo y ser de una familia que ese tipo ofrece.
    const catalogo = await db.servicio.findFirst({
      where: { id: datos.servicioId, organizationId: ORG_PROGES, activo: true },
      select: { id: true, familia: true },
    });
    if (!catalogo) {
      throw new ErrorApi(400, "El servicio elegido no existe en el catálogo.", { servicioId: "No existe en el catálogo." });
    }
    const tipo = datos.tipo ?? tipoUnicoDeFamilia(catalogo.familia);
    if (!tipo) {
      throw new ErrorApi(400, "Ese servicio sirve a varios tipos: elige cuál.", { tipo: "Elige el tipo de servicio." });
    }
    if (!familiasDelTipo(tipo).includes(catalogo.familia)) {
      throw new ErrorApi(400, "Ese servicio del catálogo no corresponde al tipo elegido.", {
        servicioId: "No corresponde al tipo.",
      });
    }
    await exigirResponsableValido(datos.responsableId);

    const creado = await db.servicioEnCurso.create({
      data: {
        organizationId: orgId,
        propertyId: datos.propiedadId,
        servicioId: catalogo.id,
        tipo,
        responsableId: datos.responsableId ?? null,
        nota: datos.nota ? datos.nota : null,
      },
      select: { id: true },
    });
    return c.json(await fichaParaEquipo(creado.id, hoyChile()), 201);
  },
);

// ---------------------------------------------------------------------------
// La ficha
// ---------------------------------------------------------------------------

servicios.openapi(
  createRoute({
    method: "get",
    path: "/servicios/{id}",
    tags: ["Servicios"],
    summary: "La ficha de un servicio",
    description:
      "El equipo ve todo: datos, «esperando a» con su historial, tareas y la bitácora completa. Un dueño o una llave ve datos, «esperando a» y solo las notas marcadas para el dueño; nunca tareas ni notas internas. Un servicio de otro cliente responde 404.",
    request: { params: ParamId },
    responses: { 200: json(ServicioFicha, "La ficha del servicio."), ...errores(401, 404) },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    return c.json(await fichaDelServicio(c.get("quien"), id, hoyChile()), 200);
  },
);

// ---------------------------------------------------------------------------
// Cambiar responsable y «esperando a»
// ---------------------------------------------------------------------------

servicios.openapi(
  createRoute({
    method: "patch",
    path: "/servicios/{id}",
    tags: ["Servicios"],
    summary: "Cambiar el responsable o a quién se espera",
    description:
      "Solo el equipo. Cada cambio de «esperando a» fija el día de inicio (hoy) y deja un Evento de tipo ESPERA con el valor anterior y el nuevo; null es «nos toca». Esperar a «OTRO» exige el detalle. Un servicio cerrado o todavía «por revisar» responde 409.",
    request: { params: ParamId, body: { content: { "application/json": { schema: ServicioCambiar } }, required: true } },
    responses: { 200: json(ServicioEquipo, "La ficha ya cambiada."), ...errores(400, 401, 403, 404, 409) },
  }),
  async (c) => {
    const quien = c.get("quien");
    const persona = exigirEquipo(quien);
    const { id } = c.req.valid("param");
    const cambio = c.req.valid("json");
    const hoy = hoyChile();

    const s = await db.servicioEnCurso.findUnique({
      where: { id },
      select: {
        organizationId: true,
        estado: true,
        porRevisar: true,
        esperandoA: true,
        esperandoDetalle: true,
        esperandoDesde: true,
      },
    });
    const orgId = await espacioParaEscribirEn(quien, s?.organizationId);
    if (!s) throw new ErrorApi(404, SERVICIO_NO_ENCONTRADO);
    if (s.estado !== "ABIERTO") throw new ErrorApi(409, "Este servicio ya está cerrado.");
    if (s.porRevisar) {
      throw new ErrorApi(409, "Este servicio viene de un pedido: primero acéptalo o recházalo en Pedidos.");
    }

    await exigirResponsableValido(cambio.responsableId);
    const plan = planearEspera(s, { esperandoA: cambio.esperandoA, esperandoDetalle: cambio.esperandoDetalle }, hoy);

    // Todo en una transacción. El filtro `estado: ABIERTO` evita pisar a otra persona que cerró el
    // servicio justo antes: si no actualiza nada, se deshace todo.
    const hecho = await db.$transaction(async (tx) => {
      const { count } = await tx.servicioEnCurso.updateMany({
        where: { id, organizationId: orgId, estado: "ABIERTO" },
        data: {
          ...(cambio.responsableId !== undefined ? { responsableId: cambio.responsableId } : {}),
          ...plan.datos,
        },
      });
      if (count !== 1) return false;
      if (plan.evento) {
        await tx.evento.create({
          data: {
            organizationId: orgId,
            servicioEnCursoId: id,
            tipo: "ESPERA",
            anterior: plan.evento.anterior,
            nuevo: plan.evento.nuevo,
            motivo: plan.evento.motivo,
            autorId: persona.usuario.id,
          },
        });
      }
      return true;
    });
    if (!hecho) throw new ErrorApi(409, "Este servicio ya está cerrado.");
    return c.json(await fichaParaEquipo(id, hoy), 200);
  },
);

// ---------------------------------------------------------------------------
// Cerrar
// ---------------------------------------------------------------------------

servicios.openapi(
  createRoute({
    method: "post",
    path: "/servicios/{id}/cerrar",
    tags: ["Servicios"],
    summary: "Cerrar un servicio",
    description:
      "Solo el equipo. Lo da por terminado o lo cancela, con su motivo. Una obra no se cierra aquí (responde 409): se cierra con el cierre de la obra, que exige todas las partidas recibidas. Un servicio «por revisar» tampoco: primero se acepta o se rechaza el pedido.",
    request: { params: ParamId, body: { content: { "application/json": { schema: ServicioCerrar } }, required: true } },
    responses: { 200: json(ServicioEquipo, "La ficha ya cerrada."), ...errores(400, 401, 403, 404, 409) },
  }),
  async (c) => {
    const quien = c.get("quien");
    exigirEquipo(quien);
    const { id } = c.req.valid("param");
    const { resultado, motivo } = c.req.valid("json");

    const s = await db.servicioEnCurso.findUnique({
      where: { id },
      select: { organizationId: true, tipo: true, estado: true, porRevisar: true },
    });
    const orgId = await espacioParaEscribirEn(quien, s?.organizationId);
    if (!s) throw new ErrorApi(404, SERVICIO_NO_ENCONTRADO);
    if (s.estado !== "ABIERTO") throw new ErrorApi(409, "Este servicio ya está cerrado.");
    if (s.porRevisar) {
      throw new ErrorApi(409, "Este servicio viene de un pedido: primero acéptalo o recházalo en Pedidos.");
    }

    // Una obra (o cualquier servicio con partidas por recinto) se cierra en el cierre de la obra.
    // Un servicio suelto con partidas sin recinto sí se cierra aquí.
    const partidas = await db.partida.count({
      where: {
        servicioEnCursoId: id,
        quitadaEnOdoo: false,
        ...(s.tipo === "OBRA" ? {} : { recinto: { not: null } }),
      },
    });
    if (s.tipo === "OBRA" || partidas > 0) {
      throw new ErrorApi(
        409,
        "Una obra no se cierra aquí: usa el cierre de la obra, con todas sus partidas recibidas.",
      );
    }

    // `estado: ABIERTO` en el filtro: si otra persona lo cerró justo antes, no se pisa.
    const { count } = await db.servicioEnCurso.updateMany({
      where: { id, organizationId: orgId, estado: "ABIERTO" },
      data: { estado: resultado, cerradoEl: new Date(), motivoCierre: motivo },
    });
    if (count !== 1) throw new ErrorApi(409, "Este servicio ya está cerrado.");
    return c.json(await fichaParaEquipo(id, hoyChile()), 200);
  },
);
