// Punto único desde donde sale el espacio (organizationId) con el que se lee y se escribe.
//
// Cada cliente es un espacio: una fila de la tabla Organizacion. Todas las tablas de
// negocio llevan `organizationId`, y ese valor es el id del cliente dueño de los datos.
// Piensa en un edificio de oficinas: cada cliente tiene su piso, y Proges tiene el suyo
// (`org_proges`), donde están el catálogo de servicios y las etapas, que son comunes a
// todos los clientes.
//
// El equipo de Proges tiene la llave maestra del edificio: lee todos los pisos a la vez y
// escribe en cualquiera, pero cada vez se fija en qué piso está la puerta que abre. El
// cliente solo tiene la llave de su piso. Las tres puertas (ADR 0010):
//  - espaciosQueLee(filtro):        los pisos que se leen en una lista (`organizationId in …`).
//  - exigirLectura(orgIdDelRegistro): tras leer un registro por su id, comprueba que su piso se puede leer.
//  - espacioParaEscribirEn(orgIdDelRegistro): el piso donde se escribe lo que cuelga de un registro.
//
// Regla: TODA consulta de la cartera filtra por estos valores. Nunca escribir el id de un
// cliente a mano, y nunca confiar en un organizationId que mande el navegador: el espacio de
// una escritura sale del registro que se toca (el de la propiedad, el del contrato…). Lo único
// con id fijo es ORG_PROGES: toda consulta de Etapa o del catálogo Servicio filtra por
// ORG_PROGES, nunca por el espacio de un cliente.
//
// Los scripts (seed, carga inicial) importan solo las constantes. Por eso la sesión y la base
// se cargan adentro de las funciones y no arriba: así un script no arrastra Clerk ni Next.

// El espacio de Proges: ahí viven el catálogo (Servicio) y las etapas (Etapa).
export const ORG_PROGES = "org_proges";

// Nombre anterior de ORG_PROGES, cuando el portal tenía una sola organización. Sigue
// existiendo para los scripts que aún lo importan; el código nuevo usa ORG_PROGES.
export const DEFAULT_ORG_ID = ORG_PROGES;

// Lo mínimo de un usuario que importa para decidir su espacio.
type UsuarioEspacio = { rol: "EQUIPO" | "CLIENTE"; organizationId: string };

// Los clientes activos, por nombre: contra ellos se filtra todo lo que lee el equipo.
export async function clientesActivos(): Promise<{ id: string; nombre: string }[]> {
  const { db } = await import("@/lib/db");
  return db.organizacion.findMany({
    where: { tipo: "CLIENTE", activa: true },
    orderBy: { nombre: "asc" },
    select: { id: true, nombre: true },
  });
}

// Cada decisión tiene su versión pura (recibe el usuario y la lista de clientes activos, sin
// sesión ni base) para probarla en scripts/probar-espacios.ts, y su versión con sesión.

// Los espacios que un usuario puede leer. Un cliente: solo el suyo (ignora cualquier filtro).
// El equipo: todos los clientes activos, o solo el del filtro si es un cliente activo válido
// (un filtro inventado se ignora, no deja leer nada de más).
export function espaciosQueLeePuro(
  usuario: UsuarioEspacio,
  clientesActivosIds: string[],
  filtroCliente?: string | null,
): string[] {
  if (usuario.rol === "CLIENTE") return [usuario.organizationId];
  if (filtroCliente && clientesActivosIds.includes(filtroCliente)) return [filtroCliente];
  return clientesActivosIds;
}

// ¿Puede este usuario leer registros de ese espacio?
export function puedeLeer(
  usuario: UsuarioEspacio,
  orgIdDelRegistro: string,
  clientesActivosIds: string[],
): boolean {
  return espaciosQueLeePuro(usuario, clientesActivosIds).includes(orgIdDelRegistro);
}

// ¿Puede este usuario escribir en registros de ese espacio? El cliente, solo en el suyo; el
// equipo, en cualquier cliente activo. Nadie escribe la cartera en org_proges.
export function puedeEscribirEn(
  usuario: UsuarioEspacio,
  orgIdDelRegistro: string,
  clientesActivosIds: string[],
): boolean {
  if (usuario.rol === "CLIENTE") return usuario.organizationId === orgIdDelRegistro;
  return clientesActivosIds.includes(orgIdDelRegistro);
}

// Los ids de los clientes activos (ni org_proges ni los desactivados).
async function idsClientesActivos(): Promise<string[]> {
  return (await clientesActivos()).map((c) => c.id);
}

// Los espacios que se leen en esta petición. Úsalo en las listas: `where: { organizationId:
// { in: await espaciosQueLee() } }`. `filtroCliente` es el filtro por cliente de la pantalla.
export async function espaciosQueLee(filtroCliente?: string | null): Promise<string[]> {
  const { usuarioActual } = await import("@/lib/sesion");
  const usuario = await usuarioActual();
  if (!usuario) throw new Error("Sin permiso");
  // Un cliente nunca necesita la lista de clientes: se evita la consulta.
  if (usuario.rol === "CLIENTE") return espaciosQueLeePuro(usuario, [], filtroCliente);
  return espaciosQueLeePuro(usuario, await idsClientesActivos(), filtroCliente);
}

// ¿Se puede leer este espacio? Es la versión que responde sí o no: las páginas de detalle la
// usan para mostrar «no encontrado» (`notFound()`) en vez de un error, y sin decir si el
// registro existe.
export async function puedeLeerEn(orgIdDelRegistro: string): Promise<boolean> {
  const { usuarioActual } = await import("@/lib/sesion");
  const usuario = await usuarioActual();
  if (!usuario) throw new Error("Sin permiso");
  const ids = usuario.rol === "CLIENTE" ? [] : await idsClientesActivos();
  return puedeLeer(usuario, orgIdDelRegistro, ids);
}

// Para cuando ya se leyó un registro por su id: comprueba que su espacio es de los que el
// usuario puede leer. Lanza «Sin permiso» si no (no dice si el registro existe).
export async function exigirLectura(orgIdDelRegistro: string): Promise<void> {
  if (!(await puedeLeerEn(orgIdDelRegistro))) throw new Error("Sin permiso");
}

// El espacio donde se escribe algo que cuelga de un registro existente: se le pasa el
// organizationId DEL REGISTRO (el de la propiedad, el del contrato…), nunca algo que mande el
// navegador. Devuelve ese mismo id si el usuario puede escribir ahí, y si no lanza «Sin permiso».
export async function espacioParaEscribirEn(orgIdDelRegistro: string): Promise<string> {
  const { usuarioActual } = await import("@/lib/sesion");
  const usuario = await usuarioActual();
  if (!usuario) throw new Error("Sin permiso");
  const ids = usuario.rol === "CLIENTE" ? [] : await idsClientesActivos();
  if (!puedeEscribirEn(usuario, orgIdDelRegistro, ids)) throw new Error("Sin permiso");
  return orgIdDelRegistro;
}

// Los espacios donde esta petición puede escribir cuando la acción recorre varios a la vez
// (generar los cobros del mes de todos los clientes, o de uno si el filtro lo pide). Es lo
// que se lee, recortado a lo que se puede escribir.
export async function espaciosParaEscribir(filtroCliente?: string | null): Promise<string[]> {
  const { usuarioActual } = await import("@/lib/sesion");
  const usuario = await usuarioActual();
  if (!usuario) throw new Error("Sin permiso");
  const ids = usuario.rol === "CLIENTE" ? [] : await idsClientesActivos();
  return espaciosQueLeePuro(usuario, ids, filtroCliente).filter((id) => puedeEscribirEn(usuario, id, ids));
}

// Los clientes que el equipo puede elegir en un filtro o al crear algo. Para un cliente
// devuelve null: él no elige, es el suyo y punto (así las pantallas saben si mostrar el filtro).
export async function clientesParaElegir(): Promise<{ id: string; nombre: string }[] | null> {
  const { usuarioActual } = await import("@/lib/sesion");
  const usuario = await usuarioActual();
  if (!usuario) throw new Error("Sin permiso");
  return usuario.rol === "CLIENTE" ? null : clientesActivos();
}

// id → nombre de la lista de clientes (vacío si quien mira es un cliente): para poner el nombre
// del cliente en cada fila de una lista del equipo.
export function nombresPorId(clientes: { id: string; nombre: string }[] | null): Map<string, string> {
  return new Map((clientes ?? []).map((c): [string, string] => [c.id, c.nombre]));
}

// Para una acción que toca algo que cuelga de una propiedad: el espacio de ESA propiedad,
// después de comprobar que el usuario puede escribir ahí. Devuelve null si la propiedad no
// existe (la acción responde «Propiedad no encontrada»); si existe pero no se puede escribir
// en su espacio, lanza «Sin permiso».
export async function espacioParaEscribirEnPropiedad(propertyId: string): Promise<string | null> {
  const { db } = await import("@/lib/db");
  const propiedad = await db.property.findUnique({
    where: { id: propertyId },
    select: { organizationId: true },
  });
  return espacioParaEscribirEnRegistro(propiedad);
}

// Igual, para cualquier registro ya leído (`select: { organizationId: true }`): null si no
// existe, «Sin permiso» si no se puede escribir en su espacio.
export async function espacioParaEscribirEnRegistro(
  registro: { organizationId: string } | null,
): Promise<string | null> {
  if (!registro) return null;
  return espacioParaEscribirEn(registro.organizationId);
}

// El espacio donde se CREA algo que no cuelga de ningún registro (una propiedad, un contacto,
// un dueño). El cliente crea en el suyo y se ignora lo que mande el formulario. El equipo
// elige el cliente: si no eligió ninguno devuelve null (la acción pide elegirlo) y si eligió
// uno que no es un cliente activo lanza «Sin permiso».
export function espacioParaCrearPuro(
  usuario: UsuarioEspacio,
  clienteElegido: string | null,
  clientesActivosIds: string[],
): string | null {
  if (usuario.rol === "CLIENTE") return usuario.organizationId;
  if (!clienteElegido) return null;
  if (!puedeEscribirEn(usuario, clienteElegido, clientesActivosIds)) throw new Error("Sin permiso");
  return clienteElegido;
}

export async function espacioParaCrear(clienteElegido: string | null): Promise<string | null> {
  const { usuarioActual } = await import("@/lib/sesion");
  const usuario = await usuarioActual();
  if (!usuario) throw new Error("Sin permiso");
  const ids = usuario.rol === "CLIENTE" ? [] : await idsClientesActivos();
  return espacioParaCrearPuro(usuario, clienteElegido, ids);
}
