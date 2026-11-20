// Contrato del acceso (pieza B): /v1/salud y /v1/yo.
import { z } from "zod";
import { Id } from "./comun";

export const Salud = z
  .object({
    ok: z.literal(true),
    version: z.literal("v1"),
  })
  .meta({ id: "Salud", description: "La API está andando. No pide sesión: sirve para que Railway sepa si responde." });
export type Salud = z.infer<typeof Salud>;

// Estas listas tienen que calzar con los enums de la base (UsuarioRol y ModoCliente): la API lo
// comprueba al compilar (apps/api/src/util/al-contrato.ts).
export const Rol = z.enum(["EQUIPO", "CLIENTE"]).meta({
  id: "Rol",
  description: "EQUIPO: trabaja en Proges. CLIENTE: es dueño o trabaja para un cliente de Proges.",
});
export type Rol = z.infer<typeof Rol>;

export const ModoCliente = z.enum(["ATENDIDO", "AUTONOMO"]).meta({
  id: "ModoCliente",
  description:
    "ATENDIDO: Proges le hace los servicios y el cliente ve el avance. AUTONOMO: el dueño lleva su propia cartera y le pide servicios a Proges cuando quiere. Solo cambia su pantalla de inicio.",
});
export type ModoCliente = z.infer<typeof ModoCliente>;

const ClienteDeYo = z.object({
  id: Id,
  nombre: z.string(),
  modo: ModoCliente,
});

export const YoUsuario = z
  .object({
    tipo: z.literal("usuario"),
    usuario: z.object({
      id: Id,
      nombre: z.string(),
      correo: z.string(),
    }),
    rol: Rol,
    marcas: z.object({
      jefatura: z.boolean().meta({ description: "Aprueba presupuestos de maestros, cierra obras y mira Resultados." }),
      admin: z.boolean().meta({ description: "Crea clientes, usuarios y llaves de la API." }),
    }),
    cliente: ClienteDeYo.nullable().meta({ description: "El cliente al que pertenece; null si es del equipo de Proges." }),
  })
  .meta({ id: "YoUsuario", description: "Una persona que entró con su sesión." });

export const YoLlave = z
  .object({
    tipo: z.literal("llave"),
    llave: z.object({
      id: Id,
      nombre: z.string().meta({ description: "Para qué es la llave («Sistema de NPL»)." }),
    }),
    cliente: ClienteDeYo,
  })
  .meta({ id: "YoLlave", description: "Un sistema externo que entró con una llave de solo lectura." });

export const Yo = z.discriminatedUnion("tipo", [YoUsuario, YoLlave]).meta({
  id: "Yo",
  description: "Quién está haciendo la consulta y qué puede hacer.",
});
export type Yo = z.infer<typeof Yo>;
