// Qué puede leer y escribir cada uno. Traslada legado/src/lib/org.ts y las funciones de
// legado/src/lib/sesion.ts: ahora reciben `quien` (c.get("quien")) en vez de buscar la sesión.
//
// Piensa en un edificio de oficinas. Cada cliente tiene su piso (su «espacio»: una fila de
// Organizacion, y la columna `organizationId` de cada tabla dice de qué piso es cada dato).
// Proges tiene el suyo (org_proges), con el catálogo de servicios y los maestros, comunes a todos.
// - El equipo de Proges tiene llave maestra: lee y escribe en el piso de cualquier cliente
//   activo, pero cada vez mira de qué piso es la puerta que abre.
// - Una persona de un cliente tiene la llave de su piso: lee y escribe solo ahí.
// - Una llave de la API es una tarjeta de visita de ese mismo piso: solo mira.
//
// Reglas que no se rompen:
// - TODA consulta de datos de clientes filtra por estos espacios. Nunca se escribe el id de un
//   cliente a mano, y nunca se confía en un organizationId que mande la web: el espacio de una
//   escritura sale del registro que se toca (el de la propiedad, el del servicio…).
// - Si alguien pide un registro de otro cliente, la respuesta es 404 «no se encontró», igual que
//   si no existiera: así no se entera de que existe.
// - Lo único con id fijo es ORG_PROGES (de @proges/db): el catálogo y los maestros se leen y
//   escriben ahí, con exigirEquipo, y no con estas funciones de espacios.
//
// Cada decisión de espacios tiene su versión pura (`…Puro`: recibe quién es y la lista de
// clientes activos, sin base de datos) que se prueba en test/permisos.test.ts, y su versión
// normal, que busca los clientes activos en la base.
import { db } from "@proges/db";
import type { Quien, QuienUsuario } from "./acceso/quien";
import { ErrorApi } from "./errores";

const NO_ENCONTRADO = "No se encontró lo que buscas.";

// ---------------------------------------------------------------------------
// Quién es quién
// ---------------------------------------------------------------------------

// ¿Lo que sale va hacia un dueño (una persona de un cliente) o hacia el sistema de un cliente
// (una llave)? Entonces la respuesta va RECORTADA: sin costos del maestro, presupuestos,
// facturas, márgenes ni notas que no estén marcadas para el dueño. Ver «La regla de oro» en LEEME.md.
export function esDueno(quien: Quien): boolean {
  return quien.tipo === "llave" || quien.clienteId !== null;
}

// Para toda ruta que crea, cambia o borra algo: una llave de la API no puede (403). Devuelve la
// persona, que es quien queda anotada como autora del cambio.
export function exigirEscritura(quien: Quien): QuienUsuario {
  if (quien.tipo === "llave") {
    throw new ErrorApi(403, "Las llaves de la API solo leen: no pueden crear ni cambiar nada.");
  }
  return quien;
}

export function exigirEquipo(quien: Quien): QuienUsuario {
  if (quien.tipo !== "usuario" || !quien.esEquipo) {
    throw new ErrorApi(403, "Esto es solo para el equipo de Proges.");
  }
  return quien;
}

// Jefatura: aprueba presupuestos de maestros y cierra obras. El administrador no, salvo que
// también tenga la marca de jefatura.
export function exigirJefatura(quien: Quien): QuienUsuario {
  const persona = exigirEquipo(quien);
  if (!persona.esJefatura) throw new ErrorApi(403, "Esto lo hace la jefatura de Proges.");
  return persona;
}

export function exigirAdmin(quien: Quien): QuienUsuario {
  const persona = exigirEquipo(quien);
  if (!persona.esAdmin) throw new ErrorApi(403, "Esto lo hace el administrador del portal.");
  return persona;
}

// Resultados lo miran la jefatura y el administrador.
export function exigirJefaturaOAdmin(quien: Quien): QuienUsuario {
  const persona = exigirEquipo(quien);
  if (!persona.esJefatura && !persona.esAdmin) {
    throw new ErrorApi(403, "Esto lo miran la jefatura y el administrador.");
  }
  return persona;
}

// Lo que hace solo el dueño desde su portal (responder una oferta). Una llave no: solo lee.
export function exigirCliente(quien: Quien): QuienUsuario & { clienteId: string } {
  if (quien.tipo !== "usuario" || quien.clienteId === null) {
    throw new ErrorApi(403, "Esto lo hace el dueño desde su portal.");
  }
  return { ...quien, clienteId: quien.clienteId };
}

// ---------------------------------------------------------------------------
// Espacios: versiones puras
// ---------------------------------------------------------------------------

// Lo mínimo de `quien` que importa para decidir espacios: si es llave, y de qué cliente es
// (null = equipo, que ve a todos los clientes activos).
export type Portador = { tipo: Quien["tipo"]; clienteId: string | null };

// Los espacios que se pueden leer. Un cliente o su llave: solo el suyo (cualquier filtro se
// ignora). El equipo: todos los clientes activos, o solo el del filtro si es un cliente activo
// (un filtro inventado se ignora: nunca deja leer de más).
export function espaciosQueLeePuro(
  quien: Portador,
  clientesActivosIds: string[],
  filtroCliente?: string | null,
): string[] {
  if (quien.clienteId !== null) return [quien.clienteId];
  if (filtroCliente && clientesActivosIds.includes(filtroCliente)) return [filtroCliente];
  return clientesActivosIds;
}

export function puedeLeerPuro(quien: Portador, orgIdDelRegistro: string, clientesActivosIds: string[]): boolean {
  return espaciosQueLeePuro(quien, clientesActivosIds).includes(orgIdDelRegistro);
}

// Una llave nunca escribe. Un cliente, solo en lo suyo. El equipo, en cualquier cliente activo.
// Nadie escribe datos de cartera en org_proges.
export function puedeEscribirEnPuro(quien: Portador, orgIdDelRegistro: string, clientesActivosIds: string[]): boolean {
  if (quien.tipo === "llave") return false;
  if (quien.clienteId !== null) return quien.clienteId === orgIdDelRegistro;
  return clientesActivosIds.includes(orgIdDelRegistro);
}

// El espacio donde se CREA algo que no cuelga de otro registro (una propiedad, un dueño). Un
// cliente crea en el suyo y se ignora lo que mande la web. El equipo tiene que elegir un cliente
// activo (si no, 400 con el campo clienteId).
export function espacioParaCrearPuro(
  quien: Portador,
  clienteElegido: string | null | undefined,
  clientesActivosIds: string[],
): string {
  if (quien.tipo === "llave") {
    throw new ErrorApi(403, "Las llaves de la API solo leen: no pueden crear ni cambiar nada.");
  }
  if (quien.clienteId !== null) return quien.clienteId;
  if (!clienteElegido) {
    throw new ErrorApi(400, "Elige para qué cliente es.", { clienteId: "Elige un cliente." });
  }
  if (!clientesActivosIds.includes(clienteElegido)) {
    throw new ErrorApi(400, "Ese cliente no existe o está desactivado.", { clienteId: "Elige un cliente activo." });
  }
  return clienteElegido;
}

// ---------------------------------------------------------------------------
// Espacios: versiones con la base
// ---------------------------------------------------------------------------

// Los clientes activos, por nombre: contra ellos se filtra todo lo que lee el equipo.
export async function clientesActivos(): Promise<{ id: string; nombre: string }[]> {
  return db.organizacion.findMany({
    where: { tipo: "CLIENTE", activa: true },
    orderBy: { nombre: "asc" },
    select: { id: true, nombre: true },
  });
}

// Un cliente o una llave nunca necesitan la lista de clientes: se evita la consulta.
async function idsQueHacenFalta(quien: Quien): Promise<string[]> {
  if (quien.clienteId !== null) return [];
  return (await clientesActivos()).map((c) => c.id);
}

// Los espacios que se leen en esta consulta. En las listas:
// `where: { organizationId: { in: await espaciosQueLee(quien, filtro) } }`.
export async function espaciosQueLee(quien: Quien, filtroCliente?: string | null): Promise<string[]> {
  return espaciosQueLeePuro(quien, await idsQueHacenFalta(quien), filtroCliente);
}

export async function puedeLeer(quien: Quien, orgIdDelRegistro: string): Promise<boolean> {
  return puedeLeerPuro(quien, orgIdDelRegistro, await idsQueHacenFalta(quien));
}

// Después de leer un registro por su id: 404 si no existe (null o undefined) o si es de un
// espacio que no se puede leer. Uso: `await exigirLecturaEn(quien, propiedad?.organizationId)`.
export async function exigirLecturaEn(quien: Quien, orgIdDelRegistro: string | null | undefined): Promise<void> {
  if (!orgIdDelRegistro || !(await puedeLeer(quien, orgIdDelRegistro))) {
    throw new ErrorApi(404, NO_ENCONTRADO);
  }
}

// Lo mismo, devolviendo el registro ya revisado (y sin null para TypeScript):
// `const propiedad = await legible(quien, await db.property.findUnique(...))`.
export async function legible<T extends { organizationId: string }>(quien: Quien, registro: T | null): Promise<T> {
  await exigirLecturaEn(quien, registro?.organizationId);
  return registro as T;
}

// El espacio donde se escribe algo que cuelga de un registro existente. Se le pasa el
// organizationId DEL REGISTRO (el de la propiedad, el del servicio…), nunca algo que mande la
// web. Una llave → 403. No existe o no se puede leer → 404. Se puede leer pero no escribir → 403.
export async function espacioParaEscribirEn(
  quien: Quien,
  orgIdDelRegistro: string | null | undefined,
): Promise<string> {
  exigirEscritura(quien);
  if (!orgIdDelRegistro) throw new ErrorApi(404, NO_ENCONTRADO);
  const ids = await idsQueHacenFalta(quien);
  if (!puedeLeerPuro(quien, orgIdDelRegistro, ids)) throw new ErrorApi(404, NO_ENCONTRADO);
  if (!puedeEscribirEnPuro(quien, orgIdDelRegistro, ids)) {
    throw new ErrorApi(403, "No puedes cambiar datos de ese espacio.");
  }
  return orgIdDelRegistro;
}

export async function espacioParaCrear(quien: Quien, clienteElegido: string | null | undefined): Promise<string> {
  return espacioParaCrearPuro(quien, clienteElegido, await idsQueHacenFalta(quien));
}
