// Cargar un servicio para tocar su obra, con los permisos que toda escritura de la obra exige.
//
// Toda escritura de la obra es del equipo (exigirEquipo; una llave o un dueño dan 403). El espacio
// donde se escribe sale del propio servicio (espacioParaEscribirEn), nunca de algo que mande la
// web. Y una obra cerrada o cancelada ya no se toca (409).
import { db } from "@proges/db";
import type { Quien } from "../../acceso/quien";
import { ErrorApi } from "../../errores";
import { espacioParaEscribirEn, exigirEquipo } from "../../permisos";

export const SERVICIO_CERRADO = "Este servicio ya está cerrado: no se puede cambiar.";

export function exigirAbierto(estado: string): void {
  if (estado !== "ABIERTO") throw new ErrorApi(409, SERVICIO_CERRADO);
}

// Un servicio para escribir en su obra. Devuelve lo que casi toda escritura necesita.
export async function servicioParaEscribir(quien: Quien, servicioId: string) {
  const persona = exigirEquipo(quien);
  const servicio = await db.servicioEnCurso.findUnique({
    where: { id: servicioId },
    select: {
      id: true,
      organizationId: true,
      estado: true,
      porRevisar: true,
      inicioObra: true,
      fechaComprometida: true,
      property: { select: { id: true, direccion: true, rolSII: true, odooCuentaAnalitica: true, driveCarpetaId: true } },
      orden: { select: { id: true, numero: true, odooOrderId: true } },
    },
  });
  const orgId = await espacioParaEscribirEn(quien, servicio?.organizationId);
  // `espacioParaEscribirEn` responde 404 si no hay servicio, así que aquí sí existe.
  return { persona, orgId, servicio: servicio as NonNullable<typeof servicio> };
}

// Las funciones de Odoo y Drive lanzan Error común con mensaje en español. Hacia la web eso es
// un 502 («un sistema de afuera no respondió»), con el mensaje para que se entienda qué pasó.
export async function desdeAfuera<T>(sistema: "Odoo" | "Drive", trabajo: () => Promise<T>): Promise<T> {
  try {
    return await trabajo();
  } catch (e) {
    if (e instanceof ErrorApi) throw e;
    const mensaje = e instanceof Error ? e.message : "error desconocido";
    throw new ErrorApi(502, mensaje.startsWith(sistema) ? mensaje : `${sistema} no respondió: ${mensaje}`);
  }
}
