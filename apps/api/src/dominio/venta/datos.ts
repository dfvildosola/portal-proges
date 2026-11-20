// Lo que el reporte de venta lee de la base, en una sola mirada. Va filtrado por los espacios
// que quien pregunta puede leer: un servicio de otro cliente responde null (la ruta lo vuelve 404).
import { db } from "@proges/db";
import { ErrorApi } from "../../errores";
import { hoyChile } from "../../util/fechas";
import type { DatosDelReporte } from "./recorte";

const PERSONA = { select: { id: true, nombre: true } } as const;

export async function leerDatosDelReporte(servicioId: string, espacios: string[]): Promise<DatosDelReporte | null> {
  const s = await db.servicioEnCurso.findFirst({
    where: { id: servicioId, organizationId: { in: espacios } },
    select: {
      id: true,
      tipo: true,
      estado: true,
      precio: true,
      precioMoneda: true,
      esperandoA: true,
      recomendacion: true,
      recomendacionFecha: true,
      cerradoEl: true,
      eventos: {
        where: { tipo: "PRECIO" },
        orderBy: [{ fecha: "asc" }, { id: "asc" }],
        include: { autor: PERSONA },
      },
      visitas: {
        orderBy: [{ fecha: "desc" }, { createdAt: "desc" }],
        include: { realizadaPor: PERSONA },
      },
      ofertas: {
        orderBy: [{ fecha: "desc" }, { createdAt: "desc" }],
        include: { mostradaPor: PERSONA, respondidaPor: PERSONA },
      },
      anuncios: {
        orderBy: [{ desde: "asc" }, { createdAt: "asc" }],
        include: { cifras: true },
      },
    },
  });
  if (!s) return null;
  if (s.tipo !== "VENTA" && s.tipo !== "ARRIENDO") {
    throw new ErrorApi(400, "Solo la venta y el arriendo tienen reporte de venta.");
  }
  const { eventos, visitas, ofertas, anuncios, tipo, ...servicio } = s;
  return {
    servicio: { ...servicio, tipo },
    eventosPrecio: eventos,
    visitas,
    ofertas,
    anuncios,
    hoy: hoyChile(),
  };
}
