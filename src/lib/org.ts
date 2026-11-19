// Costura multi-tenant. Punto único desde donde sale el organizationId.
//
// HOY (single-tenant): la organización es una sola, `org_proges`. Pero getOrgId()
// además hace de guardia: solo responde si quien entró es un integrante activo del
// EQUIPO, y si no lanza «Sin permiso». Así todas las pantallas y acciones del equipo
// que ya la llaman quedan protegidas sin tocarlas. El panel del cliente NO usa esta
// función: toma el organizationId de su propio Usuario (ver src/lib/sesion.ts).
//
// Regla: TODA consulta a la base filtra por este valor. Nunca hardcodear el orgId
// en otro lado; siempre `const orgId = await getOrgId()`.

// Los scripts (seed, carga inicial) importan solo esta constante. Por eso la sesión
// se carga adentro de la función y no arriba: así un script no arrastra Clerk ni Next.
export const DEFAULT_ORG_ID = "org_proges";

export async function getOrgId(): Promise<string> {
  const { usuarioActual } = await import("@/lib/sesion");
  const usuario = await usuarioActual();
  if (!usuario || usuario.rol !== "EQUIPO") throw new Error("Sin permiso");
  return usuario.organizationId;
}
