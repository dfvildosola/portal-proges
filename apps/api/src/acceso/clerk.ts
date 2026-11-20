// La verificación real de la sesión, con Clerk. Solo la usa servidor.ts; las pruebas pasan una
// versión falsa.
//
// La web manda en cada consulta el token de sesión que le dio Clerk («Authorization: Bearer
// eyJ…»). verifyToken comprueba con la llave secreta que ese token lo firmó Clerk, que es de
// esta aplicación y que no venció. Si es válido, trae el id de la cuenta (`sub`, «user_…»).
//
// El correo: SIEMPRE se pregunta a la API de usuarios de Clerk (y se recuerda 10 minutos, para no
// preguntar en cada consulta). Solo se usa el correo principal y verificado: un correo sin
// verificar no prueba que la cuenta sea de esa persona, y el portal enlaza por ese correo al
// Usuario precreado (incluso un administrador). El reclamo «email» que se puede agregar al token
// de sesión se ignora a propósito: el token solo trae el texto del correo, sin decir si está
// verificado.
import { createClerkClient, verifyToken, type User } from "@clerk/backend";
import { TokenVerificationError, TokenVerificationErrorReason } from "@clerk/backend/errors";
import type { VerificarSesion } from "../entorno";

const DIEZ_MINUTOS_MS = 10 * 60 * 1000;

// Motivos de rechazo que son culpa del servidor (llave secreta mala, Clerk no responde) y no del
// token. Esos no son «sesión inválida»: se dejan caer como error para que se vean.
const PROBLEMAS_DEL_SERVIDOR = new Set<string>([
  TokenVerificationErrorReason.InvalidSecretKey,
  TokenVerificationErrorReason.LocalJWKMissing,
  TokenVerificationErrorReason.RemoteJWKFailedToLoad,
  TokenVerificationErrorReason.RemoteJWKInvalid,
  TokenVerificationErrorReason.RemoteJWKMissing,
  TokenVerificationErrorReason.JWKFailedToResolve,
]);

// `dep` existe solo para las pruebas: cambia la verificación del token y la consulta a Clerk.
export type DepClerk = {
  verificar?: (token: string) => Promise<Record<string, unknown>>;
  traerCuenta?: (clerkUserId: string) => Promise<Pick<User, "emailAddresses" | "primaryEmailAddressId">>;
};

export function verificadorDeClerk(secretKey: string, dep: DepClerk = {}): VerificarSesion {
  const clerk = createClerkClient({ secretKey });
  const verificar = dep.verificar ?? (async (token) => (await verifyToken(token, { secretKey })) as Record<string, unknown>);
  const traerCuenta = dep.traerCuenta ?? ((id) => clerk.users.getUser(id));
  const correos = new Map<string, { correo: string | null; hasta: number }>();

  async function correoDe(clerkUserId: string): Promise<string | null> {
    const recordado = correos.get(clerkUserId);
    if (recordado && recordado.hasta > Date.now()) return recordado.correo;
    const cuenta = await traerCuenta(clerkUserId);
    const principal = cuenta.emailAddresses.find((e) => e.id === cuenta.primaryEmailAddressId);
    const correo = principal?.verification?.status === "verified" ? principal.emailAddress : null;
    correos.set(clerkUserId, { correo, hasta: Date.now() + DIEZ_MINUTOS_MS });
    return correo;
  }

  return async (token) => {
    let datos: Record<string, unknown>;
    try {
      datos = await verificar(token);
    } catch (error) {
      // Un token vencido, falsificado o de otra aplicación: no hay sesión (401).
      if (error instanceof TokenVerificationError && !PROBLEMAS_DEL_SERVIDOR.has(error.reason)) return null;
      throw error;
    }
    const clerkUserId = datos.sub;
    if (typeof clerkUserId !== "string" || !clerkUserId) return null;
    const correo = await correoDe(clerkUserId);
    return { clerkUserId, correo };
  };
}
