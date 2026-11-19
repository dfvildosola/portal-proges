// LA ÚNICA PUERTA DE DATOS DEL CLIENTE.
//
// Todo lo que el panel de /cliente muestra sale de las funciones de este archivo.
// Es como la ventanilla de un banco: el cliente nunca entra a la bóveda, solo
// recibe lo que la ventanilla le pasa, y la ventanilla solo le pasa lo suyo.
//
// Reglas que no se rompen:
// 1. Cada función recibe el Usuario CLIENTE como primer parámetro (no lee la
//    sesión: así se puede probar con un script) y filtra SIEMPRE por su
//    organización y por su alcance (`filtroDeAlcance`, escrito una sola vez).
// 2. Cada consulta usa `select` explícito, nunca `include` completo: si alguien
//    agrega una columna a la tabla, no sale al cliente sin que alguien lo decida
//    acá. Lo que NUNCA sale de este archivo: `driveCarpetaId`, `rolSII`, el
//    contacto y el nombre del interesado de una visita, el nombre del oferente
//    ni la nota de una oferta, el autor y el motivo de un cambio de precio, el
//    responsable de un servicio, el enlace del aviso ni el motivo de cierre.
// 3. Un usuario que no es CLIENTE lanza Error("Sin permiso"). Un CLIENTE
//    desactivado, sin grupo, o limitado a sociedades sin ninguna asignada, no
//    ve nada. Los servicios «por confirmar» (deducidos de las carpetas del
//    Drive en la carga inicial) no se muestran: son una suposición hasta que
//    el equipo los revisa.
// 4. Los indicadores los calcula `src/lib/servicios.ts`, igual que en la ficha
//    del equipo: los dos ven siempre la misma cifra.

import type { Prisma, Usuario } from "@/generated/prisma/client";
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
// El alcance: qué propiedades puede ver este cliente
// ---------------------------------------------------------------------------

// Un where que no calza con nada: para el cliente que no tiene permiso de ver nada.
const NO_VE_NADA: Prisma.PropertyWhereInput = { id: { in: [] } };

function exigirCliente(usuario: Usuario): void {
  if (usuario.rol !== "CLIENTE") throw new Error("Sin permiso");
}

// El filtro de alcance, escrito UNA vez. Toda consulta de propiedades del
// cliente lo lleva.
//  - GRUPO: propiedades con al menos un dueño (sociedad) de su grupo.
//  - SOCIEDADES: propiedades con al menos un dueño entre las sociedades que se
//    le asignaron (que además tienen que ser de su grupo).
async function filtroDeAlcance(usuario: Usuario): Promise<Prisma.PropertyWhereInput> {
  exigirCliente(usuario);
  if (!usuario.activo || !usuario.grupoId) return NO_VE_NADA;

  const { organizationId, grupoId } = usuario;

  if (usuario.alcance === "GRUPO") {
    return {
      organizationId,
      owners: { some: { owner: { grupoId, organizationId } } },
    };
  }

  const asignadas = await db.usuarioSociedad.findMany({
    where: { usuarioId: usuario.id, organizationId },
    select: { ownerId: true },
  });
  if (asignadas.length === 0) return NO_VE_NADA;
  return {
    organizationId,
    owners: {
      some: {
        owner: {
          id: { in: asignadas.map((s) => s.ownerId) },
          grupoId,
          organizationId,
        },
      },
    },
  };
}

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
  cambiosDeEtapa: { fecha: Date; etapa: string }[]; // fecha: día de Chile
  visitas: VisitaDelCliente[];
  ofertas: OfertaDelCliente[];
  recomendacion: { texto: string; fecha: Date | null } | null; // fecha: día de Chile
};

export type ServicioDelDetalle = {
  id: string;
  tipo: ServicioTipo;
  nombre: string;
  estado: ServicioEstado; // solo ABIERTO o TERMINADO
  etapa: string;
  abiertoEl: Date; // día de Chile
  cerradoEl: Date | null; // día de Chile
  comercial: DatosComerciales | null;
};

export type PropiedadDelDetalle = {
  id: string;
  direccion: string;
  comuna: string;
  region: string;
  tipo: PropertyType;
  servicios: ServicioDelDetalle[];
};

// ---------------------------------------------------------------------------
// Consultas
// ---------------------------------------------------------------------------

// Nombre del grupo del cliente, para la cabecera. null si no tiene grupo.
export async function grupoDelCliente(usuario: Usuario): Promise<{ nombre: string } | null> {
  exigirCliente(usuario);
  if (!usuario.activo || !usuario.grupoId) return null;
  return db.grupo.findFirst({
    where: { id: usuario.grupoId, organizationId: usuario.organizationId },
    select: { nombre: true },
  });
}

function aMonto(valor: { toString(): string } | null): { monto: number } | null {
  return valor === null ? null : { monto: Number(valor.toString()) };
}

// El panel: sus propiedades con los servicios ABIERTOS de cada una.
export async function propiedadesDelCliente(usuario: Usuario): Promise<PropiedadDelPanel[]> {
  const alcance = await filtroDeAlcance(usuario);
  const propiedades = await db.property.findMany({
    where: alcance,
    select: {
      id: true,
      direccion: true,
      comuna: true,
      tipo: true,
      servicios: {
        where: { estado: "ABIERTO", porConfirmar: false, organizationId: usuario.organizationId },
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

// Los eventos guardan los montos como texto: se vuelven número, y si alguno
// está mal guardado se dice cuál (no se esconde).
function textoANumero(texto: string, eventoId: string): number {
  const n = Number(texto);
  if (texto.trim() === "" || Number.isNaN(n)) {
    throw new Error(`El evento ${eventoId} tiene un precio que no es un número: «${texto}»`);
  }
  return n;
}

// El detalle de una propiedad. null si no está en el alcance del cliente: la
// página responde «no encontrada», igual que si no existiera.
export async function propiedadDelCliente(
  usuario: Usuario,
  propertyId: string,
): Promise<PropiedadDelDetalle | null> {
  const alcance = await filtroDeAlcance(usuario);
  const propiedad = await db.property.findFirst({
    where: { AND: [alcance, { id: propertyId }] },
    select: {
      id: true,
      direccion: true,
      comuna: true,
      region: true,
      tipo: true,
      servicios: {
        // Abiertos y terminados; los cancelados no se muestran.
        where: { estado: { in: ["ABIERTO", "TERMINADO"] }, porConfirmar: false, organizationId: usuario.organizationId },
        orderBy: { abiertoEl: "desc" },
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
      },
    },
  });
  if (!propiedad) return null;

  const hoy = hoyChile();

  const servicios: ServicioDelDetalle[] = propiedad.servicios.map((s) => {
    const base = {
      id: s.id,
      tipo: s.tipo,
      nombre: s.servicio.nombre,
      estado: s.estado,
      etapa: s.etapa.nombre,
      abiertoEl: diaChile(s.abiertoEl),
      cerradoEl: s.cerradoEl ? diaChile(s.cerradoEl) : null,
    };
    if (!esComercial(s.tipo)) return { ...base, comercial: null };

    const eventosDeEtapa = s.eventos.filter((e) => e.tipo === "ETAPA");
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
          hoy,
          cerradoEl: s.cerradoEl,
        }),
        precio: monto && s.precioMoneda ? { ...monto, moneda: s.precioMoneda } : null,
        cambiosDePrecio: precios.map((p) => p.cambio),
        cambiosDeEtapa: eventosDeEtapa.map((e) => ({ fecha: diaChile(e.fecha), etapa: e.nuevo })),
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
  });

  return {
    id: propiedad.id,
    direccion: propiedad.direccion,
    comuna: propiedad.comuna,
    region: propiedad.region,
    tipo: propiedad.tipo,
    servicios,
  };
}
