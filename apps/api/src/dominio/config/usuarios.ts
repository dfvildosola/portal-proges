// Las reglas de quién puede ser qué usuario. Traslada lo que hacía
// legado/src/app/(app)/equipo/equipo-actions.ts. Son funciones puras: reciben datos y devuelven
// datos, sin tocar la base (la ruta lee, llama y responde).
//
// El rol decide el espacio de la persona: un EQUIPO vive en org_proges y puede ser admin o
// jefatura; un CLIENTE vive en el espacio de su cliente y nunca es admin ni jefatura.
import type { UsuarioRol } from "@proges/db";

export type DatosUsuario = {
  nombre: string;
  correo: string;
  rol: UsuarioRol;
  clienteId: string | null;
  admin: boolean;
  jefatura: boolean;
  activo: boolean;
};

// Los datos con los cambios encima. Si la persona es (o pasa a ser) de un cliente, las marcas
// de admin y jefatura se apagan aunque vengan encendidas; si es del equipo, no tiene cliente.
export function aplicarCambios(actual: DatosUsuario, cambios: Partial<DatosUsuario>): DatosUsuario {
  const unidos = { ...actual };
  for (const [clave, valor] of Object.entries(cambios)) {
    if (valor !== undefined) Object.assign(unidos, { [clave]: valor });
  }
  return unidos.rol === "CLIENTE"
    ? { ...unidos, admin: false, jefatura: false }
    : { ...unidos, clienteId: null };
}

// Lo que falta en los campos: un CLIENTE tiene que tener cliente.
export function camposFaltantes(datos: DatosUsuario): Record<string, string> | null {
  if (datos.rol === "CLIENTE" && !datos.clienteId) return { clienteId: "Elige el cliente." };
  return null;
}

// Un administrador no puede quitarse a sí mismo el admin, pasarse a cliente ni desactivarse:
// el portal se quedaría sin nadie que administre los usuarios. Devuelve el mensaje o null.
export function problemaDeAutoEdicion(esUnoMismo: boolean, resultado: DatosUsuario): string | null {
  if (!esUnoMismo) return null;
  if (resultado.rol !== "EQUIPO" || !resultado.admin) return "No puedes quitarte a ti mismo el permiso de admin.";
  if (!resultado.activo) return "No puedes desactivarte a ti mismo.";
  return null;
}
