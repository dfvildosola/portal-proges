// De lo que guarda la base a lo que dice el contrato, campo por campo.
//
// La regla de oro (LEEME.md): lo que sale hacia un dueño o una llave se arma con una lista de
// lo que SÍ sale, nunca copiando el registro y borrando lo interno. Si mañana se agrega una
// columna a la base, no llega sola a ningún dueño.
//
// Las funciones que reciben `dueno: boolean` (es lo que devuelve esDueno(quien)) dejan fuera
// lo que solo ve el equipo: quién subió un documento, el detalle libre de «esperando a»,
// el costo del maestro y el margen.
import type { Document as DocumentoDB, Owner, Grupo, Property, PropertyAssessment, PropertyOwner, PropertyUnit } from "@proges/db";
import type {
  DocumentoFicha,
  DuenoEntidad,
  FichaEsperando,
  PropiedadAvaluo,
  PropiedadDatos,
  PropiedadDueno,
  PropiedadUnidad,
} from "@proges/contrato";
import { aFechaHoraISO, aFechaISO, aMonto } from "../../util/al-contrato";
import { diasHasta } from "../../util/fechas";

export function datosDePropiedad(p: Property): PropiedadDatos {
  const compra =
    p.compraFecha || p.compraPrecio
      ? {
          fecha: p.compraFecha ? aFechaISO(p.compraFecha) : null,
          precio: p.compraPrecio ? aMonto(p.compraPrecio, p.compraMoneda) : null,
        }
      : null;
  return {
    id: p.id,
    clienteId: p.organizationId,
    rolSII: p.rolSII,
    tipo: p.tipo,
    direccion: p.direccion,
    edificio: p.edificio,
    comuna: p.comuna,
    region: p.region,
    objetivo: p.objetivo,
    estado: p.estado,
    monedaPrincipal: p.monedaPrincipal,
    m2Terreno: p.m2Terreno ? p.m2Terreno.toFixed() : null,
    m2Construidos: p.m2Construidos ? p.m2Construidos.toFixed() : null,
    anoConstruccion: p.anoConstruccion,
    valorComercial: p.valorComercial
      ? {
          monto: aMonto(p.valorComercial, p.valorComercialMoneda),
          fecha: p.valorComercialFecha ? aFechaISO(p.valorComercialFecha) : null,
          fuente: p.valorComercialFuente,
        }
      : null,
    compra,
    // Sin saldo no hay deuda (la ficha dice «sin deuda registrada»), aunque queden otras columnas.
    deuda: p.deudaSaldo
      ? {
          saldo: aMonto(p.deudaSaldo, p.deudaMoneda),
          fecha: p.deudaFecha ? aFechaISO(p.deudaFecha) : null,
          banco: p.deudaBanco,
          dividendo: p.deudaDividendo ? p.deudaDividendo.toFixed() : null,
          termino: p.deudaTermino ? aFechaISO(p.deudaTermino) : null,
        }
      : null,
    exentaContribuciones: p.exentaContribuciones,
    creadaEl: aFechaHoraISO(p.createdAt),
    actualizadaEl: aFechaHoraISO(p.updatedAt),
  };
}

// «Esperando a…» de un servicio. El detalle libre lo escribe el equipo y puede decir cualquier
// cosa: solo sale para el equipo.
export function esperandoDe(
  s: { esperandoA: FichaEsperando["a"] | null; esperandoDesde: Date | null; esperandoDetalle: string | null },
  hoy: Date,
  dueno: boolean,
): FichaEsperando | null {
  if (!s.esperandoA || !s.esperandoDesde) return null;
  const base: FichaEsperando = {
    a: s.esperandoA,
    desde: aFechaISO(s.esperandoDesde),
    dias: Math.max(0, diasHasta(hoy, s.esperandoDesde)),
  };
  return dueno ? base : { ...base, detalle: s.esperandoDetalle };
}

export function unidadDe(u: PropertyUnit): PropiedadUnidad {
  return {
    id: u.id,
    tipo: u.tipo,
    numero: u.numero,
    rolSII: u.rolSII,
    avaluoFiscal: u.avaluoFiscal ? aMonto(u.avaluoFiscal, "CLP") : null,
  };
}

export function avaluoDe(a: PropertyAssessment): PropiedadAvaluo {
  return { id: a.id, anio: a.anio, valor: aMonto(a.valor, "CLP") };
}

export function duenoDe(o: Owner & { grupo: Pick<Grupo, "nombre"> | null }): DuenoEntidad {
  return {
    id: o.id,
    clienteId: o.organizationId,
    nombre: o.nombre,
    rut: o.rut,
    tipo: o.tipo,
    grupoId: o.grupoId,
    grupoNombre: o.grupo?.nombre ?? null,
  };
}

export function propiedadDuenoDe(
  po: Pick<PropertyOwner, "id" | "porcentaje"> & { owner: Owner & { grupo: Pick<Grupo, "nombre"> | null } },
): PropiedadDueno {
  return { id: po.id, porcentaje: po.porcentaje.toFixed(), dueno: duenoDe(po.owner) };
}

export function documentoDe(
  d: DocumentoDB & { subidoPor: { nombre: string } | null },
  dueno: boolean,
): DocumentoFicha {
  const base: DocumentoFicha = {
    id: d.id,
    nombre: d.nombre,
    tipo: d.tipo,
    papel: d.papel,
    fechaEmision: d.fechaEmision ? aFechaISO(d.fechaEmision) : null,
    fechaVencimiento: d.fechaVencimiento ? aFechaISO(d.fechaVencimiento) : null,
    subidoEl: aFechaHoraISO(d.createdAt),
  };
  // blobKey (la dirección del archivo) y extractedText nunca salen: el archivo se pide a
  // GET /v1/documentos/:id/archivo.
  return dueno ? base : { ...base, subidoPor: d.subidoPor?.nombre ?? null };
}
