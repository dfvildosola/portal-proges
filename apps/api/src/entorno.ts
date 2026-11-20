// Lo que cada ruta tiene a mano en su contexto (`c`), y cómo se crea un router.
//
// - c.get("quien"): quién hace la consulta (acceso/quien.ts). Lo deja el portero antes de que
//   corra la ruta. En las rutas públicas (/v1/salud) no existe: esas no lo leen.
// - c.get("dep"): las «dependencias», o sea los sistemas de afuera (Clerk, Odoo, Drive, el
//   guardado de PDF). Llegan desde afuera de la app (servidor.ts en la vida real, versiones
//   falsas en las pruebas) para que las pruebas nunca toquen Odoo ni Drive de verdad.
import { OpenAPIHono } from "@hono/zod-openapi";
import type { Quien } from "./acceso/quien";
import { ganchoValidacion } from "./errores";
import type { Drive, GuardadoPdf, Odoo } from "./integraciones/tipos";

// Recibe el token de sesión que mandó la web y responde de quién es, o null si no es válido
// (vencido, falsificado, de otra aplicación). Un problema del servidor (Clerk no responde) no
// es null: se lanza como error.
export type VerificarSesion = (token: string) => Promise<{ clerkUserId: string; correo: string | null } | null>;

export type Dependencias = {
  verificarSesion: VerificarSesion;
  odoo: Odoo;
  drive: Drive;
  pdf: GuardadoPdf;
};

export type Entorno = {
  Variables: {
    quien: Quien;
    dep: Dependencias;
  };
};

// Cada archivo de src/rutas/ crea su router con esto. Lleva el gancho que convierte un dato
// rechazado por zod en un 400 con los campos (un router creado con `new OpenAPIHono()` a secas
// respondería otra cosa).
export function nuevoRouter() {
  return new OpenAPIHono<Entorno>({ defaultHook: ganchoValidacion });
}
