// Lo que sale hacia el dueño o hacia el equipo, campo por campo.
//
// La regla de oro (apps/api/LEEME.md): todo lo que sale hacia un dueño o una llave pasa por aquí
// y se arma NUEVO, listando lo que sí sale. Nunca `{ ...registro }`: así un campo nuevo en la
// base no se cuela solo hacia el dueño. Lo que el dueño NO recibe: nombre ni contacto de los
// interesados, quién mostró la propiedad, quién ofertó, la nota interna de la oferta, quién
// mostró u anotó cada cosa, y las ofertas que Proges todavía no le muestra.
import type {
  Prisma,
  AnuncioCifra,
  Anuncio as AnuncioDb,
  Evento,
  Oferta as OfertaDb,
  Usuario,
  Visita as VisitaDb,
  AnuncioEstado,
  OfertaEstado,
  PrecioOrigen,
  RespuestaOferta,
} from "@proges/db";
import type {
  VentaAnuncio,
  VentaAnuncioConCifras,
  VentaAnuncioEstado,
  VentaCifra,
  VentaCambioPrecio,
  VentaCambioPrecioEquipo,
  VentaOferta,
  VentaOfertaEquipo,
  VentaOfertaEstado,
  VentaPrecioOrigen,
  VentaReporte,
  VentaReporteEquipo,
  VentaRespuestaOferta,
  VentaVisita,
  VentaVisitaEquipo,
} from "@proges/contrato";
import { aFechaHoraISO, aFechaISO, aMonto } from "../../util/al-contrato";
import { hoyChile } from "../../util/fechas";
import {
  diasPublicada,
  esperaRespuestaDueno,
  mejorOferta,
  seriePorSemana,
  sumarCifras,
} from "./indicadores";

// Las listas del contrato (que no puede importar la base) tienen que calzar exacto con los enums
// de la base. Si alguien agrega un valor en un lado y no en el otro, `npm run tipos` falla aquí.
type Iguales<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const ofertaEstadoCalza: Iguales<OfertaEstado, VentaOfertaEstado> = true;
const respuestaCalza: Iguales<RespuestaOferta, VentaRespuestaOferta> = true;
const anuncioEstadoCalza: Iguales<AnuncioEstado, VentaAnuncioEstado> = true;
const origenCalza: Iguales<PrecioOrigen, VentaPrecioOrigen> = true;
void [ofertaEstadoCalza, respuestaCalza, anuncioEstadoCalza, origenCalza];

type Persona = Pick<Usuario, "id" | "nombre">;

const persona = (u: Persona | null | undefined) => (u ? { id: u.id, nombre: u.nombre } : null);

// ---------------------------------------------------------------------------
// Piezas sueltas (también las usan las rutas de escritura)
// ---------------------------------------------------------------------------

export function visitaParaDueno(v: VisitaDb): VentaVisita {
  return {
    id: v.id,
    fecha: aFechaISO(v.fecha),
    evaluacion: v.evaluacion,
    comentario: v.comentario,
  };
}

export function visitaParaEquipo(v: VisitaDb & { realizadaPor: Persona | null }): VentaVisitaEquipo {
  return {
    ...visitaParaDueno(v),
    realizadaPor: persona(v.realizadaPor),
    interesadoNombre: v.interesadoNombre,
    interesadoContacto: v.interesadoContacto,
  };
}

export function ofertaParaDueno(o: OfertaDb): VentaOferta {
  return {
    id: o.id,
    fecha: aFechaISO(o.fecha),
    monto: aMonto(o.monto, o.moneda),
    estado: o.estado,
    recomendacion: o.recomendacion,
    mostradaAlDuenoEl: o.mostradaAlDuenoEl ? aFechaHoraISO(o.mostradaAlDuenoEl) : null,
    respuestaDelDueno:
      o.respuestaDueno && o.respondidaEl
        ? {
            respuesta: o.respuestaDueno,
            contraoferta: o.contraofertaMonto ? aMonto(o.contraofertaMonto, o.moneda) : null,
            respondidaEl: aFechaHoraISO(o.respondidaEl),
          }
        : null,
  };
}

export type OfertaConPersonas = OfertaDb & { mostradaPor: Persona | null; respondidaPor: Persona | null };

export function ofertaParaEquipo(o: OfertaConPersonas): VentaOfertaEquipo {
  return {
    ...ofertaParaDueno(o),
    oferente: o.oferente,
    nota: o.nota,
    mostradaPor: persona(o.mostradaPor),
    respondidaPor: persona(o.respondidaPor),
  };
}

export function anuncioParaContrato(a: AnuncioDb): VentaAnuncio {
  return { id: a.id, portal: a.portal, url: a.url, estado: a.estado, desde: aFechaISO(a.desde) };
}

export function cifraParaContrato(c: Pick<AnuncioCifra, "semana" | "vistas" | "consultas">): VentaCifra {
  return { semana: aFechaISO(c.semana), vistas: c.vistas, consultas: c.consultas };
}

export function cambioDePrecio(e: Evento): VentaCambioPrecio | null {
  // Un evento PRECIO sin moneda no debería existir; si pasa, no se inventa una: se omite.
  if (e.tipo !== "PRECIO" || !e.moneda) return null;
  return {
    fecha: aFechaISO(hoyChile(e.fecha)),
    anterior: e.anterior === null ? null : aMonto(e.anterior, e.moneda),
    nuevo: aMonto(e.nuevo, e.moneda),
    origen: e.origen,
  };
}

export function cambioDePrecioEquipo(e: Evento & { autor: Persona | null }): VentaCambioPrecioEquipo | null {
  const base = cambioDePrecio(e);
  return base ? { ...base, motivo: e.motivo, autor: e.autor?.nombre ?? null } : null;
}

// ---------------------------------------------------------------------------
// El reporte
// ---------------------------------------------------------------------------

// Lo que la ruta lee de la base para armar el reporte (ver datos.ts).
export type DatosDelReporte = {
  servicio: {
    id: string;
    tipo: "VENTA" | "ARRIENDO";
    estado: "ABIERTO" | "TERMINADO" | "CANCELADO";
    precio: Prisma.Decimal | null;
    precioMoneda: "CLP" | "UF" | null;
    esperandoA: string | null;
    recomendacion: string | null;
    recomendacionFecha: Date | null;
    cerradoEl: Date | null;
  };
  eventosPrecio: (Evento & { autor: Persona | null })[]; // del más antiguo al más nuevo
  visitas: (VisitaDb & { realizadaPor: Persona | null })[]; // de la más reciente a la más antigua
  ofertas: OfertaConPersonas[]; // de la más reciente a la más antigua
  anuncios: (AnuncioDb & { cifras: AnuncioCifra[] })[];
  hoy: Date;
};

// Las partes del reporte que son iguales para el dueño y el equipo.
function parteComun(d: DatosDelReporte, ofertasVisibles: OfertaConPersonas[]) {
  const { servicio } = d;
  const todasLasCifras = d.anuncios.flatMap((a) => a.cifras);
  const sumas = sumarCifras(todasLasCifras);
  const mejor = mejorOferta(ofertasVisibles, servicio.precioMoneda);
  return {
    servicioId: servicio.id,
    tipo: servicio.tipo,
    estado: servicio.estado,
    precio: servicio.precio && servicio.precioMoneda ? aMonto(servicio.precio, servicio.precioMoneda) : null,
    diasPublicada: diasPublicada(
      d.anuncios.map((a) => a.desde),
      d.hoy,
      servicio.cerradoEl,
    ),
    totales: {
      visitas: d.visitas.length,
      vistas: sumas.vistas,
      consultas: sumas.consultas,
      ofertas: ofertasVisibles.length,
    },
    mejor,
    esperaRespuestaDueno: esperaRespuestaDueno(d.ofertas, servicio.esperandoA),
    recomendacion: servicio.recomendacion
      ? {
          texto: servicio.recomendacion,
          fecha: servicio.recomendacionFecha ? aFechaISO(hoyChile(servicio.recomendacionFecha)) : null,
        }
      : null,
    anuncios: d.anuncios.map((a): VentaAnuncioConCifras => {
      const cifras = [...a.cifras].sort((x, y) => x.semana.getTime() - y.semana.getTime());
      const suma = sumarCifras(cifras);
      return { ...anuncioParaContrato(a), vistas: suma.vistas, consultas: suma.consultas, semanas: cifras.map(cifraParaContrato) };
    }),
    porSemana: seriePorSemana(
      todasLasCifras,
      d.visitas.map((v) => v.fecha),
    ).map((s) => ({ ...s, semana: aFechaISO(s.semana) })),
  };
}

// Para el dueño y la llave. Solo las ofertas que Proges ya le mostró; sin interesados, sin
// oferentes, sin notas, sin autores.
export function reporteParaDueno(d: DatosDelReporte): VentaReporte {
  const mostradas = d.ofertas.filter((o) => o.mostradaAlDuenoEl !== null);
  const { mejor, ...comun } = parteComun(d, mostradas);
  return {
    ...comun,
    historiaPrecio: d.eventosPrecio.flatMap((e) => cambioDePrecio(e) ?? []),
    mejorOferta: mejor ? ofertaParaDueno(mejor) : null,
    visitas: d.visitas.map(visitaParaDueno),
    ofertas: mostradas.map(ofertaParaDueno),
  };
}

// Para el equipo de Proges: todo, con nombres y notas.
export function reporteParaEquipo(d: DatosDelReporte): VentaReporteEquipo {
  const { mejor, ...comun } = parteComun(d, d.ofertas);
  return {
    ...comun,
    historiaPrecio: d.eventosPrecio.flatMap((e) => cambioDePrecioEquipo(e) ?? []),
    mejorOferta: mejor ? ofertaParaEquipo(mejor) : null,
    visitas: d.visitas.map(visitaParaEquipo),
    ofertas: d.ofertas.map(ofertaParaEquipo),
  };
}
