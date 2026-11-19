// Punto único desde donde sale el espacio (organizationId) con el que se lee y se escribe.
//
// Cada cliente es un espacio: una fila de la tabla Organizacion. Todas las tablas de
// negocio llevan `organizationId`, y ese valor es el id del cliente dueño de los datos.
// Piensa en un edificio de oficinas: cada cliente tiene su piso, y Proges tiene el suyo
// (`org_proges`), donde están el catálogo de servicios y las etapas, que son comunes a
// todos los clientes.
//
// Dos funciones, dos propósitos distintos:
//  - getOrgId():        el espacio que se LEE. Un cliente lee el suyo (siempre, ignora
//                       cualquier cookie). El equipo lee el del cliente activo.
//  - orgParaEscribir(): el espacio donde se ESCRIBE la cartera (propiedades, contratos,
//                       cobranza…). Solo un cliente, en su espacio: el equipo ve la cartera
//                       de un cliente pero no la edita.
//
// Regla: TODA consulta de la cartera filtra por uno de estos valores. Nunca escribir el id de
// un cliente a mano. Lo único con id fijo es ORG_PROGES: toda consulta de Etapa o del catálogo
// Servicio filtra por ORG_PROGES, nunca por getOrgId().
//
// Los scripts (seed, carga inicial) importan solo las constantes. Por eso la sesión y la base
// se cargan adentro de las funciones y no arriba: así un script no arrastra Clerk ni Next.

// El espacio de Proges: ahí viven el catálogo (Servicio) y las etapas (Etapa).
export const ORG_PROGES = "org_proges";

// Nombre anterior de ORG_PROGES, cuando el portal tenía una sola organización. Sigue
// existiendo para los scripts que aún lo importan; el código nuevo usa ORG_PROGES.
export const DEFAULT_ORG_ID = ORG_PROGES;

// La cookie donde el equipo guarda qué cliente está mirando.
export const COOKIE_CLIENTE_ACTIVO = "proges_cliente_activo";

// El aviso que recibe el equipo si intenta editar la cartera de un cliente. Es una clase
// propia para que las acciones lo reconozcan sin comparar textos.
export class SoloLecturaError extends Error {
  constructor() {
    super("La cartera la edita el cliente. Proges solo la ve.");
    this.name = "SoloLecturaError";
  }
}

// Lo mínimo de un usuario que importa para decidir su espacio.
type UsuarioEspacio = { rol: "EQUIPO" | "CLIENTE"; organizationId: string };

// La decisión de qué espacio se lee, sin sesión ni base: recibe el usuario y el cliente
// activo que eligió el equipo (ya validado, o null). Va aparte para poder probarla
// (scripts/probar-espacios.ts) sin Clerk.
export function espacioParaLeer(usuario: UsuarioEspacio, clienteActivoId: string | null): string {
  // Un cliente nunca elige espacio: es el suyo y punto, aunque mande una cookie.
  if (usuario.rol === "CLIENTE") return usuario.organizationId;
  if (!clienteActivoId) throw new Error("Todavía no hay clientes creados");
  return clienteActivoId;
}

// La decisión de dónde se escribe la cartera: solo un cliente, en el suyo.
export function espacioParaEscribir(usuario: UsuarioEspacio): string {
  if (usuario.rol !== "CLIENTE") throw new SoloLecturaError();
  return usuario.organizationId;
}

// El espacio que se lee. Lanza «Sin permiso» si no hay sesión, y «Todavía no hay clientes
// creados» si es del equipo y no existe ningún cliente al que mirar.
export async function getOrgId(): Promise<string> {
  const { usuarioActual, clienteActivo } = await import("@/lib/sesion");
  const usuario = await usuarioActual();
  if (!usuario) throw new Error("Sin permiso");
  if (usuario.rol === "CLIENTE") return espacioParaLeer(usuario, null);
  const cliente = await clienteActivo();
  return espacioParaLeer(usuario, cliente?.id ?? null);
}

// El espacio donde se escribe la cartera: solo un cliente activo, en el suyo.
export async function orgParaEscribir(): Promise<string> {
  const { usuarioActual } = await import("@/lib/sesion");
  const usuario = await usuarioActual();
  if (!usuario) throw new Error("Sin permiso");
  return espacioParaEscribir(usuario);
}

// Para las acciones de formulario, que devuelven { error }: el aviso de solo lectura vuelve
// como mensaje en el formulario; cualquier otro error se deja caer.
export async function espacioDeEscritura(): Promise<{ orgId: string } | { error: string }> {
  try {
    return { orgId: await orgParaEscribir() };
  } catch (e) {
    if (e instanceof SoloLecturaError) return { error: e.message };
    throw e;
  }
}

// Los clientes que el equipo puede elegir en la cabecera: los activos, por nombre.
export async function clientesActivos(): Promise<{ id: string; nombre: string }[]> {
  const { db } = await import("@/lib/db");
  return db.organizacion.findMany({
    where: { tipo: "CLIENTE", activa: true },
    orderBy: { nombre: "asc" },
    select: { id: true, nombre: true },
  });
}
