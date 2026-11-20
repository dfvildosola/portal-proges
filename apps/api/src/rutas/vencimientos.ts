// GET /v1/vencimientos: lo que hoy calcula «Pendientes» en el portal viejo (pieza C).
//
// La agenda no guarda nada: se calcula al pedirla, a partir de los contratos, cobros,
// contribuciones, cuentas y documentos (ADR 0008). Aquí se pide a agenda.ts y se traduce al
// contrato, sumando los papeles que faltan y el servicio que se le puede pedir a Proges para
// cada pendiente. Solo lectura: filtra por los espacios que se pueden leer.
import { createRoute } from "@hono/zod-openapi";
import { db } from "@proges/db";
import { VencimientosConsulta, VencimientosRespuesta } from "@proges/contrato";
import { nuevoRouter } from "../entorno";
import { espaciosQueLee } from "../permisos";
import { hoyChile } from "../util/fechas";
import { calcularAgenda } from "../dominio/ficha/agenda";
import {
  aVencimiento,
  ordenarVencimientos,
  pendientesDePapelesQueFaltan,
  resumenDeVencimientos,
} from "../dominio/ficha/vencimientos";
import { errores, json } from "./ayuda";

export const vencimientos = nuevoRouter();

vencimientos.openapi(
  createRoute({
    method: "get",
    path: "/vencimientos",
    tags: ["Vencimientos"],
    summary: "Vencimientos y pendientes de la cartera",
    description:
      "Lo que hay que hacer, con su fecha y su gravedad: contratos que terminan o se renuevan solos, arriendos atrasados, contribuciones y cuentas por vencer, documentos que vencen o faltan, propiedades arrendadas sin contrato o desocupadas hace mucho. Cada pendiente trae la propiedad y, cuando corresponde, el servicio que se puede pedir a Proges para resolverlo (`servicioSugerido`). El equipo ve todos los clientes (y puede filtrar con `cliente`); un cliente o una llave, solo lo suyo.",
    request: { query: VencimientosConsulta },
    responses: { 200: json(VencimientosRespuesta, "Los pendientes, ordenados, con su resumen."), ...errores(400, 401) },
  }),
  async (c) => {
    const quien = c.get("quien");
    const { cliente } = c.req.valid("query");
    const orgIds = await espaciosQueLee(quien, cliente);
    const hoy = hoyChile();

    const [agenda, propiedades] = await Promise.all([
      calcularAgenda([...orgIds].sort(), hoy),
      db.property.findMany({
        where: { organizationId: { in: orgIds } },
        select: {
          id: true,
          direccion: true,
          comuna: true,
          organizationId: true,
          tipo: true,
          estado: true,
          documents: { where: { papel: { not: null } }, select: { papel: true } },
        },
      }),
    ]);

    const items = ordenarVencimientos([...agenda.map(aVencimiento), ...pendientesDePapelesQueFaltan(propiedades, hoy)]);
    return c.json({ items, resumen: resumenDeVencimientos(items) }, 200);
  },
);
