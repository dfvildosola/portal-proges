// El patrón de los formularios: una server action llama a la API y devuelve el resultado.
//
// Una «server action» es una función que corre en el servidor pero que un formulario del navegador
// puede llamar, como dejar una nota en una ventanilla: el formulario la entrega y el servidor la
// procesa. Para que todas las pantallas respondan igual, cada acción:
//   1. llama a la API con `llamar(...)` (api.ts),
//   2. si sale bien, avisa a Next qué pantallas cambiaron (para que muestren lo nuevo) y devuelve
//      { ok: true },
//   3. si la API rechaza (un dato mal escrito, falta un permiso), NO lanza: devuelve
//      { ok: false, error, campos } con el mensaje que la API escribió para la persona.
// El hook `useFormulario` (usar-formulario.ts) pone ese resultado en pantalla.
//
// Este archivo es de servidor. Las acciones de cada pantalla viven en un archivo propio que empieza
// con "use server" (por ejemplo `servicios/acciones.ts`) y usan `ejecutar` de aquí.
import "server-only";
import { revalidatePath } from "next/cache";
import { ErrorDeApi } from "./api";

/** Lo que una acción devuelve. `campos` dice qué le pasa a cada campo del formulario. */
export type ResultadoAccion =
  | { ok: true }
  | { ok: false; error: string; campos: Record<string, string> };

export type OpcionesDeEjecutar = {
  /** Las direcciones de pantalla que muestran estos datos y hay que refrescar si todo sale bien. */
  revalidar?: string[];
};

/**
 * Corre el trabajo de una acción y lo convierte en un `ResultadoAccion`.
 *
 * Solo atrapa los errores de la API (`ErrorDeApi`): son los que se le explican a la persona. Todo
 * lo demás (un error de programación) se deja subir para que se vea en vez de esconderlo; también
 * sube un `redirect()` hecho dentro del trabajo, que en Next funciona lanzando una excepción.
 */
export async function ejecutar(
  trabajo: () => Promise<unknown>,
  opciones: OpcionesDeEjecutar = {},
): Promise<ResultadoAccion> {
  try {
    await trabajo();
  } catch (error) {
    if (error instanceof ErrorDeApi) {
      return { ok: false, error: error.mensaje, campos: error.campos ?? {} };
    }
    throw error;
  }
  for (const ruta of opciones.revalidar ?? []) revalidatePath(ruta);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Leer lo que llega en un FormData
// ---------------------------------------------------------------------------

/** El texto de un campo, sin espacios al borde; undefined si no vino o quedó vacío. */
export function textoDe(datos: FormData, campo: string): string | undefined {
  const valor = datos.get(campo);
  if (typeof valor !== "string") return undefined;
  const limpio = valor.trim();
  return limpio === "" ? undefined : limpio;
}

/** Una casilla marcada: true; sin marcar (el navegador no la manda): false. */
export function casillaDe(datos: FormData, campo: string): boolean {
  const valor = datos.get(campo);
  return valor === "on" || valor === "true" || valor === "1";
}

/** Un archivo elegido; undefined si no se eligió ninguno (el navegador manda un archivo vacío). */
export function archivoDe(datos: FormData, campo: string): File | undefined {
  const valor = datos.get(campo);
  return valor instanceof File && valor.size > 0 ? valor : undefined;
}
