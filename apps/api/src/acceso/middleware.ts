// El portero de la API: corre antes de cada ruta, averigua quién pregunta y lo deja en el
// contexto (`c.get("quien")`). Si no logra saber quién es, la consulta no pasa.
//
// Lee el encabezado «Authorization: Bearer <x>»:
// - Si x empieza con «prg_», es una llave de la API (acceso/llaves.ts).
// - Si no, es el token de sesión de Clerk que manda la web (acceso/sesion.ts).
// Sin encabezado → 401. Solo tres direcciones no piden nada: /v1/salud (para que Railway sepa
// si la API responde), /openapi.json y /docs (la documentación).
//
// El portero solo dice QUIÉN es. Qué puede leer o escribir lo decide cada ruta con las
// funciones de permisos.ts.
import type { MiddlewareHandler } from "hono";
import type { Entorno } from "../entorno";
import { ErrorApi } from "../errores";
import { PREFIJO_LLAVE, quienConLlave } from "./llaves";
import { quienConSesion } from "./sesion";

export const RUTAS_PUBLICAS = new Set(["/v1/salud", "/openapi.json", "/docs"]);

// «Bearer abc» → «abc». null si no viene o no tiene esa forma.
export function leerBearer(encabezado: string | undefined): string | null {
  if (!encabezado) return null;
  const partes = /^Bearer\s+(\S+)\s*$/i.exec(encabezado);
  return partes ? partes[1] : null;
}

export function acceso(): MiddlewareHandler<Entorno> {
  return async (c, next) => {
    if (RUTAS_PUBLICAS.has(c.req.path)) return next();

    const encabezado = c.req.header("Authorization");
    const token = leerBearer(encabezado);
    if (!token) {
      throw new ErrorApi(
        401,
        encabezado
          ? "El encabezado Authorization tiene que decir «Bearer <token>»."
          : "Falta identificarse: manda «Authorization: Bearer <sesión de Clerk o llave prg_…>».",
      );
    }

    const quien = token.startsWith(PREFIJO_LLAVE)
      ? await quienConLlave(token)
      : await quienConSesion(token, c.get("dep").verificarSesion);
    c.set("quien", quien);
    await next();
  };
}
