// «Quién» está haciendo cada consulta. El portero (acceso/middleware.ts) lo averigua una vez por
// petición y lo deja en el contexto: `c.get("quien")`. Todo permiso se decide desde aquí.
//
// Hay dos tipos de visitante:
// - usuario: una persona que entró con su sesión de Clerk (la web). Puede ser del equipo de
//   Proges o de un cliente.
// - llave: el sistema de un cliente (por ejemplo el de NPL) que consulta con su llave prg_….
//   Solo lee, y solo lo de su cliente.
import type { ModoCliente, Usuario } from "@proges/db";

export type QuienUsuario = {
  tipo: "usuario";
  usuario: Usuario;
  esEquipo: boolean;
  // Jefatura (Cecilia, Álvaro): aprueba presupuestos de maestros, cierra obras, mira Resultados.
  esJefatura: boolean;
  // Administrador (Diego): crea clientes, usuarios y llaves.
  esAdmin: boolean;
  // El cliente de la persona; null si es del equipo (el equipo lee a todos los clientes).
  clienteId: string | null;
  // El modo de su cliente (cambia su pantalla de inicio); null si es del equipo.
  modo: ModoCliente | null;
};

export type QuienLlave = {
  tipo: "llave";
  clienteId: string;
  llaveId: string;
  nombre: string; // para qué es la llave («Sistema de NPL»)
};

export type Quien = QuienUsuario | QuienLlave;

// Arma el «quién» de una persona a partir de su fila de Usuario y, si es de un cliente, de su
// cliente. Las marcas de jefatura y admin solo valen para el equipo: un usuario de cliente nunca
// es jefatura ni admin, aunque la base diga otra cosa.
export function quienDeUsuario(usuario: Usuario, cliente: { modo: ModoCliente } | null): QuienUsuario {
  const esEquipo = usuario.rol === "EQUIPO";
  return {
    tipo: "usuario",
    usuario,
    esEquipo,
    esJefatura: esEquipo && usuario.jefatura,
    esAdmin: esEquipo && usuario.admin,
    clienteId: esEquipo ? null : usuario.organizationId,
    modo: esEquipo ? null : (cliente?.modo ?? null),
  };
}
