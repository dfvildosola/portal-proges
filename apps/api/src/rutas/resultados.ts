// GET /v1/resultados: los números que mira la jefatura, todos en una llamada y calculados al
// mirar (hay pocos datos: una tabla de resumen sería otra cosa que mantener al día).
// La escribe la pieza H.
//
// La ruta solo lee de la base, llama a las funciones puras de dominio/resultados/ y responde.
//
// Un límite que conviene saber: de las facturas de los maestros se usa lo que el portal
// guardó (cuánto se asignó a cada obra). No se pregunta a Odoo si alguna fue anulada ahí, para
// que Resultados no dependa de que Odoo responda: la pantalla de la obra sí lo hace.
import { createRoute } from "@hono/zod-openapi";
import { db } from "@proges/db";
import { Resultados, ResultadosConsulta } from "@proges/contrato";
import { nuevoRouter } from "../entorno";
import { ErrorApi } from "../errores";
import { espaciosQueLee, exigirJefaturaOAdmin } from "../permisos";
import { aFechaISO, aMonto } from "../util/al-contrato";
import { hoyChile, sumarDias } from "../util/fechas";
import type { FacturaCuenta, PresupuestoCuenta } from "../dominio/obra/obra";
import { margenDeObras, resultadoDeObra, type ObraParaResultados } from "../dominio/resultados/obras";
import { cifrasDeServicios, diasPorTipo, serviciosPorSemana, type ServicioCerrado } from "../dominio/resultados/servicios";
import { diaChile, estaEnElRango } from "../dominio/resultados/semanas";
import { tareasATiempoPorPersona } from "../dominio/resultados/tareas";
import { errores, json } from "./ayuda";

export const resultados = nuevoRouter();

const SEMANAS_POR_DEFECTO = 12;
const MAXIMO_DIAS = 731;

// Los momentos exactos se leen con un margen de un día a cada lado y después se filtran por el
// día calendario de Chile: así el borde del período no depende de la zona horaria del servidor.
const MARGEN_DIAS = 1;

const aNumero = (decimal: { toNumber(): number }) => decimal.toNumber();

resultados.openapi(
  createRoute({
    method: "get",
    path: "/resultados",
    tags: ["Resultados"],
    summary: "Resultados del período",
    description:
      "En una sola llamada: servicios que entran y que se terminan por semana; días promedio por tipo de servicio separando el tiempo trabajando del tiempo esperando a otros; obras (lo aprobado al maestro contra lo facturado y el margen); porcentaje de tareas hechas a tiempo por persona; y las cifras de arriba. Sin `desde` ni `hasta` son las últimas 12 semanas. Solo la jefatura y el administrador.",
    request: { query: ResultadosConsulta },
    responses: { 200: json(Resultados, "Los resultados."), ...errores(400, 401, 403) },
  }),
  async (c) => {
    const quien = c.get("quien");
    exigirJefaturaOAdmin(quien);
    const consulta = c.req.valid("query");

    const hoy = hoyChile();
    const hasta = consulta.hasta ? new Date(`${consulta.hasta}T00:00:00Z`) : hoy;
    const desde = consulta.desde ? new Date(`${consulta.desde}T00:00:00Z`) : sumarDias(hasta, -(7 * SEMANAS_POR_DEFECTO - 1));
    if (desde.getTime() > hasta.getTime()) {
      throw new ErrorApi(400, "«desde» no puede ser después de «hasta».", { desde: "Tiene que ser antes de «hasta»." });
    }
    if ((hasta.getTime() - desde.getTime()) / 86_400_000 > MAXIMO_DIAS) {
      throw new ErrorApi(400, "El período no puede pasar de dos años.", { desde: "Pide un período más corto." });
    }

    const espacios = await espaciosQueLee(quien, consulta.cliente);
    // Un cliente que no existe o está desactivado no se ignora en silencio: se dice.
    if (consulta.cliente && !(espacios.length === 1 && espacios[0] === consulta.cliente)) {
      throw new ErrorApi(400, "Ese cliente no existe o está desactivado.", { cliente: "Elige un cliente activo." });
    }

    const lejos = { gte: sumarDias(desde, -MARGEN_DIAS), lte: sumarDias(hasta, MARGEN_DIAS + 1) };
    const dondeCliente = { organizationId: { in: espacios } };

    const [cerradosDb, abiertosDb, obrasDb, tareasDb] = await Promise.all([
      db.servicioEnCurso.findMany({
        where: { ...dondeCliente, estado: "TERMINADO", cerradoEl: lejos },
        select: {
          tipo: true,
          abiertoEl: true,
          cerradoEl: true,
          eventos: { where: { tipo: "ESPERA" }, orderBy: { fecha: "asc" }, select: { fecha: true, nuevo: true } },
        },
      }),
      db.servicioEnCurso.findMany({ where: { ...dondeCliente, abiertoEl: lejos }, select: { abiertoEl: true } }),
      // Las obras vivas en algún momento del período: abiertas antes de su fin y sin cerrar, o
      // cerradas después de su comienzo.
      db.servicioEnCurso.findMany({
        where: {
          ...dondeCliente,
          tipo: "OBRA",
          estado: { in: ["ABIERTO", "TERMINADO"] },
          abiertoEl: { lte: sumarDias(hasta, MARGEN_DIAS + 1) },
          OR: [{ cerradoEl: null }, { cerradoEl: { gte: sumarDias(desde, -MARGEN_DIAS) } }],
        },
        select: {
          id: true,
          organizationId: true,
          estado: true,
          abiertoEl: true,
          cerradoEl: true,
          property: { select: { direccion: true } },
          presupuestos: { select: { tipo: true, estado: true, total: true, plazoDias: true } },
          facturasMaestro: { select: { montoAsignado: true, pagada: true, odooMoveId: true } },
          orden: { select: { total: true, moneda: true } },
        },
      }),
      db.tarea.findMany({
        where: { ...dondeCliente, responsableId: { not: null }, vence: { gte: desde, lte: hasta } },
        select: { vence: true, hechaEl: true, responsable: { select: { id: true, nombre: true } } },
      }),
    ]);

    const cerrados: ServicioCerrado[] = cerradosDb.flatMap((s) =>
      s.cerradoEl && estaEnElRango(diaChile(s.cerradoEl), desde, hasta)
        ? [{ tipo: s.tipo, abiertoEl: s.abiertoEl, cerradoEl: s.cerradoEl, eventos: s.eventos }]
        : [],
    );

    const obrasEntrada: ObraParaResultados[] = obrasDb
      .filter((o) => estaEnElRango(diaChile(o.abiertoEl), new Date(0), hasta) && (!o.cerradoEl || diaChile(o.cerradoEl).getTime() >= desde.getTime()))
      .map((o) => ({
        servicioId: o.id,
        clienteId: o.organizationId,
        propiedad: o.property.direccion,
        estado: o.estado === "TERMINADO" ? "TERMINADO" : "ABIERTO",
        presupuestos: o.presupuestos.map(
          (p): PresupuestoCuenta => ({ tipo: p.tipo, estado: p.estado, total: aNumero(p.total), plazoDias: p.plazoDias }),
        ),
        // Sin preguntar a Odoo (ver el límite arriba): una factura de Odoo cuenta por lo asignado.
        facturas: o.facturasMaestro.map(
          (f): FacturaCuenta =>
            f.odooMoveId !== null
              ? { origen: "odoo", montoAsignado: aNumero(f.montoAsignado), total: aNumero(f.montoAsignado), pendiente: 0, estado: "publicada" }
              : { origen: "manual", montoAsignado: aNumero(f.montoAsignado), pagada: f.pagada },
        ),
        orden: o.orden ? { total: aNumero(o.orden.total), moneda: o.orden.moneda } : null,
      }));
    const obras = obrasEntrada.map(resultadoDeObra).sort((a, b) => a.propiedad.localeCompare(b.propiedad, "es"));
    const margen = margenDeObras(obras);

    const tareas = tareasATiempoPorPersona(
      tareasDb.flatMap((t) =>
        t.responsable ? [{ responsableId: t.responsable.id, responsableNombre: t.responsable.nombre, vence: t.vence as Date, hechaEl: t.hechaEl }] : [],
      ),
      desde,
      hasta,
      hoy,
    );

    const cifras = cifrasDeServicios(cerrados);

    return c.json(
      {
        desde: aFechaISO(desde),
        hasta: aFechaISO(hasta),
        cliente: consulta.cliente ?? null,
        moneda: "CLP" as const,
        cifras: {
          ...cifras,
          margenObras: margen.margen === null ? null : aMonto(margen.margen, "CLP"),
          margenObrasPorcentaje: margen.porcentaje,
        },
        serviciosPorSemana: serviciosPorSemana(
          abiertosDb.map((s) => s.abiertoEl),
          cerrados.map((s) => s.cerradoEl),
          desde,
          hasta,
        ).map((s) => ({ semana: aFechaISO(s.semana), entran: s.entran, cierran: s.cierran })),
        diasPorTipo: diasPorTipo(cerrados),
        obras: obras.map((o) => ({
          servicioId: o.servicioId,
          clienteId: o.clienteId,
          propiedad: o.propiedad,
          estado: o.estado,
          costoAprobado: aMonto(o.costoAprobado, "CLP"),
          facturado: aMonto(o.facturado, "CLP"),
          diferencia: aMonto(o.diferencia, "CLP"),
          precioDueno: o.precioDueno === null ? null : aMonto(o.precioDueno, "CLP"),
          margen: o.margen === null ? null : aMonto(o.margen, "CLP"),
        })),
        tareas,
      },
      200,
    );
  },
);
