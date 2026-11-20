// El «quién» de una consulta que llegó con la sesión de Clerk (la web).
//
// Clerk es la portería: revisa el carnet y responde «esta persona es la cuenta user_… con este
// correo». Quién puede entrar al portal y con qué rol lo dice la tabla Usuario (la lista de
// residentes autorizados), que el administrador llena en Configuración. Traslada las reglas de
// legado/src/lib/sesion.ts.
import { db, type ModoCliente } from "@proges/db";
import type { VerificarSesion } from "../entorno";
import { ErrorApi } from "../errores";
import { quienDeUsuario, type QuienUsuario } from "./quien";

// El último ingreso se anota como mucho una vez por hora, para no escribir en la base en cada
// petición.
const UNA_HORA_MS = 60 * 60 * 1000;

export async function quienConSesion(
  token: string,
  verificarSesion: VerificarSesion,
  ahora: Date = new Date(),
): Promise<QuienUsuario> {
  const sesion = await verificarSesion(token);
  if (!sesion) throw new ErrorApi(401, "La sesión no es válida o ya venció. Vuelve a entrar.");

  // Primero por el enlace con Clerk; si todavía no está enlazado (primer ingreso), por el correo.
  let usuario = await db.usuario.findUnique({ where: { clerkUserId: sesion.clerkUserId } });
  let enlazar = false;
  if (!usuario && sesion.correo) {
    const porCorreo = await db.usuario.findUnique({ where: { email: sesion.correo.trim().toLowerCase() } });
    if (porCorreo?.clerkUserId && porCorreo.clerkUserId !== sesion.clerkUserId) {
      // El correo ya entró antes con otra cuenta de Clerk. No se cambia el enlace solo: podría ser
      // otra persona que se hizo una cuenta con ese correo. Lo revisa el administrador.
      throw new ErrorApi(
        403,
        "Tu correo ya está enlazado con otra cuenta de inicio de sesión. Pídele a Proges que lo revise.",
      );
    }
    usuario = porCorreo;
    enlazar = porCorreo !== null;
  }

  if (!usuario) {
    throw new ErrorApi(403, "Tu cuenta no tiene acceso al portal de Proges. Pídele a Proges que te invite.");
  }
  if (!usuario.activo) {
    throw new ErrorApi(403, "Tu usuario está desactivado en el portal de Proges.");
  }

  // Un cliente desactivado deja de entrar con todos sus usuarios: es como devolver las llaves
  // del departamento, no solo sacarlo de una lista.
  let cliente: { modo: ModoCliente } | null = null;
  if (usuario.rol === "CLIENTE") {
    const organizacion = await db.organizacion.findUnique({
      where: { id: usuario.organizationId },
      select: { tipo: true, activa: true, modo: true },
    });
    if (!organizacion || organizacion.tipo !== "CLIENTE" || !organizacion.activa) {
      throw new ErrorApi(403, "Tu cliente está desactivado en el portal de Proges.");
    }
    cliente = { modo: organizacion.modo };
  }

  const cambios: { clerkUserId?: string; ultimoIngreso?: Date } = {};
  if (enlazar) cambios.clerkUserId = sesion.clerkUserId;
  if (!usuario.ultimoIngreso || ahora.getTime() - usuario.ultimoIngreso.getTime() > UNA_HORA_MS) {
    cambios.ultimoIngreso = ahora;
  }
  if (Object.keys(cambios).length > 0) {
    usuario = await db.usuario.update({ where: { id: usuario.id }, data: cambios });
  }

  return quienDeUsuario(usuario, cliente);
}
