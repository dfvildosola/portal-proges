// Las lecturas de la ficha de una propiedad: leen la base (solo lectura) y arman lo que las rutas
// entregan. La lógica de cálculo está en las funciones puras de esta carpeta (alertas, cifras,
// historial, reparaciones, documentos); aquí solo se carga lo que ellas necesitan.
//
// Dos reglas en todo lo de aquí:
// - Quien llama ya comprobó que la propiedad se puede leer (legible() en la ruta), y las consultas
//   por varias propiedades filtran por los espacios que se leen (espaciosQueLee).
// - `dueno` (es lo que devuelve esDueno(quien): una persona de un cliente o una llave) recorta:
//   un dueño no ve servicios por revisar ni cancelados, y nunca se le cargan los presupuestos de
//   los maestros (ni siquiera para descartarlos después: lo que no se lee no se puede filtrar mal).
import { db, type Prisma, type Property } from "@proges/db";
import type {
  FichaAlerta,
  FichaObra,
  FichaReparaciones,
  FichaResumen,
  FichaServicio,
  HistorialItem,
  PropiedadResumen,
  PropiedadesConsulta,
} from "@proges/contrato";
import { aFechaISO, aMonto } from "../../util/al-contrato";
import { hoyChile } from "../../util/fechas";
import { esperandoDe, datosDePropiedad } from "./recorte";
import { alertasDeFicha } from "./alertas";
import { esNuevo } from "../trabajo/tablero";
import { construirHistorial, type DatosDeHistorial } from "./historial";
import { cifrasDeObras, costoAprobado, margenDeObra, totalPorRecinto } from "./reparaciones";
import { avancePonderado, hayCostoAprobado, planContraReal, type PartidaCuenta, type PresupuestoCuenta } from "../obra/obra";

// Qué servicios existen para quien mira. Nadie ve los cancelados aquí; un dueño tampoco los que
// el equipo todavía no revisó o no confirmó.
export function servicioVisible(dueno: boolean): Prisma.ServicioEnCursoWhereInput {
  return dueno
    ? { estado: { not: "CANCELADO" }, porRevisar: false, porConfirmar: false }
    : { estado: { not: "CANCELADO" } };
}

const dia = (fecha: Date) => hoyChile(fecha);

// ---------------------------------------------------------------------------
// La lista
// ---------------------------------------------------------------------------

export async function listarPropiedades(
  orgIds: string[],
  consulta: PropiedadesConsulta,
  dueno: boolean,
  hoy: Date,
): Promise<{ items: PropiedadResumen[]; total: number }> {
  const enCurso = { ...servicioVisible(dueno), estado: "ABIERTO" as const };
  const where: Prisma.PropertyWhereInput = {
    organizationId: { in: orgIds },
    ...(consulta.comuna ? { comuna: { equals: consulta.comuna, mode: "insensitive" } } : {}),
    ...(consulta.q
      ? {
          OR: [
            { direccion: { contains: consulta.q, mode: "insensitive" } },
            { rolSII: { contains: consulta.q, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(consulta.enCurso === "true" ? { servicios: { some: enCurso } } : {}),
    ...(consulta.enCurso === "false" ? { servicios: { none: enCurso } } : {}),
  };

  const [total, propiedades] = await Promise.all([
    db.property.count({ where }),
    db.property.findMany({
      where,
      orderBy: [{ comuna: "asc" }, { direccion: "asc" }, { id: "asc" }],
      skip: (consulta.pagina - 1) * consulta.porPagina,
      take: consulta.porPagina,
      select: {
        id: true,
        organizationId: true,
        direccion: true,
        comuna: true,
        tipo: true,
        estado: true,
        servicios: {
          where: servicioVisible(dueno),
          select: {
            id: true,
            estado: true,
            abiertoEl: true,
            cerradoEl: true,
            esperandoA: true,
            esperandoDesde: true,
            esperandoDetalle: true,
            porRevisar: true,
            porConfirmar: true,
            responsableId: true,
            servicio: { select: { nombre: true } },
          },
        },
      },
    }),
  ]);

  const servicioIds = propiedades.flatMap((p) => p.servicios.map((s) => s.id));
  const [clientes, notas, eventos] = await Promise.all([
    db.organizacion.findMany({
      where: { id: { in: [...new Set(propiedades.map((p) => p.organizationId))] } },
      select: { id: true, nombre: true },
    }),
    db.nota.groupBy({
      by: ["servicioEnCursoId"],
      where: { servicioEnCursoId: { in: servicioIds }, ...(dueno ? { paraDueno: true } : {}) },
      _max: { createdAt: true },
    }),
    db.evento.groupBy({
      by: ["servicioEnCursoId"],
      where: { servicioEnCursoId: { in: servicioIds } },
      _max: { fecha: true },
    }),
  ]);
  const nombreDe = new Map(clientes.map((c) => [c.id, c.nombre]));
  const ultimaNota = new Map(notas.map((n) => [n.servicioEnCursoId, n._max.createdAt]));
  const ultimoEvento = new Map(eventos.map((e) => [e.servicioEnCursoId, e._max.fecha]));

  const items = propiedades.map((p): PropiedadResumen => {
    const abiertos = p.servicios.filter((s) => s.estado === "ABIERTO");
    const esperando = abiertos
      .filter((s) => s.esperandoA && s.esperandoDesde)
      .sort((a, b) => (a.esperandoDesde as Date).getTime() - (b.esperandoDesde as Date).getTime())[0];

    // Lo último que pasó: el más reciente entre abrir/cerrar un servicio, una nota y un cambio.
    let ultimo: { fecha: Date; texto: string } | null = null;
    const candidato = (fecha: Date | null | undefined, texto: string) => {
      if (fecha && (!ultimo || fecha > ultimo.fecha)) ultimo = { fecha, texto };
    };
    for (const s of p.servicios) {
      candidato(s.abiertoEl, `Servicio abierto: ${s.servicio.nombre}`);
      candidato(s.cerradoEl, `Servicio cerrado: ${s.servicio.nombre}`);
      candidato(ultimaNota.get(s.id), `Nota nueva en ${s.servicio.nombre}`);
      candidato(ultimoEvento.get(s.id), `Cambio en ${s.servicio.nombre}`);
    }
    const hecho = ultimo as { fecha: Date; texto: string } | null;

    return {
      id: p.id,
      clienteId: p.organizationId,
      clienteNombre: nombreDe.get(p.organizationId) ?? "",
      direccion: p.direccion,
      comuna: p.comuna,
      tipo: p.tipo,
      estado: p.estado,
      serviciosEnCurso: abiertos.length,
      // Cuántos están en la columna «Nuevo» del tablero. Es un dato interno del equipo: el dueño no
      // ve los por revisar ni los por confirmar, y quién lleva cada servicio no es asunto suyo.
      serviciosNuevos: dueno
        ? 0
        : abiertos.filter((s) =>
            esNuevo({ porRevisar: s.porRevisar, porConfirmar: s.porConfirmar, sinResponsable: s.responsableId === null }),
          ).length,
      esperandoMasAntiguo: esperando
        ? { ...(esperandoDe(esperando, hoy, dueno) as NonNullable<ReturnType<typeof esperandoDe>>), servicioId: esperando.id }
        : null,
      ultimoHecho: hecho ? { fecha: hecho.fecha.toISOString(), texto: hecho.texto } : null,
    };
  });
  return { items, total };
}

// ---------------------------------------------------------------------------
// El historial
// ---------------------------------------------------------------------------

// Lee las tablas del historial de una propiedad, ya recortadas para quien mira.
export async function cargarDatosDeHistorial(propertyId: string, dueno: boolean): Promise<DatosDeHistorial> {
  const delServicio = { servicioEnCurso: { propertyId, ...servicioVisible(dueno) } };
  const [servicios, notas, eventos, visitas, ofertas, documentos, presupuestos, partidas] = await Promise.all([
    db.servicioEnCurso.findMany({
      where: { propertyId, ...servicioVisible(dueno) },
      select: {
        id: true,
        tipo: true,
        estado: true,
        abiertoEl: true,
        cerradoEl: true,
        motivoCierre: true,
        porRevisar: true,
        porConfirmar: true,
        servicio: { select: { nombre: true } },
      },
    }),
    db.nota.findMany({
      where: { ...delServicio, ...(dueno ? { paraDueno: true } : {}) },
      select: { id: true, servicioEnCursoId: true, texto: true, paraDueno: true, createdAt: true, autor: { select: { nombre: true } } },
    }),
    db.evento.findMany({
      where: delServicio,
      select: { id: true, servicioEnCursoId: true, tipo: true, anterior: true, nuevo: true, moneda: true, motivo: true, fecha: true },
    }),
    db.visita.findMany({
      where: delServicio,
      select: { id: true, servicioEnCursoId: true, fecha: true, evaluacion: true, comentario: true, interesadoNombre: true },
    }),
    db.oferta.findMany({
      where: { ...delServicio, ...(dueno ? { mostradaAlDuenoEl: { not: null } } : {}) },
      select: {
        id: true,
        servicioEnCursoId: true,
        fecha: true,
        monto: true,
        moneda: true,
        oferente: true,
        estado: true,
        mostradaAlDuenoEl: true,
      },
    }),
    db.document.findMany({ where: { propertyId }, select: { id: true, nombre: true, papel: true, createdAt: true } }),
    // Lo que se le paga a los maestros no se le carga a un dueño.
    dueno
      ? Promise.resolve([])
      : db.presupuestoMaestro.findMany({
          where: { ...delServicio, estado: "APROBADO" },
          select: { id: true, servicioEnCursoId: true, tipo: true, total: true, resueltoEl: true, createdAt: true, maestro: { select: { nombre: true } } },
        }),
    db.partida.findMany({
      where: { ...delServicio, recibidaEl: { not: null }, quitadaEnOdoo: false },
      select: { id: true, servicioEnCursoId: true, recinto: true, descripcion: true, recepcion: true, recibidaEl: true, observacion: true },
    }),
  ]);
  return { servicios, notas, eventos, visitas, ofertas, documentos, presupuestos, partidas };
}

export async function historialDe(propertyId: string, dueno: boolean): Promise<HistorialItem[]> {
  return construirHistorial(await cargarDatosDeHistorial(propertyId, dueno), dueno);
}

// ---------------------------------------------------------------------------
// La ficha en una llamada
// ---------------------------------------------------------------------------

const aPresupuestoCuenta = (p: { tipo: "ORIGINAL" | "ADICIONAL"; estado: "RECIBIDO" | "APROBADO" | "RECHAZADO"; total: { toString(): string }; plazoDias: number | null }): PresupuestoCuenta => ({
  tipo: p.tipo,
  estado: p.estado,
  total: Number(p.total.toString()),
  plazoDias: p.plazoDias,
});

export async function fichaResumen(propiedad: Property, dueno: boolean, hoy: Date): Promise<FichaResumen> {
  const [servicios, documentos, contribuciones, historial] = await Promise.all([
    db.servicioEnCurso.findMany({
      where: { propertyId: propiedad.id, ...servicioVisible(dueno) },
      orderBy: { abiertoEl: "asc" },
      select: {
        id: true,
        tipo: true,
        estado: true,
        abiertoEl: true,
        esperandoA: true,
        esperandoDesde: true,
        esperandoDetalle: true,
        porRevisar: true,
        porConfirmar: true,
        servicio: { select: { nombre: true } },
        responsable: { select: { nombre: true } },
        orden: { select: { total: true, moneda: true } },
        // Los presupuestos de los maestros solo se leen para el equipo.
        presupuestos: dueno ? false : { where: { estado: "APROBADO" }, select: { tipo: true, estado: true, total: true, plazoDias: true } },
      },
    }),
    db.document.findMany({
      where: { propertyId: propiedad.id },
      select: { id: true, nombre: true, papel: true, fechaEmision: true, createdAt: true, fechaVencimiento: true },
    }),
    db.propertyTax.findMany({
      where: { propertyId: propiedad.id, estado: "PENDIENTE" },
      select: { id: true, anio: true, cuota: true, fechaVencimiento: true },
    }),
    historialDe(propiedad.id, dueno),
  ]);

  const obras = servicios
    .filter((s) => s.tipo === "OBRA")
    .map((s) => ({
      orden: s.orden,
      costo: dueno ? 0 : costoAprobado((s.presupuestos ?? []).map(aPresupuestoCuenta)),
      conCostoAprobado: !dueno && hayCostoAprobado((s.presupuestos ?? []).map(aPresupuestoCuenta)),
    }));
  const cifras = cifrasDeObras(obras);

  const alertas: FichaAlerta[] = alertasDeFicha({
    tipo: propiedad.tipo,
    estado: propiedad.estado,
    documentos,
    contribuciones: contribuciones,
    hoy,
  });

  const enCurso: FichaServicio[] = servicios
    .filter((s) => s.estado === "ABIERTO")
    .map((s) => ({
      id: s.id,
      tipo: s.tipo,
      nombre: s.servicio.nombre,
      estado: s.estado,
      abiertoEl: aFechaISO(dia(s.abiertoEl)),
      esperando: esperandoDe(s, hoy, dueno),
      ...(dueno
        ? {}
        : {
            responsable: s.responsable?.nombre ?? null,
            nuevo: esNuevo({ porRevisar: s.porRevisar, porConfirmar: s.porConfirmar, sinResponsable: s.responsable === null }),
          }),
    }));

  return {
    propiedad: datosDePropiedad(propiedad),
    cifras: {
      servicios: servicios.length,
      llegoEl: aFechaISO(dia(propiedad.createdAt)),
      cobradoReparaciones: cifras.cobrado,
      ...(dueno ? {} : { costoMaestros: cifras.costo, margen: cifras.margen }),
    },
    alertas,
    serviciosEnCurso: enCurso,
    ultimosHechos: historial.slice(0, 4),
  };
}

// ---------------------------------------------------------------------------
// Reparaciones
// ---------------------------------------------------------------------------

export async function reparacionesDe(propertyId: string, dueno: boolean, hoy: Date): Promise<FichaReparaciones> {
  const servicios = await db.servicioEnCurso.findMany({
    where: { propertyId, tipo: "OBRA", ...servicioVisible(dueno) },
    orderBy: { abiertoEl: "desc" },
    select: {
      id: true,
      estado: true,
      abiertoEl: true,
      cerradoEl: true,
      inicioObra: true,
      servicio: { select: { nombre: true } },
      orden: { select: { numero: true, total: true, moneda: true } },
      presupuestos: dueno ? false : { where: { estado: "APROBADO" }, select: { tipo: true, estado: true, total: true, plazoDias: true } },
      partidas: {
        where: { quitadaEnOdoo: false },
        orderBy: { posicion: "asc" },
        select: {
          id: true,
          recinto: true,
          codigo: true,
          descripcion: true,
          cantidad: true,
          unidad: true,
          precioDueno: true,
          moneda: true,
          avance: true,
          recepcion: true,
          observacion: true,
          quitadaEnOdoo: true,
          _count: { select: { fotos: true } },
        },
      },
    },
  });

  const obras: FichaObra[] = servicios.map((s) => {
    const cuentas: PartidaCuenta[] = s.partidas.map((p) => ({
      avance: p.avance,
      recepcion: p.recepcion,
      precioDueno: p.precioDueno === null ? null : Number(p.precioDueno.toString()),
    }));
    const base: FichaObra = {
      servicioId: s.id,
      nombre: s.servicio.nombre,
      estado: s.estado,
      abiertoEl: aFechaISO(dia(s.abiertoEl)),
      cerradoEl: s.cerradoEl ? aFechaISO(dia(s.cerradoEl)) : null,
      orden: s.orden ? { numero: s.orden.numero, cobrado: aMonto(s.orden.total, s.orden.moneda) } : null,
      avance: avancePonderado(cuentas),
      partidas: s.partidas.map((p) => ({
        id: p.id,
        recinto: p.recinto,
        codigo: p.codigo,
        descripcion: p.descripcion,
        cantidad: p.cantidad ? p.cantidad.toFixed() : null,
        unidad: p.unidad,
        cobrado: p.precioDueno ? aMonto(p.precioDueno, p.moneda) : null,
        avance: p.avance,
        recepcion: p.recepcion,
        fotos: p._count.fotos,
        ...(dueno ? {} : { observacion: p.observacion }),
      })),
    };
    if (dueno) return base;

    const presupuestos = (s.presupuestos ?? []).map(aPresupuestoCuenta);
    const costo = costoAprobado(presupuestos);
    const plan = planContraReal({
      presupuestos,
      facturas: [],
      partidas: cuentas,
      inicioObra: s.inicioObra,
      hasta: s.cerradoEl ? dia(s.cerradoEl) : hoy,
    });
    return { ...base, costoMaestro: aMonto(costo, "CLP"), margen: margenDeObra(s.orden, costo, hayCostoAprobado(presupuestos)), dias: plan.plazo };
  });

  return {
    obras,
    totalPorRecinto: totalPorRecinto(servicios.flatMap((s) => s.partidas)),
  };
}
