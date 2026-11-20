// De lo que guarda la base a lo que dice el contrato, para clientes, usuarios y llaves.
//
// Cada función arma el objeto NUEVO campo por campo (nunca `{ ...registro }`): así un campo que
// se agregue mañana a la base, como el enlace con Clerk (`clerkUserId`) o la huella de una
// llave, no sale por la API sin que alguien lo decida. Esto lo ve solo el administrador, pero
// la regla es la misma que para los dueños.
import type { LlaveApi, Organizacion, Usuario } from "@proges/db";
import type { ClienteConfig, LlaveConfig, UsuarioConfig } from "@proges/contrato";
import { aFechaHoraISO } from "../../util/al-contrato";

export function clienteParaConfig(o: Organizacion): ClienteConfig {
  return { id: o.id, nombre: o.nombre, activa: o.activa, modo: o.modo, creadoEl: aFechaHoraISO(o.createdAt) };
}

// `nombresDeClientes`: id de cliente → nombre (el Usuario guarda solo el id de su espacio).
export function usuarioParaConfig(u: Usuario, nombresDeClientes: Map<string, string>): UsuarioConfig {
  const esCliente = u.rol === "CLIENTE";
  return {
    id: u.id,
    nombre: u.nombre,
    correo: u.email,
    rol: u.rol,
    clienteId: esCliente ? u.organizationId : null,
    clienteNombre: esCliente ? (nombresDeClientes.get(u.organizationId) ?? null) : null,
    jefatura: u.jefatura,
    admin: u.admin,
    activo: u.activo,
    haEntrado: u.clerkUserId !== null,
    ultimoIngreso: u.ultimoIngreso ? aFechaHoraISO(u.ultimoIngreso) : null,
  };
}

// La llave nunca sale completa de aquí: ni la huella, que sirve para reconocerla. Solo el
// prefijo, que no alcanza para usarla.
export function llaveParaConfig(l: LlaveApi, nombreDelCliente: string): LlaveConfig {
  return {
    id: l.id,
    clienteId: l.organizationId,
    clienteNombre: nombreDelCliente,
    nombre: l.nombre,
    prefijo: l.prefijo,
    creadaEl: aFechaHoraISO(l.createdAt),
    ultimoUso: l.ultimoUso ? aFechaHoraISO(l.ultimoUso) : null,
    revocadaEl: l.revocadaEl ? aFechaHoraISO(l.revocadaEl) : null,
  };
}
