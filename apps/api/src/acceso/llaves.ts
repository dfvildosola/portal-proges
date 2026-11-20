// Las llaves de la API: con ellas el sistema de un cliente (por ejemplo el de NPL) consulta lo
// suyo desde su propia plataforma.
//
// Una llave es como la tarjeta de acceso de un edificio: quien la tiene entra, así que se cuida
// igual que una clave. Por eso:
// - Se genera al azar (32 bytes, imposible de adivinar) y empieza con «prg_», para reconocerla
//   a la vista y para que el portero sepa que no es una sesión de Clerk.
// - La llave completa se muestra UNA vez, al crearla (pieza H). En la base se guarda solo su
//   «huella» (sha256): un resumen que sirve para reconocerla cuando llega, pero desde el que no
//   se puede reconstruir la llave. Si alguien copia la base, no se lleva ninguna llave.
// - Es de un cliente y solo lee. Se revoca en Configuración y deja de funcionar al instante.
// - Nunca se escribe en un registro (log) ni en un mensaje de error.
import { createHash, randomBytes } from "node:crypto";
import { db } from "@proges/db";
import { ErrorApi } from "../errores";
import type { QuienLlave } from "./quien";

export const PREFIJO_LLAVE = "prg_";

// Cuántos caracteres de la llave se guardan a la vista («prg_Ab12Cd34»), para que en
// Configuración se distinga cuál es cuál. No alcanzan para adivinar el resto.
const LARGO_PREFIJO = PREFIJO_LLAVE.length + 8;

// prg_ + 43 caracteres (32 bytes en base64url). Lo que no tenga esta forma ni se busca.
const FORMA_LLAVE = /^prg_[A-Za-z0-9_-]{43}$/;

// El último uso se anota como mucho una vez por minuto, para no escribir en la base en cada
// consulta de un sistema que pide mucho.
const UN_MINUTO_MS = 60 * 1000;

export function huellaDeLlave(llave: string): string {
  return createHash("sha256").update(llave, "utf8").digest("hex");
}

// Una llave nueva. Quien la crea (pieza H) guarda { prefijo, huella } en LlaveApi y le muestra
// `llave` a la persona una sola vez.
export function generarLlave(): { llave: string; prefijo: string; huella: string } {
  const llave = PREFIJO_LLAVE + randomBytes(32).toString("base64url");
  return { llave, prefijo: llave.slice(0, LARGO_PREFIJO), huella: huellaDeLlave(llave) };
}

// El «quién» de una consulta que llegó con llave. 401 si la llave no existe o fue revocada;
// 403 si su cliente está desactivado.
export async function quienConLlave(llave: string, ahora: Date = new Date()): Promise<QuienLlave> {
  const invalida = new ErrorApi(401, "La llave de la API no es válida o fue revocada.");
  if (!FORMA_LLAVE.test(llave)) throw invalida;

  const registro = await db.llaveApi.findUnique({ where: { huella: huellaDeLlave(llave) } });
  if (!registro || registro.revocadaEl) throw invalida;

  const cliente = await db.organizacion.findUnique({
    where: { id: registro.organizationId },
    select: { tipo: true, activa: true },
  });
  // Una llave siempre es de un cliente. Si apunta al espacio de Proges (o a nada) es un error
  // de quien la creó, y no se deja pasar: leería el catálogo y los maestros de Proges.
  if (!cliente || cliente.tipo !== "CLIENTE") {
    throw new ErrorApi(403, "Esta llave no pertenece a un cliente, así que no sirve para consultar.");
  }
  if (!cliente.activa) {
    throw new ErrorApi(403, "El cliente de esta llave está desactivado en Proges.");
  }

  if (!registro.ultimoUso || ahora.getTime() - registro.ultimoUso.getTime() >= UN_MINUTO_MS) {
    await db.llaveApi.update({ where: { id: registro.id }, data: { ultimoUso: ahora } });
  }

  return { tipo: "llave", clienteId: registro.organizationId, llaveId: registro.id, nombre: registro.nombre };
}
