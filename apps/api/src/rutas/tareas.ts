// Rutas de tareas (qué, quién y para cuándo). Las escribe la pieza D.
//
// Una tarea es lo mínimo (ADR 0013): qué hay que hacer, quién, para cuándo y si está hecha. Sin
// estados intermedios. Todo es del equipo: la lectura filtra por espaciosQueLee y cada escritura
// toma el espacio de la tarea o del servicio donde vive, nunca de la petición.
import { createRoute, z } from "@hono/zod-openapi";
import { db } from "@proges/db";
import { Id, Tarea, TareaCambiar, TareaNueva, TareasConsulta, TareasRespuesta } from "@proges/contrato";
import { nuevoRouter } from "../entorno";
import { ErrorApi } from "../errores";
import { espacioParaEscribirEn, espaciosQueLee, exigirEquipo } from "../permisos";
import { aFechaISO } from "../util/al-contrato";
import { hoyChile } from "../util/fechas";
import { equipoActivo, tareasAbiertas } from "../dominio/trabajo/consultas";
import { exigirResponsableValido } from "../dominio/trabajo/pedidos";
import { tareaAContrato } from "../dominio/trabajo/recorte";
import { seleccionTarea } from "../dominio/trabajo/selecciones";
import { cargaDelEquipo, clasificarPorDia, clasificarPorSemana, fechaDesdeISO, porVencimiento } from "../dominio/trabajo/tareas";
import { errores, json } from "./ayuda";

export const tareas = nuevoRouter();

const ParamId = z.object({ id: Id });

// ---------------------------------------------------------------------------
// Leer
// ---------------------------------------------------------------------------

tareas.openapi(
  createRoute({
    method: "get",
    path: "/tareas",
    tags: ["Tareas"],
    summary: "Las tareas abiertas, según la vista",
    description:
      "Solo el equipo. vista=hoy: mis tareas (atrasadas, de hoy y de mañana, con su propiedad y servicio). vista=equipo: la carga de cada persona (abiertas, atrasadas y de esta semana). vista=semana: las tareas de cada persona y las que no tiene nadie, para Repartir. Una tarea de un servicio ya cerrado no cuenta.",
    request: { query: TareasConsulta },
    responses: { 200: json(TareasRespuesta, "Las tareas, agrupadas."), ...errores(400, 401, 403) },
  }),
  async (c) => {
    const quien = c.get("quien");
    const persona = exigirEquipo(quien);
    const { vista, cliente } = c.req.valid("query");
    const hoy = hoyChile();
    const orgIds = await espaciosQueLee(quien, cliente);

    if (vista === "hoy") {
      const mias = await tareasAbiertas(orgIds, { responsableId: persona.usuario.id });
      const g = clasificarPorDia(mias, hoy);
      return c.json(
        {
          vista: "hoy" as const,
          fecha: aFechaISO(hoy),
          atrasadas: g.atrasadas.map((t) => t.contrato),
          hoy: g.hoy.map((t) => t.contrato),
          manana: g.manana.map((t) => t.contrato),
          masAdelante: g.masAdelante.length,
        },
        200,
      );
    }

    const [abiertas, equipo] = await Promise.all([tareasAbiertas(orgIds), equipoActivo()]);
    if (vista === "equipo") {
      return c.json({ vista: "equipo" as const, personas: cargaDelEquipo(equipo, abiertas, hoy) }, 200);
    }
    return c.json(
      {
        vista: "semana" as const,
        personas: equipo.map((p) => {
          const g = clasificarPorSemana(
            abiertas.filter((t) => t.responsableId === p.id),
            hoy,
          );
          return {
            persona: p,
            atrasadas: g.atrasadas.map((t) => t.contrato),
            estaSemana: g.estaSemana.map((t) => t.contrato),
          };
        }),
        // Las que no tiene nadie, todas (las que vencen antes, primero): es lo que Repartir tiene que repartir.
        sinResponsable: abiertas
          .filter((t) => t.responsableId === null)
          .sort(porVencimiento)
          .map((t) => t.contrato),
      },
      200,
    );
  },
);

// ---------------------------------------------------------------------------
// Agregar
// ---------------------------------------------------------------------------

tareas.openapi(
  createRoute({
    method: "post",
    path: "/servicios/{id}/tareas",
    tags: ["Tareas"],
    summary: "Agregar una tarea a un servicio",
    description:
      "Solo el equipo. Qué hay que hacer, quién (una persona del equipo, o nadie) y para cuándo. Un servicio ya cerrado no recibe tareas nuevas (409).",
    request: { params: ParamId, body: { content: { "application/json": { schema: TareaNueva } }, required: true } },
    responses: { 201: json(Tarea, "La tarea creada."), ...errores(400, 401, 403, 404, 409) },
  }),
  async (c) => {
    const quien = c.get("quien");
    const persona = exigirEquipo(quien);
    const { id } = c.req.valid("param");
    const datos = c.req.valid("json");

    const servicio = await db.servicioEnCurso.findUnique({ where: { id }, select: { organizationId: true, estado: true } });
    const orgId = await espacioParaEscribirEn(quien, servicio?.organizationId);
    if (!servicio) throw new ErrorApi(404, "No se encontró lo que buscas.");
    if (servicio.estado !== "ABIERTO") throw new ErrorApi(409, "Este servicio ya está cerrado.");
    await exigirResponsableValido(datos.responsableId);

    const creada = await db.tarea.create({
      data: {
        organizationId: orgId,
        servicioEnCursoId: id,
        que: datos.que,
        responsableId: datos.responsableId ?? null,
        vence: datos.vence ? fechaDesdeISO(datos.vence) : null,
        creadaPorId: persona.usuario.id,
      },
      select: seleccionTarea,
    });
    return c.json(tareaAContrato(creada), 201);
  },
);

// ---------------------------------------------------------------------------
// Cambiar: editar, marcar hecha o deshacer
// ---------------------------------------------------------------------------

tareas.openapi(
  createRoute({
    method: "patch",
    path: "/tareas/{id}",
    tags: ["Tareas"],
    summary: "Cambiar una tarea o marcarla hecha",
    description:
      "Solo el equipo. Cambia qué, quién o para cuándo (solo si no está hecha), y/o la marca hecha: true la marca, false la deshace. Responde 409 si otra persona la cambió justo antes, si es la tarea «Revisar y repartir» de un pedido (se cierra aceptando o rechazando el pedido) o si su servicio ya está cerrado.",
    request: { params: ParamId, body: { content: { "application/json": { schema: TareaCambiar } }, required: true } },
    responses: { 200: json(Tarea, "La tarea ya cambiada."), ...errores(400, 401, 403, 404, 409) },
  }),
  async (c) => {
    const quien = c.get("quien");
    const persona = exigirEquipo(quien);
    const { id } = c.req.valid("param");
    const cambio = c.req.valid("json");

    const previa = await db.tarea.findUnique({
      where: { id },
      select: { organizationId: true, esRevision: true, servicioEnCurso: { select: { estado: true } } },
    });
    const orgId = await espacioParaEscribirEn(quien, previa?.organizationId);
    // La tarea de revisión de un pedido la cierra el pedido, no una persona a mano.
    if (previa?.esRevision) {
      throw new ErrorApi(409, "Esta tarea se cierra al aceptar o rechazar el pedido en Repartir.");
    }
    if (previa?.servicioEnCurso.estado !== "ABIERTO") {
      throw new ErrorApi(409, "Este servicio ya está cerrado: sus tareas no se cambian.");
    }
    await exigirResponsableValido(cambio.responsableId);

    // El filtro por estado evita pisar el cambio de otra persona: marcar solo sirve si sigue
    // abierta, deshacer solo si sigue hecha, y editar solo si no está hecha.
    const { hecha } = cambio;
    const { count } = await db.tarea.updateMany({
      where: { id, organizationId: orgId, hechaEl: hecha === false ? { not: null } : null },
      data: {
        ...(cambio.que !== undefined ? { que: cambio.que } : {}),
        ...(cambio.responsableId !== undefined ? { responsableId: cambio.responsableId } : {}),
        ...(cambio.vence !== undefined ? { vence: cambio.vence ? fechaDesdeISO(cambio.vence) : null } : {}),
        ...(hecha === true ? { hechaEl: new Date(), hechaPorId: persona.usuario.id } : {}),
        ...(hecha === false ? { hechaEl: null, hechaPorId: null } : {}),
      },
    });
    if (count !== 1) {
      throw new ErrorApi(
        409,
        hecha === false
          ? "Esa tarea ya estaba abierta."
          : hecha === true
            ? "Esa tarea ya estaba hecha."
            : "La tarea ya está hecha: deshazla antes de editarla.",
      );
    }
    const actual = await db.tarea.findUniqueOrThrow({ where: { id }, select: seleccionTarea });
    return c.json(tareaAContrato(actual), 200);
  },
);

// ---------------------------------------------------------------------------
// Borrar
// ---------------------------------------------------------------------------

tareas.openapi(
  createRoute({
    method: "delete",
    path: "/tareas/{id}",
    tags: ["Tareas"],
    summary: "Borrar una tarea",
    description:
      "Solo el equipo. Solo se borra una tarea sin hacer: lo hecho queda como historia del servicio. La tarea «Revisar y repartir» de un pedido no se borra: se resuelve aceptando o rechazando el pedido.",
    request: { params: ParamId },
    responses: { 204: { description: "Borrada." }, ...errores(401, 403, 404, 409) },
  }),
  async (c) => {
    const quien = c.get("quien");
    exigirEquipo(quien);
    const { id } = c.req.valid("param");

    const previa = await db.tarea.findUnique({ where: { id }, select: { organizationId: true, esRevision: true } });
    const orgId = await espacioParaEscribirEn(quien, previa?.organizationId);
    if (previa?.esRevision) {
      throw new ErrorApi(409, "Esta tarea la abrió un pedido: se resuelve aceptándolo o rechazándolo en Pedidos.");
    }
    const { count } = await db.tarea.deleteMany({ where: { id, organizationId: orgId, hechaEl: null } });
    if (count !== 1) throw new ErrorApi(409, "Una tarea hecha no se borra: deshazla antes.");
    return c.body(null, 204);
  },
);
