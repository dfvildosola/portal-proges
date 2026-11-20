// Contrato del equipo de Proges: /v1/equipo (la lista para elegir responsables).
import { z } from "zod";
import { Id } from "./comun";

export const EquipoPersona = z
  .object({
    id: Id,
    nombre: z.string(),
    correo: z.string(),
    jefatura: z.boolean().meta({ description: "Aprueba presupuestos de maestros, cierra obras y mira Resultados." }),
    admin: z.boolean().meta({ description: "Crea clientes, usuarios y llaves de la API." }),
  })
  .meta({ id: "EquipoPersona", description: "Una persona activa del equipo de Proges." });
export type EquipoPersona = z.infer<typeof EquipoPersona>;

export const EquipoRespuesta = z
  .object({ items: z.array(EquipoPersona) })
  .meta({ id: "EquipoRespuesta", description: "Las personas activas del equipo de Proges, por nombre." });
export type EquipoRespuesta = z.infer<typeof EquipoRespuesta>;

export const ClienteBasico = z
  .object({ id: Id, nombre: z.string() })
  .meta({ id: "ClienteBasico", description: "Un cliente activo: solo su id y su nombre, para elegirlo en un filtro o en un formulario." });
export type ClienteBasico = z.infer<typeof ClienteBasico>;

export const ClientesActivos = z
  .object({ items: z.array(ClienteBasico) })
  .meta({ id: "ClientesActivos", description: "Los clientes activos, por nombre." });
export type ClientesActivos = z.infer<typeof ClientesActivos>;
