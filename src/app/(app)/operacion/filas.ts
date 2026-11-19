// Las filas que arma la página de Operación y que reparten sus bloques.
//
// Son objetos simples (textos y números): así se pueden pasar a un componente
// de cliente, como la tabla de «por confirmar», sin arrastrar tipos de Prisma.

import type { ServicioTipo } from "@/generated/prisma/enums";
import { diasHasta, hoyChile } from "@/lib/fechas";
import { formatDate } from "@/lib/format";
import { diaChile } from "@/lib/servicios";

// Un servicio abierto, listo para mostrar en una tabla.
export type FilaServicio = {
  id: string; // id del servicio en curso (sirve de enlace)
  clienteId: string; // el espacio del cliente dueño de la propiedad
  cliente: string; // su nombre, para saber de quién es cada servicio
  propertyId: string;
  direccion: string;
  rol: string | null; // el ROL es opcional: la carga inicial no lo trae
  tipo: ServicioTipo;
  servicio: string; // nombre del servicio del catálogo
  etapaId: string;
  etapa: string;
  responsableId: string | null;
  responsable: string | null;
  desde: string; // «12-11-2026 · hace 6 días»
  desdeDias: number; // los mismos días, en número, para ordenar
  porConfirmar: boolean;
};

// Una visita de la semana.
export type FilaVisita = {
  id: string;
  fecha: string; // ya formateada (dd-mm-aaaa)
  clienteId: string;
  cliente: string;
  propertyId: string;
  servicioId: string;
  direccion: string;
  tipo: ServicioTipo;
  hechaPor: string | null;
  evaluacion: number | null; // 1 a 5
};

// Enlace a la página de un servicio. Solo abre si el cliente activo es el dueño de la
// propiedad: por eso junto a cada servicio va el botón «Abrir», que primero cambia de cliente.
export function enlaceServicio(propertyId: string, servicioId: string): string {
  return `/propiedades/${propertyId}/servicios/${servicioId}`;
}

// Desde cuándo está un servicio en su etapa. El cambio de etapa es un instante
// (fecha y hora): se pasa al día de Chile antes de contar, para que dé lo mismo
// en el Mac y en producción (ver `diaChile` en servicios.ts).
export function desdeCuando(
  instante: Date,
  hoy: Date = hoyChile(),
): { texto: string; dias: number } {
  const dia = diaChile(instante);
  const dias = Math.max(0, diasHasta(hoy, dia));
  const hace =
    dias === 0 ? "hoy" : dias === 1 ? "hace 1 día" : `hace ${dias} días`;
  return { texto: `${formatDate(dia)} · ${hace}`, dias };
}
