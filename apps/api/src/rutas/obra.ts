// Rutas de la obra: la orden de Odoo, las partidas (avance y recepción), los presupuestos de
// maestros, las facturas asignadas y el cierre (ADR 0014 y 0015).
//
// La obra es la carpeta de una reparación en una constructora: adentro va el contrato con el dueño
// (la orden), cada presupuesto de maestro, las facturas que llegan y la hoja de recepción donde se
// firma partida por partida. La ruta solo lee, llama al dominio y responde; las reglas y las
// cuentas viven en dominio/obra/.
//
// Quién puede qué:
//  - Leer el panel: el equipo lo ve entero; un dueño o la llave de su cliente, recortado (la
//    orden, el avance y la recepción: nada del maestro, presupuestos, facturas ni márgenes).
//  - Escribir: solo el equipo, en el espacio del propio servicio. Aprobar, rechazar y cerrar, solo
//    la jefatura. Una llave nunca escribe (403).
import { createRoute, z } from "@hono/zod-openapi";
import { db } from "@proges/db";
import {
  AsignacionRespuesta,
  AvanceRecinto,
  AvanceRecintoRespuesta,
  CierrePedido,
  CierreRespuesta,
  FacturaAsignar,
  FacturaManual,
  FechasObra,
  FechasRespuesta,
  Id,
  ObraRespuesta,
  OrdenActualizada,
  OrdenPedido,
  OrdenRespuesta,
  PartidaCambio,
  PresupuestoPedido,
  PresupuestoRespuesta,
  Rechazo,
  RecepcionPedido,
  RecepcionRespuesta,
} from "@proges/contrato";
import { cerrarObra } from "../dominio/obra/cierre";
import { cargarDatosDeObra } from "../dominio/obra/datos";
import { anotarFacturaManual, asignarFactura, quitarFactura } from "../dominio/obra/facturas";
import { aFechaCivil } from "../dominio/obra/formulario";
import { actualizarOrden, revisarOEnlazarOrden } from "../dominio/obra/orden-enlace";
import { avanceDeRecinto, cambiarPartida } from "../dominio/obra/partidas";
import { exigirAbierto, servicioParaEscribir } from "../dominio/obra/permisos-obra";
import { aprobarPresupuesto, cargarPresupuesto, rechazarPresupuesto } from "../dominio/obra/presupuestos";
import { obraParaDueno, obraParaEquipo } from "../dominio/obra/recorte";
import { recibirPartida } from "../dominio/obra/recepcion";
import { ErrorApi } from "../errores";
import { nuevoRouter } from "../entorno";
import { esDueno, legible } from "../permisos";
import { aFechaISO } from "../util/al-contrato";
import { errores, json } from "./ayuda";

export const obra = nuevoRouter();

const paramsServicio = z.object({ id: Id.meta({ description: "El id del servicio." }) });
const cuerpo = <T extends z.ZodType>(schema: T) => ({ content: { "application/json": { schema } }, required: true as const });
const formulario = <T extends z.ZodType>(schema: T) => ({ content: { "multipart/form-data": { schema } }, required: true as const });

// ---------------------------------------------------------------------------
// El panel de la obra
// ---------------------------------------------------------------------------

obra.openapi(
  createRoute({
    method: "get",
    path: "/servicios/{id}/obra",
    tags: ["Obra"],
    summary: "El panel de la obra",
    description:
      "Todo lo de la obra de un servicio en una llamada. Para el equipo (`vista: \"equipo\"`): la orden de Odoo, las partidas con avance y recepción, los presupuestos de maestros, las facturas asignadas y las cuentas (aprobado, adicionales, facturado y pagado, saldo, avance ponderado, plan contra real y margen). Para un dueño o la llave de un cliente (`vista: \"dueno\"`): solo la orden (lo que se le cobra), el avance y la recepción de cada partida; nunca costos, maestros, presupuestos, facturas ni márgenes.",
    request: { params: paramsServicio },
    responses: { 200: json(ObraRespuesta, "El panel de la obra."), ...errores(401, 404, 502) },
  }),
  async (c) => {
    const quien = c.get("quien");
    const { id } = c.req.valid("param");
    const servicio = await legible(
      quien,
      await db.servicioEnCurso.findUnique({
        where: { id },
        select: { id: true, organizationId: true, estado: true, porConfirmar: true, porRevisar: true },
      }),
    );
    if (esDueno(quien)) {
      // Un servicio cancelado, por confirmar o por revisar no existe todavía para el dueño.
      if (servicio.estado === "CANCELADO" || servicio.porConfirmar || servicio.porRevisar) {
        throw new ErrorApi(404, "No se encontró lo que buscas.");
      }
      const datos = await cargarDatosDeObra(c.get("dep").odoo, servicio, { paraDueno: true });
      return c.json(obraParaDueno(datos), 200);
    }
    const datos = await cargarDatosDeObra(c.get("dep").odoo, servicio);
    return c.json(obraParaEquipo(datos), 200);
  },
);

// ---------------------------------------------------------------------------
// La orden de Odoo
// ---------------------------------------------------------------------------

obra.openapi(
  createRoute({
    method: "post",
    path: "/servicios/{id}/orden",
    tags: ["Obra"],
    summary: "Revisar o enlazar la orden de Odoo",
    description:
      "Trae la orden de venta de Odoo (por su número, «S00047») a este servicio, en dos pasos. Con `confirmar: false` solo la lee y dice qué se enlazaría, sugiriendo si la unidad es esta propiedad según la cuenta analítica de la orden (`veredicto`): no guarda nada. Con `confirmar: true`, cuando el equipo ya confirmó que es de esta unidad, guarda la orden y crea sus partidas. Una orden se enlaza a un solo servicio. Odoo solo se lee.",
    request: { params: paramsServicio, body: cuerpo(OrdenPedido) },
    responses: { 200: json(OrdenRespuesta, "La revisión, o la orden ya enlazada."), ...errores(400, 401, 403, 404, 409, 502) },
  }),
  async (c) => {
    const quien = c.get("quien");
    const { id } = c.req.valid("param");
    const { numero, confirmar } = c.req.valid("json");
    const { persona, servicio } = await servicioParaEscribir(quien, id);
    return c.json(await revisarOEnlazarOrden(c.get("dep").odoo, servicio, persona.usuario.id, numero, confirmar), 200);
  },
);

obra.openapi(
  createRoute({
    method: "post",
    path: "/servicios/{id}/orden/actualizar",
    tags: ["Obra"],
    summary: "Volver a traer la orden de Odoo",
    description:
      "Pone al día las partidas con lo que Odoo cambió: las nuevas se agregan, las cambiadas se actualizan y las que Odoo ya no trae se marcan «quitadas en Odoo» (nunca se borran). El avance, la recepción y el maestro de cada partida no se tocan.",
    request: { params: paramsServicio },
    responses: { 200: json(OrdenActualizada, "Lo que cambió."), ...errores(401, 403, 404, 409, 502) },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const { servicio } = await servicioParaEscribir(c.get("quien"), id);
    return c.json(await actualizarOrden(c.get("dep").odoo, servicio), 200);
  },
);

// ---------------------------------------------------------------------------
// Partidas: avance, maestro y recepción
// ---------------------------------------------------------------------------

obra.openapi(
  createRoute({
    method: "patch",
    path: "/partidas/{id}",
    tags: ["Obra"],
    summary: "Cambiar el avance o el maestro de una partida",
    description: "Marca el avance (0, 25, 50, 75 o 100) y/o el maestro a cargo de una partida. Una partida que Odoo ya no trae no se toca (409).",
    request: { params: z.object({ id: Id.meta({ description: "El id de la partida." }) }), body: cuerpo(PartidaCambio) },
    responses: { 204: { description: "Cambiada." }, ...errores(400, 401, 403, 404, 409) },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    await cambiarPartida(c.get("quien"), id, c.req.valid("json"));
    return c.body(null, 204);
  },
);

obra.openapi(
  createRoute({
    method: "patch",
    path: "/servicios/{id}/obra/avance",
    tags: ["Obra"],
    summary: "Marcar el avance de un recinto entero",
    description: "Marca el avance de todas las partidas vigentes de un recinto de una vez (`recinto: null` = las líneas que no están bajo ningún recinto).",
    request: { params: paramsServicio, body: cuerpo(AvanceRecinto) },
    responses: { 200: json(AvanceRecintoRespuesta, "Cuántas partidas cambiaron."), ...errores(400, 401, 403, 404, 409) },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const partidasCambiadas = await avanceDeRecinto(c.get("quien"), id, c.req.valid("json"));
    return c.json({ partidasCambiadas }, 200);
  },
);

obra.openapi(
  createRoute({
    method: "post",
    path: "/partidas/{id}/recepcion",
    tags: ["Obra"],
    summary: "Recibir una partida",
    description:
      "Cuando el maestro dice que terminó una partida, el equipo la recibe: CONFORME u OBSERVADA. Una observada pide la observación (qué hay que corregir), puede llevar fotos (hasta 6, JPG, PNG o WebP, que van al Drive de la propiedad) y abre una tarea «Corregir: …». Volver a recibirla conforme deja hecha esa tarea. Formulario multipart. Si una foto falla, no se guarda nada.",
    request: { params: z.object({ id: Id.meta({ description: "El id de la partida." }) }), body: formulario(RecepcionPedido) },
    responses: { 200: json(RecepcionRespuesta, "La partida, ya recibida."), ...errores(400, 401, 403, 404, 409, 502) },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    return c.json(await recibirPartida(c.get("quien"), c.get("dep").drive, id, c.req.valid("form")), 200);
  },
);

// ---------------------------------------------------------------------------
// Presupuestos de maestros
// ---------------------------------------------------------------------------

obra.openapi(
  createRoute({
    method: "post",
    path: "/servicios/{id}/presupuestos",
    tags: ["Obra"],
    summary: "Cargar el presupuesto de un maestro",
    description:
      "Carga el presupuesto tal como llegó (por PDF o WhatsApp): el maestro, si es original o adicional, el total en pesos, el plazo en días, las partidas que cubre y el PDF (hasta 4 MB, va al Drive de la propiedad). Queda RECIBIDO; la jefatura lo aprueba o rechaza. Formulario multipart.",
    request: { params: paramsServicio, body: formulario(PresupuestoPedido) },
    responses: { 201: json(PresupuestoRespuesta, "El presupuesto, recibido."), ...errores(400, 401, 403, 404, 409, 502) },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    return c.json(await cargarPresupuesto(c.get("quien"), c.get("dep").drive, id, c.req.valid("form")), 201);
  },
);

obra.openapi(
  createRoute({
    method: "post",
    path: "/presupuestos/{id}/aprobar",
    tags: ["Obra"],
    summary: "Aprobar un presupuesto",
    description:
      "Solo la jefatura. El presupuesto pasa a ser el plan de costo y plazo, y las partidas que cubre y no tenían maestro quedan a nombre del maestro del presupuesto. Uno ya resuelto responde 409.",
    request: { params: z.object({ id: Id.meta({ description: "El id del presupuesto." }) }) },
    responses: { 200: json(PresupuestoRespuesta, "El presupuesto, aprobado."), ...errores(401, 403, 404, 409) },
  }),
  async (c) => c.json(await aprobarPresupuesto(c.get("quien"), c.req.valid("param").id), 200),
);

obra.openapi(
  createRoute({
    method: "post",
    path: "/presupuestos/{id}/rechazar",
    tags: ["Obra"],
    summary: "Rechazar un presupuesto",
    description: "Solo la jefatura. Deja el motivo. Un rechazado no se reabre: si el maestro manda uno corregido, se carga uno nuevo.",
    request: { params: z.object({ id: Id.meta({ description: "El id del presupuesto." }) }), body: cuerpo(Rechazo) },
    responses: { 200: json(PresupuestoRespuesta, "El presupuesto, rechazado."), ...errores(400, 401, 403, 404, 409) },
  }),
  async (c) => c.json(await rechazarPresupuesto(c.get("quien"), c.req.valid("param").id, c.req.valid("json").motivo), 200),
);

// ---------------------------------------------------------------------------
// Facturas de maestros asignadas a la obra
// ---------------------------------------------------------------------------

obra.openapi(
  createRoute({
    method: "post",
    path: "/servicios/{id}/obra/facturas",
    tags: ["Obra"],
    summary: "Asignar una factura de Odoo a la obra",
    description:
      "Asigna una factura de proveedor de Odoo (o una parte) a esta obra, indicando cuánto es de ella. La suma asignada de una factura, entre todas las obras, nunca pasa su total (409), aunque dos personas asignen a la vez. De Odoo solo se guarda la asignación: el total, el estado y lo pagado se leen de Odoo cada vez que se mira.",
    request: { params: paramsServicio, body: cuerpo(FacturaAsignar) },
    responses: { 201: json(AsignacionRespuesta, "La asignación."), ...errores(400, 401, 403, 404, 409, 502) },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    return c.json(await asignarFactura(c.get("quien"), c.get("dep").odoo, id, c.req.valid("json")), 201);
  },
);

obra.openapi(
  createRoute({
    method: "post",
    path: "/servicios/{id}/obra/facturas/manual",
    tags: ["Obra"],
    summary: "Anotar a mano una factura fuera de Odoo",
    description: "Anota una factura que no está en Odoo: maestro, número (optativo), fecha, monto y si está pagada. Las cuentas la suman igual que a las de Odoo; el panel la marca «manual».",
    request: { params: paramsServicio, body: cuerpo(FacturaManual) },
    responses: { 201: json(AsignacionRespuesta, "La factura anotada."), ...errores(400, 401, 403, 404, 409) },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    return c.json(await anotarFacturaManual(c.get("quien"), id, c.req.valid("json")), 201);
  },
);

obra.openapi(
  createRoute({
    method: "delete",
    path: "/servicios/{id}/obra/facturas/{facturaId}",
    tags: ["Obra"],
    summary: "Quitar una factura de la obra",
    description: "Quita una asignación (de Odoo o manual). La factura de Odoo no se toca: solo deja de estar asignada a esta obra y su monto vuelve a quedar disponible.",
    request: { params: z.object({ id: Id.meta({ description: "El id del servicio." }), facturaId: Id.meta({ description: "El id de la asignación (`id` de la factura en el panel)." }) }) },
    responses: { 204: { description: "Quitada." }, ...errores(401, 403, 404, 409) },
  }),
  async (c) => {
    const { id, facturaId } = c.req.valid("param");
    await quitarFactura(c.get("quien"), id, facturaId);
    return c.body(null, 204);
  },
);

// ---------------------------------------------------------------------------
// Fechas y cierre
// ---------------------------------------------------------------------------

obra.openapi(
  createRoute({
    method: "patch",
    path: "/servicios/{id}/obra/fechas",
    tags: ["Obra"],
    summary: "Guardar las fechas de la obra",
    description: "Cuándo empezó el trabajo y cuándo se le prometió al dueño que terminaba. Lo que no se manda no cambia; `null` borra la fecha. La comprometida no puede ser anterior al inicio.",
    request: { params: paramsServicio, body: cuerpo(FechasObra) },
    responses: { 200: json(FechasRespuesta, "Las fechas, ya guardadas."), ...errores(400, 401, 403, 404, 409) },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const cambio = c.req.valid("json");
    const { servicio } = await servicioParaEscribir(c.get("quien"), id);
    exigirAbierto(servicio.estado);

    const inicio = cambio.inicioObra === undefined ? servicio.inicioObra : cambio.inicioObra ? aFechaCivil(cambio.inicioObra) : null;
    const comprometida =
      cambio.fechaComprometida === undefined ? servicio.fechaComprometida : cambio.fechaComprometida ? aFechaCivil(cambio.fechaComprometida) : null;
    if (inicio && comprometida && comprometida < inicio) {
      throw new ErrorApi(400, "La fecha comprometida no puede ser antes del inicio de la obra.", {
        fechaComprometida: "No puede ser antes del inicio de la obra.",
      });
    }
    const guardado = await db.servicioEnCurso.update({
      where: { id: servicio.id },
      data: { inicioObra: inicio, fechaComprometida: comprometida },
      select: { inicioObra: true, fechaComprometida: true },
    });
    return c.json(
      {
        inicioObra: guardado.inicioObra ? aFechaISO(guardado.inicioObra) : null,
        fechaComprometida: guardado.fechaComprometida ? aFechaISO(guardado.fechaComprometida) : null,
      },
      200,
    );
  },
);

obra.openapi(
  createRoute({
    method: "post",
    path: "/servicios/{id}/obra/cierre",
    tags: ["Obra"],
    summary: "Cerrar la obra",
    description:
      "Solo la jefatura. Una obra solo se cierra con todas sus partidas vigentes recibidas conforme: sin ninguna pendiente ni observada, y con al menos una (409). El servicio queda TERMINADO. Responde lo planificado contra lo real (costo, plazo y partidas).",
    request: { params: paramsServicio, body: cuerpo(CierrePedido) },
    responses: { 200: json(CierreRespuesta, "La obra, cerrada."), ...errores(400, 401, 403, 404, 409, 502) },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    return c.json(await cerrarObra(c.get("quien"), c.get("dep").odoo, id, c.req.valid("json").motivo), 200);
  },
);
