// El Inicio del equipo y las novedades del dueño. Las escribe la pieza D.
import { createRoute } from "@hono/zod-openapi";
import { db } from "@proges/db";
import { InicioConsulta, InicioEquipo, Novedades, NovedadesConsulta } from "@proges/contrato";
import { nuevoRouter } from "../entorno";
import { espaciosQueLee, exigirEquipo } from "../permisos";
import { aFechaHoraISO } from "../util/al-contrato";
import { hoyChile } from "../util/fechas";
import { esperaDeEvento } from "../dominio/trabajo/espera";
import { VISIBLE_PARA_DUENO } from "../dominio/trabajo/ficha";
import { armarInicio } from "../dominio/trabajo/inicio";
import { notaParaDueno } from "../dominio/trabajo/recorte";
import { seleccionNota } from "../dominio/trabajo/selecciones";
import { errores, json } from "./ayuda";

export const inicio = nuevoRouter();

inicio.openapi(
  createRoute({
    method: "get",
    path: "/inicio",
    tags: ["Inicio"],
    summary: "El Inicio del equipo",
    description:
      "Solo el equipo. Todo lo que necesita la pantalla de Inicio en una sola llamada: cifras (servicios en curso, nuevos sin repartir, esperando y cuántos hace más de 10 días, tareas atrasadas), lo nuevo, lo trabado (esperando más de 10 días, tareas atrasadas y cuántos presupuestos de maestros esperan aprobación: solo la cuenta), la carga de cada persona y las últimas 5 notas con foto.",
    request: { query: InicioConsulta },
    responses: { 200: json(InicioEquipo, "El Inicio."), ...errores(400, 401, 403) },
  }),
  async (c) => {
    const quien = c.get("quien");
    exigirEquipo(quien);
    const { cliente } = c.req.valid("query");
    return c.json(await armarInicio(await espaciosQueLee(quien, cliente), hoyChile()), 200);
  },
);

const seleccionServicioDeNovedad = {
  select: {
    id: true,
    tipo: true,
    servicio: { select: { nombre: true } },
    property: { select: { id: true, direccion: true, comuna: true } },
  },
} as const;

inicio.openapi(
  createRoute({
    method: "get",
    path: "/novedades",
    tags: ["Inicio"],
    summary: "Las novedades de un dueño",
    description:
      "Lo que pasó en los servicios de un dueño: las notas que el equipo marcó para él (con sus fotos) y los cambios de «esperando a», de lo más nuevo a lo más antiguo. Con `servicioId` trae solo lo de ese servicio. Un dueño o una llave ve solo lo de su cliente; nunca notas internas, tareas ni servicios cancelados o por revisar.",
    request: { query: NovedadesConsulta },
    responses: { 200: json(Novedades, "Las novedades."), ...errores(400, 401) },
  }),
  async (c) => {
    const quien = c.get("quien");
    const { limite, cliente, servicioId } = c.req.valid("query");
    const orgIds = await espaciosQueLee(quien, cliente);
    // Con servicioId solo salen las de ese servicio. El filtro de visibilidad no se afloja: si el
    // servicio no es de este dueño o aún no es visible, la lista sale vacía, igual que sin filtro.
    const delServicio = servicioId ? { ...VISIBLE_PARA_DUENO, id: servicioId } : VISIBLE_PARA_DUENO;

    const [notas, cambios] = await Promise.all([
      db.nota.findMany({
        where: { organizationId: { in: orgIds }, paraDueno: true, servicioEnCurso: delServicio },
        orderBy: { createdAt: "desc" },
        take: limite,
        select: { ...seleccionNota, servicioEnCurso: seleccionServicioDeNovedad },
      }),
      db.evento.findMany({
        where: { organizationId: { in: orgIds }, tipo: "ESPERA", servicioEnCurso: delServicio },
        orderBy: { fecha: "desc" },
        take: limite,
        select: {
          fecha: true,
          anterior: true,
          nuevo: true,
          motivo: true,
          servicioEnCurso: seleccionServicioDeNovedad,
        },
      }),
    ]);

    const datosDe = (s: (typeof notas)[number]["servicioEnCurso"]) => ({
      servicio: { id: s.id, tipo: s.tipo, nombre: s.servicio.nombre },
      propiedad: { id: s.property.id, direccion: s.property.direccion, comuna: s.property.comuna },
    });
    const items = [
      ...notas.map((n) => ({
        tipo: "NOTA" as const,
        fecha: aFechaHoraISO(n.createdAt),
        ...datosDe(n.servicioEnCurso),
        nota: notaParaDueno(n),
      })),
      ...cambios.map((e) => ({
        tipo: "ESPERA" as const,
        fecha: aFechaHoraISO(e.fecha),
        ...datosDe(e.servicioEnCurso),
        de: esperaDeEvento(e.anterior),
        a: esperaDeEvento(e.nuevo),
        detalle: e.motivo,
      })),
    ]
      // Las fechas ISO en UTC se ordenan bien como texto.
      .sort((a, b) => b.fecha.localeCompare(a.fecha))
      .slice(0, limite);
    return c.json({ items }, 200);
  },
);
