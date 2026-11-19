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
//    Tampoco sale NADA del costo de una obra: ni presupuestos ni facturas ni pagos de
//    maestros, ni el nombre de un maestro, ni las tareas, ni las notas que el equipo no
//    marcó «la ve el dueño», ni el precio de las partidas (se usa para ponderar el avance,
//    pero no se entrega).
// 3. Un usuario que no es CLIENTE lanza Error("Sin permiso"). Un CLIENTE
//    desactivado no ve nada. Los servicios «por confirmar» (deducidos de las carpetas del
//    Drive en la carga inicial) no se muestran: son una suposición hasta que
//    el equipo los revisa. Los cancelados tampoco. Los «por revisar» (un pedido que la
//    jefatura todavía no repartió) tampoco: el cliente los ve como pedido, no como proyecto.
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
import { avancePonderado, resumenRecepcion } from "@/lib/obra";
import type { ResumenRecepcion } from "@/lib/obra";

// ---------------------------------------------------------------------------
// El espacio: de quién son los datos que puede ver este cliente
// ---------------------------------------------------------------------------

// El espacio del cliente (su organizationId), escrito UNA vez. Un usuario que no es
// CLIENTE lanza «Sin permiso»; un CLIENTE desactivado no ve nada (null).
function espacioDe(usuario: Usuario): string | null {
  if (usuario.rol !== "CLIENTE") throw new Error("Sin permiso");
  return usuario.activo ? usuario.organizationId : null;
}

// Los servicios que un cliente puede ver: abiertos y terminados, y ninguno «por confirmar» ni
// «por revisar». Los cancelados no se muestran.
export const ESTADOS_VISIBLES: ServicioEstado[] = ["ABIERTO", "TERMINADO"];

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

// Una línea de la orden vista por el dueño: qué se hace y cómo va. Sin precio, sin maestro,
// sin la observación del equipo (podría nombrar al maestro).
export type PartidaDelCliente = {
  id: string;
  codigo: string | null;
  descripcion: string;
  cantidad: number | null;
  unidad: string | null;
  avance: number; // 0 a 100
  recepcion: "PENDIENTE" | "CONFORME" | "OBSERVADA";
};

// Las partidas de un recinto (o «sin recinto» en un servicio suelto) con su avance.
export type RecintoDelCliente = {
  nombre: string | null;
  avance: number; // 0 a 100, ponderado igual que el de la obra
  partidas: PartidaDelCliente[];
};

export type ObraDelCliente = {
  avance: number; // 0 a 100 de toda la obra
  recepcion: ResumenRecepcion;
  recintos: RecintoDelCliente[];
};

// Una nota de la bitácora que el equipo marcó «la ve el dueño». Sin autor ni tarea.
export type NotaDelCliente = {
  id: string;
  fecha: Date; // día de Chile
  texto: string;
  fotos: { driveFileId: string; nombre: string }[]; // se ven por /archivos/<driveFileId>
};

// Un servicio con todo lo que el cliente puede ver de él.
export type ServicioDelDetalle = ServicioDeLaLista & {
  propiedad: { id: string; direccion: string; comuna: string };
  // Cada paso de etapa, del más antiguo al más nuevo (solo el nombre de la etapa).
  cambiosDeEtapa: { fecha: Date; etapa: string }[]; // fecha: día de Chile
  comercial: DatosComerciales | null;
  // Solo si el servicio tiene partidas (una orden enlazada).
  obra: ObraDelCliente | null;
  notas: NotaDelCliente[];
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
        where: { estado: "ABIERTO", porConfirmar: false, porRevisar: false, organizationId: espacio },
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
      porRevisar: false,
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

// Las partidas de una orden agrupadas por recinto, con el avance de cada recinto y el de toda la
// obra. Los avances salen de `src/lib/obra.ts` (el mismo cálculo que ve el equipo). El precio
// solo sirve para ponderar: el resultado no lo lleva. Sin partidas, null.
function obraDelCliente(
  partidas: {
    id: string;
    recinto: string | null;
    codigo: string | null;
    descripcion: string;
    cantidad: { toString(): string } | null;
    unidad: string | null;
    precioDueno: { toString(): string } | null;
    avance: number;
    recepcion: "PENDIENTE" | "CONFORME" | "OBSERVADA";
  }[],
): ObraDelCliente | null {
  if (partidas.length === 0) return null;
  const paraCuenta = partidas.map((p) => ({
    avance: p.avance,
    recepcion: p.recepcion,
    precioDueno: p.precioDueno === null ? null : Number(p.precioDueno.toString()),
  }));

  // Los recintos en el orden en que aparecen en la orden.
  const grupos: { nombre: string | null; indices: number[] }[] = [];
  partidas.forEach((p, i) => {
    const ultimo = grupos.find((g) => g.nombre === p.recinto);
    if (ultimo) ultimo.indices.push(i);
    else grupos.push({ nombre: p.recinto, indices: [i] });
  });

  return {
    avance: avancePonderado(paraCuenta),
    recepcion: resumenRecepcion(paraCuenta),
    recintos: grupos.map((g) => ({
      nombre: g.nombre,
      avance: avancePonderado(g.indices.map((i) => paraCuenta[i])),
      partidas: g.indices.map((i) => {
        const p = partidas[i];
        return {
          id: p.id,
          codigo: p.codigo,
          descripcion: p.descripcion,
          cantidad: p.cantidad === null ? null : Number(p.cantidad.toString()),
          unidad: p.unidad,
          avance: p.avance,
          recepcion: p.recepcion,
        };
      }),
    })),
  };
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
      porRevisar: false,
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
      // La obra: select explícito, sin maestro, sin observación y sin precio al maestro.
      // `precioDueno` se lee solo para ponderar el avance; no se entrega.
      partidas: {
        where: { quitadaEnOdoo: false, organizationId: espacio },
        orderBy: { posicion: "asc" },
        select: {
          id: true,
          recinto: true,
          codigo: true,
          descripcion: true,
          cantidad: true,
          unidad: true,
          precioDueno: true,
          avance: true,
          recepcion: true,
        },
      },
      // Solo las notas marcadas para el dueño. Sin autor ni tarea.
      notas: {
        where: { paraDueno: true, organizationId: espacio },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          texto: true,
          createdAt: true,
          fotos: { orderBy: { createdAt: "asc" }, select: { driveFileId: true, nombre: true } },
        },
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
    obra: obraDelCliente(s.partidas),
    notas: s.notas.map((n) => ({
      id: n.id,
      fecha: diaChile(n.createdAt),
      texto: n.texto,
      fotos: n.fotos.map((f) => ({ driveFileId: f.driveFileId, nombre: f.nombre })),
    })),
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
