// El ÚNICO lugar de la web que habla con la API de Proges.
//
// Piensa en una ventanilla: la web nunca abre la bodega (la base de datos), le pide todo a la API,
// que revisa quién eres y qué puedes ver. Esto solo corre en el servidor (Server Components,
// server actions y route handlers): ahí vive la sesión de Clerk, y la dirección de la API y el
// token nunca llegan al navegador. Por eso no hay problemas de CORS.
//
// Cómo se usa (el LEEME.md de apps/web tiene ejemplos completos):
// - Para MOSTRAR datos desde una página: `pedir<Tipo>("/v1/ruta")`. Si hay un problema de sesión o
//   de permiso, manda a la persona a la pantalla que corresponde (ver `pedir`).
// - Para GUARDAR algo desde una server action: `llamar<Tipo>("POST", "/v1/ruta", { cuerpo })`.
//   Si la API rechaza, lanza un `ErrorDeApi` y la acción lo convierte en un mensaje (acciones.ts).
import "server-only";
import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import type { ErrorRespuesta, Yo } from "@proges/contrato";

/** Lo que la API (o la conexión con ella) respondió mal. `mensaje` está escrito para una persona. */
export class ErrorDeApi extends Error {
  constructor(
    readonly status: number,
    readonly mensaje: string,
    readonly campos?: Record<string, string>,
  ) {
    super(mensaje);
    this.name = "ErrorDeApi";
  }
}

type Metodo = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

type ValorDeConsulta = string | number | boolean | null | undefined;

export type OpcionesDeLlamada = {
  /** Lo que va después del «?» de la dirección. Lo vacío o undefined se omite. */
  consulta?: Record<string, ValorDeConsulta>;
  /** Un objeto se manda como JSON. Un FormData se manda como multipart (fotos y PDF). */
  cuerpo?: unknown;
};

function direccionDeLaApi(): string {
  const direccion = process.env.API_URL;
  if (!direccion) {
    throw new Error("Falta API_URL en apps/web/.env.local (por ejemplo http://localhost:3001).");
  }
  return direccion.replace(/\/+$/, "");
}

function armarDireccion(ruta: string, consulta?: OpcionesDeLlamada["consulta"]): string {
  const url = new URL(direccionDeLaApi() + ruta);
  for (const [clave, valor] of Object.entries(consulta ?? {})) {
    if (valor === undefined || valor === null || valor === "") continue;
    url.searchParams.set(clave, String(valor));
  }
  return url.toString();
}

// Hace la petición con el token de sesión de Clerk y devuelve la respuesta cruda.
// Sin sesión no hay a quién pedirle: se responde 401 sin molestar a la API.
async function enviar(metodo: Metodo, ruta: string, opciones: OpcionesDeLlamada): Promise<Response> {
  const { getToken } = await auth();
  const token = await getToken();
  if (!token) throw new ErrorDeApi(401, "Tu sesión terminó. Vuelve a entrar.");

  const cabeceras: Record<string, string> = { Authorization: `Bearer ${token}` };
  let cuerpo: BodyInit | undefined;
  if (opciones.cuerpo instanceof FormData) {
    // Con multipart no se pone Content-Type: fetch lo arma solo, con la frontera entre las partes.
    cuerpo = opciones.cuerpo;
  } else if (opciones.cuerpo !== undefined) {
    cabeceras["Content-Type"] = "application/json";
    cuerpo = JSON.stringify(opciones.cuerpo);
  }

  try {
    return await fetch(armarDireccion(ruta, opciones.consulta), {
      method: metodo,
      headers: cabeceras,
      body: cuerpo,
      // Lo que cambia a cada rato (tareas, esperas) nunca se guarda en la caché de Next.
      cache: "no-store",
    });
  } catch (causa) {
    console.error(`[web] No se pudo conectar con la API (${metodo} ${ruta}):`, causa);
    throw new ErrorDeApi(503, "No se pudo conectar con el servidor de Proges. Intenta de nuevo en un momento.");
  }
}

// Convierte una respuesta con error de la API en un ErrorDeApi con su mensaje.
async function errorDeRespuesta(respuesta: Response): Promise<ErrorDeApi> {
  try {
    const { error } = (await respuesta.json()) as ErrorRespuesta;
    return new ErrorDeApi(respuesta.status, error.mensaje, error.campos);
  } catch {
    return new ErrorDeApi(respuesta.status, `Algo salió mal (código ${respuesta.status}). Intenta de nuevo.`);
  }
}

/**
 * Llama a la API y devuelve el JSON. Si la API responde con error, lanza `ErrorDeApi`.
 * No redirige: es para las server actions, que muestran el error en el formulario.
 */
export async function llamar<T>(metodo: Metodo, ruta: string, opciones: OpcionesDeLlamada = {}): Promise<T> {
  const respuesta = await enviar(metodo, ruta, opciones);
  if (!respuesta.ok) throw await errorDeRespuesta(respuesta);
  if (respuesta.status === 204) return undefined as T;
  return (await respuesta.json()) as T;
}

/**
 * Pide datos para mostrar en una página (GET) y manda a la persona donde corresponde si algo falla:
 * sin sesión (401) → /entrar, sin permiso (403) → /sin-acceso, no existe (404) → página «no
 * encontrado». Cualquier otro error se lanza y lo muestra el `error.tsx` más cercano.
 * (`redirect` y `notFound` funcionan lanzando una excepción especial: no se atrapan con try/catch.)
 */
export async function pedir<T>(ruta: string, opciones: Pick<OpcionesDeLlamada, "consulta"> = {}): Promise<T> {
  try {
    return await llamar<T>("GET", ruta, opciones);
  } catch (error) {
    if (error instanceof ErrorDeApi) irSegunElError(error);
    throw error;
  }
}

/** Si el error es de sesión, permiso o «no existe», redirige; si no, no hace nada. */
export function irSegunElError(error: ErrorDeApi): void {
  if (error.status === 401) redirect("/entrar");
  if (error.status === 403) redirect("/sin-acceso");
  if (error.status === 404) notFound();
}

/**
 * Pide un archivo (foto, PDF) y devuelve la respuesta cruda para pasarla al navegador. Solo la usa
 * el route handler de archivos (app/archivos): el navegador no puede mandar el token por su cuenta.
 */
export async function pedirArchivo(ruta: string, consulta?: OpcionesDeLlamada["consulta"]): Promise<Response> {
  const respuesta = await enviar("GET", ruta, { consulta });
  if (!respuesta.ok) throw await errorDeRespuesta(respuesta);
  return respuesta;
}

/**
 * Quién está conectado y qué puede hacer (GET /v1/yo). Se puede llamar desde cualquier parte de la
 * misma petición (el layout, la página, un componente) y la API se consulta una sola vez: `cache`
 * de React recuerda la respuesta hasta que termina esa petición.
 */
export const yo = cache(() => pedir<Yo>("/v1/yo"));
