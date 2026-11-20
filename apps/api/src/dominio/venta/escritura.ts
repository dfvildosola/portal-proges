// Las comprobaciones que preceden a toda escritura del corretaje: quién es, de qué espacio es
// lo que toca y si el servicio admite cambios. Las rutas las llaman primero y recién después
// escriben. Nunca se usa un organizationId que mande la web: el espacio sale del registro.
import { db, ORG_PROGES, type Anuncio, type Oferta, type Visita } from "@proges/db";
import type { Quien, QuienUsuario } from "../../acceso/quien";
import { ErrorApi } from "../../errores";
import { espacioParaEscribirEn, exigirEquipo } from "../../permisos";
import { exigirServicioAbierto } from "./reglas";

const NO_ENCONTRADO = "No se encontró lo que buscas.";

const SELECCION_SERVICIO = {
  id: true,
  organizationId: true,
  tipo: true,
  estado: true,
  precio: true,
  precioMoneda: true,
  responsableId: true,
} as const;

// Visitas, ofertas, precio y anuncios los anota el equipo (la llave de la API solo lee y el
// dueño solo responde ofertas). Devuelve la persona y el servicio, ya comprobado: existe, es de
// un espacio donde se puede escribir, es de venta o arriendo y sigue abierto.
export async function servicioParaEscribir(quien: Quien, servicioId: string) {
  const persona = exigirEquipo(quien);
  const servicio = await db.servicioEnCurso.findUnique({ where: { id: servicioId }, select: SELECCION_SERVICIO });
  await espacioParaEscribirEn(quien, servicio?.organizationId);
  if (!servicio) throw new ErrorApi(404, NO_ENCONTRADO);
  exigirServicioAbierto(servicio);
  return { persona, servicio };
}

// Lo mismo, partiendo de un registro hijo (una visita, una oferta, un anuncio) por su id.
async function servicioDe(quien: Quien, servicioId: string | undefined, orgDelRegistro: string | undefined) {
  const persona = exigirEquipo(quien);
  await espacioParaEscribirEn(quien, orgDelRegistro);
  if (!servicioId) throw new ErrorApi(404, NO_ENCONTRADO);
  const servicio = await db.servicioEnCurso.findUniqueOrThrow({ where: { id: servicioId }, select: SELECCION_SERVICIO });
  exigirServicioAbierto(servicio);
  return { persona, servicio };
}

export async function visitaParaEscribir(quien: Quien, id: string): Promise<{ persona: QuienUsuario; visita: Visita }> {
  exigirEquipo(quien);
  const visita = await db.visita.findUnique({ where: { id } });
  const { persona } = await servicioDe(quien, visita?.servicioEnCursoId, visita?.organizationId);
  return { persona, visita: visita as Visita };
}

export async function ofertaParaEscribir(quien: Quien, id: string): Promise<{ persona: QuienUsuario; oferta: Oferta }> {
  exigirEquipo(quien);
  const oferta = await db.oferta.findUnique({ where: { id } });
  const { persona } = await servicioDe(quien, oferta?.servicioEnCursoId, oferta?.organizationId);
  return { persona, oferta: oferta as Oferta };
}

export async function anuncioParaEscribir(quien: Quien, id: string): Promise<{ persona: QuienUsuario; anuncio: Anuncio }> {
  exigirEquipo(quien);
  const anuncio = await db.anuncio.findUnique({ where: { id } });
  const { persona } = await servicioDe(quien, anuncio?.servicioEnCursoId, anuncio?.organizationId);
  return { persona, anuncio: anuncio as Anuncio };
}

// Quien mostró la propiedad tiene que ser una persona activa del equipo.
export async function exigirPersonaDelEquipo(id: string, campo: string): Promise<string> {
  const persona = await db.usuario.findFirst({
    where: { id, organizationId: ORG_PROGES, rol: "EQUIPO", activo: true },
    select: { id: true },
  });
  if (!persona) throw new ErrorApi(400, "Esa persona no es del equipo.", { [campo]: "Elige a alguien del equipo." });
  return persona.id;
}
