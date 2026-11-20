// El catálogo de servicios de Proges. Lo escribe la pieza D.
import { createRoute } from "@hono/zod-openapi";
import { db, ORG_PROGES } from "@proges/db";
import { Catalogo } from "@proges/contrato";
import { nuevoRouter } from "../entorno";
import { tiposDeFamilia } from "../dominio/trabajo/catalogo";
import { errores, json } from "./ayuda";

export const catalogo = nuevoRouter();

catalogo.openapi(
  createRoute({
    method: "get",
    path: "/catalogo",
    tags: ["Servicios"],
    summary: "El catálogo de servicios",
    description:
      "Los servicios activos del catálogo de Proges, por código, con los tipos de servicio en que se pueden ofrecer. Es común a todos los clientes: lo puede leer cualquiera que haya entrado.",
    responses: { 200: json(Catalogo, "Los servicios activos."), ...errores(401) },
  }),
  async (c) => {
    // El catálogo vive en el espacio de Proges (ORG_PROGES), no en el de un cliente.
    const filas = await db.servicio.findMany({
      where: { organizationId: ORG_PROGES, activo: true },
      orderBy: [{ codigo: "asc" }, { nombre: "asc" }],
      select: { id: true, codigo: true, familia: true, nombre: true, unidad: true },
    });
    return c.json({ items: filas.map((f) => ({ ...f, tipos: tiposDeFamilia(f.familia) })) }, 200);
  },
);
