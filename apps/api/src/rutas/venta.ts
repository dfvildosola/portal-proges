// Rutas del corretaje: el reporte de venta, visitas, ofertas (y la respuesta del dueño), precio,
// anuncios y sus cifras semanales. Sirven a la venta y a la arriendo-búsqueda.
//
// Cada ruta solo lee, llama al dominio (src/dominio/venta/) y responde. Lo que sale hacia un
// dueño o una llave pasa por dominio/venta/recorte.ts. Las reglas vienen de
// legado/src/app/(app)/propiedades/comercial-actions.ts.
import { createRoute, z } from "@hono/zod-openapi";
import { db, Prisma } from "@proges/db";
import {
  Id,
  FechaISO,
  VentaAnuncio,
  VentaAnuncioCambiar,
  VentaAnuncioCrear,
  VentaCifra,
  VentaCifraAnotar,
  VentaOferta,
  VentaOfertaCambiar,
  VentaOfertaCrear,
  VentaOfertaEquipo,
  VentaOfertaMostrar,
  VentaOfertaResponder,
  VentaPrecioCambiar,
  VentaPrecioRespuesta,
  VentaReporte,
  VentaReporteEquipo,
  VentaVisitaCambiar,
  VentaVisitaCrear,
  VentaVisitaEquipo,
} from "@proges/contrato";
import { nuevoRouter } from "../entorno";
import { ErrorApi } from "../errores";
import { esDueno, espaciosQueLee, exigirCliente, legible } from "../permisos";
import { aMonto } from "../util/al-contrato";
import { hoyChile } from "../util/fechas";
import { visibleParaDueno } from "../dominio/trabajo/ficha";
import { leerDatosDelReporte } from "../dominio/venta/datos";
import {
  anuncioParaEscribir,
  exigirPersonaDelEquipo,
  ofertaParaEscribir,
  servicioParaEscribir,
  visitaParaEscribir,
} from "../dominio/venta/escritura";
import { deFechaISO, esLunes } from "../dominio/venta/fechas";
import {
  anuncioParaContrato,
  cambioDePrecioEquipo,
  cifraParaContrato,
  ofertaParaDueno,
  ofertaParaEquipo,
  reporteParaDueno,
  reporteParaEquipo,
  visitaParaEquipo,
} from "../dominio/venta/recorte";
import {
  estadoTrasRespuesta,
  exigirFechaNoFutura,
  exigirCambioPermitido,
  exigirMontoPositivo,
  exigirServicioAbierto,
  textoTareaRespuesta,
} from "../dominio/venta/reglas";
import { errores, json } from "./ayuda";

export const venta = nuevoRouter();

const TAG = "Corretaje";
const cuerpo = <T extends z.ZodType>(schema: T) => ({ content: { "application/json": { schema } }, required: true });
const SIN_CONTENIDO = { description: "Listo: se borró. No devuelve nada." };
const conId = z.object({ id: Id });
const PERSONA = { select: { id: true, nombre: true } } as const;

// ---------------------------------------------------------------------------
// El reporte
// ---------------------------------------------------------------------------

venta.openapi(
  createRoute({
    method: "get",
    path: "/servicios/{id}/venta",
    tags: [TAG],
    summary: "Reporte de venta de un servicio",
    description:
      "Todo lo que el dueño mira de una venta (o de una búsqueda de arriendo) en una sola llamada: el precio publicado y su historia, los días publicada, las visitas, las consultas (suma de las cifras semanales de los anuncios), las ofertas y la mejor, los anuncios con sus cifras, lo que pasó semana a semana y si Proges espera la respuesta del dueño. " +
      "Para un dueño o una llave el reporte va sin nombres ni contacto de los interesados, sin quién mostró la propiedad, sin quién ofertó, sin notas internas, y solo con las ofertas que Proges ya le mostró. El equipo recibe además todo eso.",
    request: { params: conId },
    responses: {
      200: json(z.union([VentaReporteEquipo, VentaReporte]), "El reporte de venta."),
      ...errores(400, 401, 404),
    },
  }),
  async (c) => {
    const quien = c.get("quien");
    const { id } = c.req.valid("param");
    const datos = await leerDatosDelReporte(id, await espaciosQueLee(quien), esDueno(quien));
    if (!datos) throw new ErrorApi(404, "No se encontró lo que buscas.");
    return c.json(esDueno(quien) ? reporteParaDueno(datos) : reporteParaEquipo(datos), 200);
  },
);

// ---------------------------------------------------------------------------
// Visitas
// ---------------------------------------------------------------------------

venta.openapi(
  createRoute({
    method: "post",
    path: "/servicios/{id}/visitas",
    tags: [TAG],
    summary: "Anotar una visita",
    description:
      "Solo el equipo. Anota que se mostró la propiedad: el día, quién la mostró, el interesado y su contacto, su interés (1 a 5) y un comentario. El servicio tiene que ser de venta o arriendo y estar abierto.",
    request: { params: conId, body: cuerpo(VentaVisitaCrear) },
    responses: { 201: json(VentaVisitaEquipo, "La visita anotada."), ...errores(400, 401, 403, 404, 409) },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const datos = c.req.valid("json");
    const { persona, servicio } = await servicioParaEscribir(c.get("quien"), id);
    const fecha = deFechaISO(datos.fecha);
    exigirFechaNoFutura(fecha, hoyChile(), "fecha");
    const realizadaPorId = datos.realizadaPorId
      ? await exigirPersonaDelEquipo(datos.realizadaPorId, "realizadaPorId")
      : persona.usuario.id;
    const visita = await db.visita.create({
      data: {
        organizationId: servicio.organizationId,
        servicioEnCursoId: servicio.id,
        fecha,
        realizadaPorId,
        interesadoNombre: datos.interesadoNombre || null,
        interesadoContacto: datos.interesadoContacto || null,
        evaluacion: datos.evaluacion ?? null,
        comentario: datos.comentario || null,
      },
      include: { realizadaPor: PERSONA },
    });
    return c.json(visitaParaEquipo(visita), 201);
  },
);

venta.openapi(
  createRoute({
    method: "patch",
    path: "/visitas/{id}",
    tags: [TAG],
    summary: "Corregir una visita",
    description: "Solo el equipo. Se manda solo lo que cambia; un `null` borra el dato.",
    request: { params: conId, body: cuerpo(VentaVisitaCambiar) },
    responses: { 200: json(VentaVisitaEquipo, "La visita corregida."), ...errores(400, 401, 403, 404, 409) },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const datos = c.req.valid("json");
    await visitaParaEscribir(c.get("quien"), id);
    const fecha = datos.fecha ? deFechaISO(datos.fecha) : undefined;
    if (fecha) exigirFechaNoFutura(fecha, hoyChile(), "fecha");
    const realizadaPorId = datos.realizadaPorId
      ? await exigirPersonaDelEquipo(datos.realizadaPorId, "realizadaPorId")
      : undefined;
    const visita = await db.visita.update({
      where: { id },
      data: {
        fecha,
        realizadaPorId,
        interesadoNombre: datos.interesadoNombre === undefined ? undefined : datos.interesadoNombre || null,
        interesadoContacto: datos.interesadoContacto === undefined ? undefined : datos.interesadoContacto || null,
        evaluacion: datos.evaluacion,
        comentario: datos.comentario === undefined ? undefined : datos.comentario || null,
      },
      include: { realizadaPor: PERSONA },
    });
    return c.json(visitaParaEquipo(visita), 200);
  },
);

venta.openapi(
  createRoute({
    method: "delete",
    path: "/visitas/{id}",
    tags: [TAG],
    summary: "Borrar una visita mal anotada",
    description: "Solo el equipo, y solo mientras el servicio está abierto.",
    request: { params: conId },
    responses: { 204: SIN_CONTENIDO, ...errores(401, 403, 404, 409) },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    await visitaParaEscribir(c.get("quien"), id);
    await db.visita.delete({ where: { id } });
    return c.body(null, 204);
  },
);

// ---------------------------------------------------------------------------
// Ofertas
// ---------------------------------------------------------------------------

venta.openapi(
  createRoute({
    method: "post",
    path: "/servicios/{id}/ofertas",
    tags: [TAG],
    summary: "Registrar una oferta recibida",
    description:
      "Solo el equipo. Queda RECIBIDA y el dueño todavía no la ve: se le muestra con `POST /v1/ofertas/{id}/mostrar`.",
    request: { params: conId, body: cuerpo(VentaOfertaCrear) },
    responses: { 201: json(VentaOfertaEquipo, "La oferta registrada."), ...errores(400, 401, 403, 404, 409) },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const datos = c.req.valid("json");
    const { servicio } = await servicioParaEscribir(c.get("quien"), id);
    const hoy = hoyChile();
    const fecha = datos.fecha ? deFechaISO(datos.fecha) : hoy;
    exigirFechaNoFutura(fecha, hoy, "fecha");
    exigirMontoPositivo(datos.monto, "monto");
    const oferta = await db.oferta.create({
      data: {
        organizationId: servicio.organizationId,
        servicioEnCursoId: servicio.id,
        fecha,
        monto: new Prisma.Decimal(datos.monto.valor),
        moneda: datos.monto.moneda,
        oferente: datos.oferente,
        nota: datos.nota || null,
      },
      include: { mostradaPor: PERSONA, respondidaPor: PERSONA },
    });
    return c.json(ofertaParaEquipo(oferta), 201);
  },
);

venta.openapi(
  createRoute({
    method: "patch",
    path: "/ofertas/{id}",
    tags: [TAG],
    summary: "Corregir una oferta o cambiar su estado",
    description:
      "Solo el equipo. Se manda solo lo que cambia. Cambiar el estado no mueve nada más del servicio: eso lo decide una persona. " +
      "Una vez que la oferta se le mostró al dueño, el monto, la moneda y la fecha ya no se cambian (409): lo que el dueño vio es lo que respondió. Una vez que el dueño la respondió, tampoco el estado.",
    request: { params: conId, body: cuerpo(VentaOfertaCambiar) },
    responses: { 200: json(VentaOfertaEquipo, "La oferta corregida."), ...errores(400, 401, 403, 404, 409) },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const datos = c.req.valid("json");
    const { oferta: actual } = await ofertaParaEscribir(c.get("quien"), id);
    const fecha = datos.fecha ? deFechaISO(datos.fecha) : undefined;
    if (fecha) exigirFechaNoFutura(fecha, hoyChile(), "fecha");
    if (datos.monto) exigirMontoPositivo(datos.monto, "monto");
    exigirCambioPermitido(actual, { fecha, monto: datos.monto, estado: datos.estado });
    const oferta = await db.oferta.update({
      where: { id },
      data: {
        fecha,
        monto: datos.monto ? new Prisma.Decimal(datos.monto.valor) : undefined,
        moneda: datos.monto?.moneda,
        oferente: datos.oferente,
        nota: datos.nota === undefined ? undefined : datos.nota || null,
        estado: datos.estado,
        recomendacion: datos.recomendacion === undefined ? undefined : datos.recomendacion || null,
      },
      include: { mostradaPor: PERSONA, respondidaPor: PERSONA },
    });
    return c.json(ofertaParaEquipo(oferta), 200);
  },
);

venta.openapi(
  createRoute({
    method: "post",
    path: "/ofertas/{id}/mostrar",
    tags: [TAG],
    summary: "Mostrarle la oferta al dueño",
    description:
      "Solo el equipo. Deja la oferta visible para el dueño, con la recomendación de Proges, y anota cuándo y quién se la mostró. Desde ahí el dueño puede responderla. Una oferta que ya no está RECIBIDA o que el dueño ya respondió no se puede mostrar (409).",
    request: { params: conId, body: cuerpo(VentaOfertaMostrar) },
    responses: { 200: json(VentaOfertaEquipo, "La oferta, ya mostrada."), ...errores(400, 401, 403, 404, 409) },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const datos = c.req.valid("json");
    const { persona, oferta } = await ofertaParaEscribir(c.get("quien"), id);
    if (oferta.estado !== "RECIBIDA" || oferta.respuestaDueno !== null) {
      throw new ErrorApi(409, "Esta oferta ya no está pendiente: no se puede mostrar de nuevo al dueño.");
    }
    const actualizada = await db.oferta.update({
      where: { id },
      data: {
        mostradaAlDuenoEl: new Date(),
        mostradaPorId: persona.usuario.id,
        recomendacion: datos.recomendacion ?? oferta.recomendacion,
      },
      include: { mostradaPor: PERSONA, respondidaPor: PERSONA },
    });
    return c.json(ofertaParaEquipo(actualizada), 200);
  },
);

venta.openapi(
  createRoute({
    method: "post",
    path: "/ofertas/{id}/responder",
    tags: [TAG],
    summary: "El dueño responde una oferta",
    description:
      "Solo una persona del cliente dueño de la propiedad (nunca el equipo, una llave de la API ni otro cliente). Acepta, contraoferta (con un monto, en la moneda de la oferta) o rechaza. La oferta pasa a ACEPTADA, CONTRAOFERTADA o RECHAZADA, queda anotado quién y cuándo, y se crea una tarea para el responsable del servicio: «comunicar la respuesta del dueño al oferente». " +
      "Si la oferta todavía no se le mostró, ya fue respondida o ya no está pendiente, responde 409.",
    request: { params: conId, body: cuerpo(VentaOfertaResponder) },
    responses: { 200: json(VentaOferta, "La oferta con la respuesta del dueño."), ...errores(400, 401, 403, 404, 409) },
  }),
  async (c) => {
    const quien = exigirCliente(c.get("quien"));
    const { id } = c.req.valid("param");
    const datos = c.req.valid("json");
    const oferta = await legible(
      quien,
      await db.oferta.findUnique({
        where: { id },
        include: { servicioEnCurso: { select: { tipo: true, estado: true, porConfirmar: true, porRevisar: true, responsableId: true } } },
      }),
    );
    // Un servicio que el dueño no puede ver (cancelado, por confirmar, por revisar) tampoco deja responder.
    if (!visibleParaDueno(oferta.servicioEnCurso)) throw new ErrorApi(404, "No se encontró lo que buscas.");
    exigirServicioAbierto(oferta.servicioEnCurso);
    if (oferta.mostradaAlDuenoEl === null) {
      throw new ErrorApi(409, "Esta oferta todavía no se le muestra al dueño.");
    }
    if (oferta.respuestaDueno !== null) throw new ErrorApi(409, "Esta oferta ya fue respondida.");
    if (oferta.estado !== "RECIBIDA") throw new ErrorApi(409, "Esta oferta ya no está pendiente.");

    let contraoferta: { valor: string; moneda: "CLP" | "UF" } | null = null;
    if (datos.respuesta === "CONTRAOFERTA") {
      if (!datos.monto) {
        throw new ErrorApi(400, "Para contraofertar hay que decir el monto.", { monto: "Escribe el monto de tu contraoferta." });
      }
      if (datos.monto.moneda !== oferta.moneda) {
        throw new ErrorApi(400, "La contraoferta va en la misma moneda de la oferta.", {
          monto: `Escríbela en ${oferta.moneda}.`,
        });
      }
      exigirMontoPositivo(datos.monto, "monto");
      contraoferta = datos.monto;
    }

    const respondida = await db.$transaction(async (tx) => {
      // Solo se guarda si la oferta sigue pendiente: si otra persona del cliente respondió en
      // el mismo instante, esta no pisa la primera respuesta ni crea una segunda tarea.
      const { count } = await tx.oferta.updateMany({
        where: { id, respuestaDueno: null, estado: "RECIBIDA" },
        data: {
          estado: estadoTrasRespuesta(datos.respuesta),
          respuestaDueno: datos.respuesta,
          contraofertaMonto: contraoferta ? new Prisma.Decimal(contraoferta.valor) : null,
          respondidaPorId: quien.usuario.id,
          respondidaEl: new Date(),
        },
      });
      if (count === 0) throw new ErrorApi(409, "Esta oferta ya fue respondida.");
      await tx.tarea.create({
        data: {
          organizationId: oferta.organizationId,
          servicioEnCursoId: oferta.servicioEnCursoId,
          que: textoTareaRespuesta({
            respuesta: datos.respuesta,
            oferente: oferta.oferente,
            monto: aMonto(oferta.monto, oferta.moneda),
            contraoferta: contraoferta ? aMonto(contraoferta.valor, oferta.moneda) : null,
          }),
          responsableId: oferta.servicioEnCurso.responsableId,
          vence: hoyChile(),
          creadaPorId: quien.usuario.id,
        },
      });
      return tx.oferta.findUniqueOrThrow({ where: { id } });
    });
    return c.json(ofertaParaDueno(respondida), 200);
  },
);

// ---------------------------------------------------------------------------
// Precio
// ---------------------------------------------------------------------------

venta.openapi(
  createRoute({
    method: "post",
    path: "/servicios/{id}/precio",
    tags: [TAG],
    summary: "Fijar o cambiar el precio publicado",
    description:
      "Solo el equipo. Cambia el precio vigente del servicio y deja el cambio anotado en su historia (con quién lo fijó: el propietario o Proges). Desde el segundo precio hay que contar el motivo. Si el precio es el mismo que ya está, responde 409.",
    request: { params: conId, body: cuerpo(VentaPrecioCambiar) },
    responses: { 201: json(VentaPrecioRespuesta, "El precio vigente y el cambio anotado."), ...errores(400, 401, 403, 404, 409) },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const datos = c.req.valid("json");
    const { persona, servicio } = await servicioParaEscribir(c.get("quien"), id);
    exigirMontoPositivo(datos.monto, "monto");
    const nuevo = new Prisma.Decimal(datos.monto.valor);
    if (servicio.precio !== null && !datos.motivo) {
      throw new ErrorApi(400, "Cuenta por qué cambia el precio.", { motivo: "Cuenta por qué cambia el precio." });
    }
    if (servicio.precio?.equals(nuevo) && servicio.precioMoneda === datos.monto.moneda) {
      throw new ErrorApi(409, "El precio vigente ya es ese.");
    }
    // Las dos escrituras van juntas: o quedan las dos o ninguna, así el precio vigente nunca se
    // desencuentra con su historia. Y solo se guarda si el precio sigue siendo el que se leyó:
    // si otra persona lo cambió entre medio, el «precio anterior» quedaría mal anotado.
    const evento = await db.$transaction(async (tx) => {
      const { count } = await tx.servicioEnCurso.updateMany({
        where: { id: servicio.id, precio: servicio.precio, precioMoneda: servicio.precioMoneda },
        data: { precio: nuevo, precioMoneda: datos.monto.moneda },
      });
      if (count === 0) throw new ErrorApi(409, "Otra persona cambió el precio recién. Vuelve a cargar y reintenta.");
      return tx.evento.create({
        data: {
          organizationId: servicio.organizationId,
          servicioEnCursoId: servicio.id,
          tipo: "PRECIO",
          anterior: servicio.precio ? servicio.precio.toFixed() : null,
          nuevo: nuevo.toFixed(),
          moneda: datos.monto.moneda,
          origen: datos.origen,
          motivo: datos.motivo || null,
          autorId: persona.usuario.id,
        },
        include: { autor: PERSONA },
      });
    });
    const cambio = cambioDePrecioEquipo(evento);
    if (!cambio) throw new Error("El evento de precio recién creado no tiene moneda.");
    return c.json({ precio: aMonto(nuevo, datos.monto.moneda), cambio }, 201);
  },
);

// ---------------------------------------------------------------------------
// Anuncios y cifras
// ---------------------------------------------------------------------------

venta.openapi(
  createRoute({
    method: "post",
    path: "/servicios/{id}/anuncios",
    tags: [TAG],
    summary: "Anotar un anuncio publicado",
    description: "Solo el equipo. Dónde está publicado el servicio (Nexxos u otro portal), su enlace y desde cuándo.",
    request: { params: conId, body: cuerpo(VentaAnuncioCrear) },
    responses: { 201: json(VentaAnuncio, "El anuncio anotado."), ...errores(400, 401, 403, 404, 409) },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const datos = c.req.valid("json");
    const { persona, servicio } = await servicioParaEscribir(c.get("quien"), id);
    const anuncio = await db.anuncio.create({
      data: {
        organizationId: servicio.organizationId,
        servicioEnCursoId: servicio.id,
        portal: datos.portal,
        url: datos.url ?? null,
        estado: datos.estado ?? "ACTIVO",
        desde: deFechaISO(datos.desde),
        creadoPorId: persona.usuario.id,
      },
    });
    return c.json(anuncioParaContrato(anuncio), 201);
  },
);

venta.openapi(
  createRoute({
    method: "patch",
    path: "/anuncios/{id}",
    tags: [TAG],
    summary: "Corregir un anuncio",
    description: "Solo el equipo. Se manda solo lo que cambia; `url: null` quita el enlace.",
    request: { params: conId, body: cuerpo(VentaAnuncioCambiar) },
    responses: { 200: json(VentaAnuncio, "El anuncio corregido."), ...errores(400, 401, 403, 404, 409) },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const datos = c.req.valid("json");
    await anuncioParaEscribir(c.get("quien"), id);
    const anuncio = await db.anuncio.update({
      where: { id },
      data: {
        portal: datos.portal,
        url: datos.url,
        estado: datos.estado,
        desde: datos.desde ? deFechaISO(datos.desde) : undefined,
      },
    });
    return c.json(anuncioParaContrato(anuncio), 200);
  },
);

venta.openapi(
  createRoute({
    method: "delete",
    path: "/anuncios/{id}",
    tags: [TAG],
    summary: "Borrar un anuncio",
    description: "Solo el equipo. Se borran también sus cifras semanales. Para dejar de contarlo sin perder su historia, mejor cambiar su estado a BAJADO.",
    request: { params: conId },
    responses: { 204: SIN_CONTENIDO, ...errores(401, 403, 404, 409) },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    await anuncioParaEscribir(c.get("quien"), id);
    await db.anuncio.delete({ where: { id } });
    return c.body(null, 204);
  },
);

venta.openapi(
  createRoute({
    method: "put",
    path: "/anuncios/{id}/cifras/{semana}",
    tags: [TAG],
    summary: "Anotar las cifras de una semana",
    description:
      "Solo el equipo. Las vistas y consultas que muestra Nexxos se copian a mano una vez por semana. `semana` es la fecha de un lunes (si no es lunes, 400). Si esa semana ya estaba anotada, se corrige la misma fila: no se duplica.",
    request: { params: z.object({ id: Id, semana: FechaISO }), body: cuerpo(VentaCifraAnotar) },
    responses: { 200: json(VentaCifra, "Las cifras de esa semana."), ...errores(400, 401, 403, 404, 409) },
  }),
  async (c) => {
    const { id, semana: textoSemana } = c.req.valid("param");
    const datos = c.req.valid("json");
    const semana = deFechaISO(textoSemana);
    if (!esLunes(semana)) {
      throw new ErrorApi(400, "La semana tiene que ser la fecha de un lunes.", { semana: "Escribe la fecha de un lunes." });
    }
    if (datos.vistas === undefined && datos.consultas === undefined) {
      throw new ErrorApi(400, "Manda las vistas, las consultas o las dos.", { vistas: "Falta al menos una cifra." });
    }
    const { persona, anuncio } = await anuncioParaEscribir(c.get("quien"), id);
    const cifra = await db.anuncioCifra.upsert({
      where: { anuncioId_semana: { anuncioId: id, semana } },
      create: {
        organizationId: anuncio.organizationId,
        anuncioId: id,
        semana,
        vistas: datos.vistas ?? null,
        consultas: datos.consultas ?? null,
        anotadaPorId: persona.usuario.id,
      },
      update: { vistas: datos.vistas, consultas: datos.consultas, anotadaPorId: persona.usuario.id },
    });
    return c.json(cifraParaContrato(cifra), 200);
  },
);
