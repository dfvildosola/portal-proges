// LA ÚNICA PUERTA DE DATOS DEL CLIENTE (sus servicios).
//
// Todo lo que un cliente ve de sus servicios sale de las funciones de este archivo.
// Es como la ventanilla de un banco: el cliente nunca entra a la bóveda, solo
// recibe lo que la ventanilla le pasa, y la ventanilla solo le pasa lo suyo.
//
// Reglas que no se rompen:
// 1. Cada función recibe el Usuario CLIENTE como primer parámetro (no lee la
//    sesión: así se puede probar con un script) y filtra SIEMPRE por su
//    espacio (`usuario.organizationId`), escrito una sola vez en `espacioDe`.
// 2. Cada consulta usa `select` explícito, nunca `include` completo: si alguien
//    agrega una columna a la tabla, no sale al cliente sin que alguien lo decida
//    acá. Lo que NUNCA sale de este archivo: `driveCarpetaId`, `rolSII`, el
//    contacto y el nombre del interesado de una visita, el nombre del oferente
//    ni la nota de una oferta, el autor y el motivo de un cambio de precio, el
//    responsable de un servicio, el enlace del aviso ni el motivo de cierre.
// 3. Un usuario que no es CLIENTE lanza Error("Sin permiso"). Un CLIENTE
//    desactivado no ve nada. Los servicios «por confirmar» (deducidos de las carpetas del
//    Drive en la carga inicial) no se muestran: son una suposición hasta que
//    el equipo los revisa. Los cancelados tampoco.
// 4. Los indicadores los calcula `src/lib/servicios.ts`, igual que en la ficha
//    del equipo: los dos ven siempre la misma cifra.

import type { Usuario } from "@/generated/prisma/client";
import type {
  Currency,
  OfertaEstado,
  PrecioOrigen,
  PropertyType,
  ServicioEstado,
  ServicioTipo,
} from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { diaChile, esComercial, indicadoresComerciales } from "@/lib/servicios";
import type { IndicadoresComerciales } from "@/lib/servicios";
import { hoyChile } from "@/lib/fechas";

// ---------------------------------------------------------------------------
// El espacio: de quién son los datos que puede ver este cliente
// ---------------------------------------------------------------------------

// El espacio del cliente (su organizationId), escrito UNA vez. Un usuario que no es
// CLIENTE lanza «Sin permiso»; un CLIENTE desactivado no ve nada (null).
function espacioDe(usuario: Usuario): string | null {
  if (usuario.rol !== "CLIENTE") throw new Error("Sin permiso");
  return usuario.activo ? usuario.organizationId : null;
}

// Los servicios que un cliente puede ver: abiertos y terminados, y ninguno «por confirmar».
// Los cancelados no se muestran.
const ESTADOS_VISIBLES: ServicioEstado[] = ["ABIERTO", "TERMINADO"];

// ---------------------------------------------------------------------------
// Lo que entrega cada función
// ---------------------------------------------------------------------------

// Un servicio en el panel: lo justo para la tarjeta de la propiedad.
export type ServicioDelPanel = {
  id: string;
  tipo: ServicioTipo;
  nombre: string; // nombre del catálogo
  etapa: string;
  // Solo en venta y arriendo, y solo si ya hay un precio.
  precio: { monto: number; moneda: Currency } | null;
};

export type PropiedadDelPanel = {
  id: string;
  direccion: string;
  comuna: string;
  tipo: PropertyType;
  servicios: ServicioDelPanel[];
  // ¿Algún servicio abierto está en una etapa «propiedad publicada»?
  publicada: boolean;
};

// Un servicio en la lista de la pestaña «Servicios» de una propiedad.
export type ServicioDeLaLista = {
  id: string;
  tipo: ServicioTipo;
  nombre: string;
  estado: ServicioEstado; // solo ABIERTO o TERMINADO
  etapa: string;
  abiertoEl: Date; // día de Chile
  cerradoEl: Date | null; // día de Chile
};

export type CambioDePrecio = {
  fecha: Date; // día de Chile
  anterior: number | null;
  nuevo: number;
  moneda: Currency;
  origen: PrecioOrigen | null;
};

export type VisitaDelCliente = {
  fecha: Date; // «solo fecha»: se muestra con formatDate
  evaluacion: number | null;
  comentario: string | null;
};

export type OfertaDelCliente = {
  fecha: Date; // «solo fecha»
  monto: number;
  moneda: Currency;
  estado: OfertaEstado;
};

// Lo que solo tienen la venta y el arriendo.
export type DatosComerciales = {
  indicadores: IndicadoresComerciales;
  precio: { monto: number; moneda: Currency } | null;
  cambiosDePrecio: CambioDePrecio[];
  visitas: VisitaDelCliente[];
  ofertas: OfertaDelCliente[];
  recomendacion: { texto: string; fecha: Date | null } | null; // fecha: día de Chile
};

// Un servicio con todo lo que el cliente puede ver de él.
export type ServicioDelDetalle = ServicioDeLaLista & {
  propiedad: { id: string; direccion: string; comuna: string };
  // Cada paso de etapa, del más antiguo al más nuevo (solo el nombre de la etapa).
  cambiosDeEtapa: { fecha: Date; etapa: string }[]; // fecha: día de Chile
  comercial: DatosComerciales | null;
};

// ---------------------------------------------------------------------------
// Consultas
// ---------------------------------------------------------------------------

function aMonto(valor: { toString(): string } | null): { monto: number } | null {
  return valor === null ? null : { monto: Number(valor.toString()) };
}

// El panel: sus propiedades con los servicios ABIERTOS de cada una.
export async function propiedadesDelCliente(usuario: Usuario): Promise<PropiedadDelPanel[]> {
  const espacio = espacioDe(usuario);
  if (!espacio) return [];
  const propiedades = await db.property.findMany({
    where: { organizationId: espacio },
    select: {
      id: true,
      direccion: true,
      comuna: true,
      tipo: true,
      servicios: {
        where: { estado: "ABIERTO", porConfirmar: false, organizationId: espacio },
        orderBy: { abiertoEl: "asc" },
        select: {
          id: true,
          tipo: true,
          precio: true,
          precioMoneda: true,
          servicio: { select: { nombre: true } },
          etapa: { select: { nombre: true, propiedadPublicada: true } },
        },
      },
    },
    orderBy: [{ comuna: "asc" }, { direccion: "asc" }],
  });

  return propiedades.map((p) => ({
    id: p.id,
    direccion: p.direccion,
    comuna: p.comuna,
    tipo: p.tipo,
    publicada: p.servicios.some((s) => s.etapa.propiedadPublicada),
    servicios: p.servicios.map((s) => {
      const monto = esComercial(s.tipo) ? aMonto(s.precio) : null;
      return {
        id: s.id,
        tipo: s.tipo,
        nombre: s.servicio.nombre,
        etapa: s.etapa.nombre,
        precio: monto && s.precioMoneda ? { ...monto, moneda: s.precioMoneda } : null,
      };
    }),
  }));
}

// La lista de la pestaña «Servicios» de una propiedad: los abiertos y los terminados. Si la
// propiedad no es de su espacio, la lista sale vacía (igual que si no tuviera servicios).
export async function serviciosDePropiedad(
  usuario: Usuario,
  propertyId: string,
): Promise<ServicioDeLaLista[]> {
  const espacio = espacioDe(usuario);
  if (!espacio) return [];
  const servicios = await db.servicioEnCurso.findMany({
    where: {
      propertyId,
      organizationId: espacio,
      estado: { in: ESTADOS_VISIBLES },
      porConfirmar: false,
    },
    orderBy: { abiertoEl: "desc" },
    select: {
      id: true,
      tipo: true,
      estado: true,
      abiertoEl: true,
      cerradoEl: true,
      servicio: { select: { nombre: true } },
      etapa: { select: { nombre: true } },
    },
  });
  return servicios.map((s) => ({
    id: s.id,
    tipo: s.tipo,
    nombre: s.servicio.nombre,
    estado: s.estado,
    etapa: s.etapa.nombre,
    abiertoEl: diaChile(s.abiertoEl),
    cerradoEl: s.cerradoEl ? diaChile(s.cerradoEl) : null,
  }));
}

// Los eventos guardan los montos como texto: se vuelven número, y si alguno
// está mal guardado se dice cuál (no se esconde).
function textoANumero(texto: string, eventoId: string): number {
  const n = Number(texto);
  if (texto.trim() === "" || Number.isNaN(n)) {
    throw new Error(`El evento ${eventoId} tiene un precio que no es un número: «${texto}»`);
  }
  return n;
}

// Un servicio con su detalle. null si no es del espacio del cliente (o está cancelado o por
// confirmar): la página responde «no encontrada», igual que si no existiera.
export async function servicioParaCliente(
  usuario: Usuario,
  servicioEnCursoId: string,
): Promise<ServicioDelDetalle | null> {
  const espacio = espacioDe(usuario);
  if (!espacio) return null;
  const s = await db.servicioEnCurso.findFirst({
    where: {
      id: servicioEnCursoId,
      organizationId: espacio,
      estado: { in: ESTADOS_VISIBLES },
      porConfirmar: false,
    },
    select: {
      id: true,
      tipo: true,
      estado: true,
      abiertoEl: true,
      cerradoEl: true,
      precio: true,
      precioMoneda: true,
      recomendacion: true,
      recomendacionFecha: true,
      property: { select: { id: true, direccion: true, comuna: true } },
      servicio: { select: { nombre: true } },
      etapa: { select: { nombre: true } },
      eventos: {
        orderBy: { fecha: "asc" },
        select: {
          id: true,
          tipo: true,
          fecha: true,
          anterior: true,
          nuevo: true,
          moneda: true,
          origen: true,
          etapa: { select: { propiedadPublicada: true } },
        },
      },
      visitas: {
        orderBy: { fecha: "desc" },
        select: { fecha: true, evaluacion: true, comentario: true },
      },
      ofertas: {
        orderBy: { fecha: "desc" },
        select: { fecha: true, monto: true, moneda: true, estado: true },
      },
    },
  });
  if (!s) return null;

  const eventosDeEtapa = s.eventos.filter((e) => e.tipo === "ETAPA");
  const base = {
    id: s.id,
    tipo: s.tipo,
    nombre: s.servicio.nombre,
    estado: s.estado,
    etapa: s.etapa.nombre,
    abiertoEl: diaChile(s.abiertoEl),
    cerradoEl: s.cerradoEl ? diaChile(s.cerradoEl) : null,
    propiedad: { id: s.property.id, direccion: s.property.direccion, comuna: s.property.comuna },
    cambiosDeEtapa: eventosDeEtapa.map((e) => ({ fecha: diaChile(e.fecha), etapa: e.nuevo })),
  };
  if (!esComercial(s.tipo)) return { ...base, comercial: null };

  // Cada cambio de precio con su instante original (los indicadores lo usan
  // para ordenar dos cambios del mismo día) y su día de Chile (para mostrarlo).
  const precios = s.eventos.flatMap((e) =>
    e.tipo === "PRECIO" && e.moneda !== null
      ? [
          {
            instante: e.fecha,
            cambio: {
              fecha: diaChile(e.fecha),
              anterior: e.anterior === null ? null : textoANumero(e.anterior, e.id),
              nuevo: textoANumero(e.nuevo, e.id),
              moneda: e.moneda,
              origen: e.origen,
            } satisfies CambioDePrecio,
          },
        ]
      : [],
  );

  const monto = aMonto(s.precio);
  return {
    ...base,
    comercial: {
      // Los mismos indicadores que ve el equipo (src/lib/servicios.ts).
      indicadores: indicadoresComerciales({
        eventosDeEtapa: eventosDeEtapa.map((e) => ({
          fecha: e.fecha,
          publicada: e.etapa?.propiedadPublicada ?? false,
        })),
        eventosDePrecio: precios.map((p) => ({
          fecha: p.instante,
          anterior: p.cambio.anterior,
          nuevo: p.cambio.nuevo,
          moneda: p.cambio.moneda,
        })),
        visitas: s.visitas.map((v) => ({ fecha: v.fecha })),
        hoy: hoyChile(),
        cerradoEl: s.cerradoEl,
      }),
      precio: monto && s.precioMoneda ? { ...monto, moneda: s.precioMoneda } : null,
      cambiosDePrecio: precios.map((p) => p.cambio),
      visitas: s.visitas.map((v) => ({
        fecha: v.fecha,
        evaluacion: v.evaluacion,
        comentario: v.comentario,
      })),
      ofertas: s.ofertas.map((o) => ({
        fecha: o.fecha,
        monto: Number(o.monto.toString()),
        moneda: o.moneda,
        estado: o.estado,
      })),
      recomendacion: s.recomendacion
        ? {
            texto: s.recomendacion,
            fecha: s.recomendacionFecha ? diaChile(s.recomendacionFecha) : null,
          }
        : null,
    },
  };
}
