// Arma el panel de la obra para quien lo pide: el equipo lo ve entero; un dueño o la llave de un
// cliente, recortado (la regla de oro de LEEME.md).
//
// El recorte del dueño arma un objeto NUEVO, campo por campo, con el tipo del contrato como tipo de
// retorno. Nunca `{ ...registro }`: así una columna nueva en la base no se cuela sola hacia el dueño.
// El dueño ve la orden (lo que se le cobra), el avance y la recepción de cada partida. No recibe
// costos del maestro, presupuestos, facturas, márgenes, el precio de cada partida (solo sirve para
// ponderar el avance) ni la observación del equipo (podría nombrar al maestro).
import type * as contrato from "@proges/contrato";
import { aFechaHoraISO, aFechaISO, aMonto } from "../../util/al-contrato";
import { hoyChile } from "../../util/fechas";
import type { DatosObra } from "./datos";
import {
  avancePonderado,
  cuentasDeObra,
  margenDeObra,
  obraSePuedeCerrar,
  planContraReal,
  resumenRecepcion,
  type PartidaCuenta,
  type PlanContraReal,
  type PresupuestoCuenta,
} from "./obra";

const aNumero = (d: { toString(): string }): number => Number(d.toString());
const clp = (n: number) => aMonto(n, "CLP");

export function presupuestosParaCuenta(presupuestos: DatosObra["presupuestos"]): PresupuestoCuenta[] {
  return presupuestos.map((p) => ({ tipo: p.tipo, estado: p.estado, total: aNumero(p.total), plazoDias: p.plazoDias }));
}

export function partidasParaCuenta(partidas: DatosObra["partidas"]): PartidaCuenta[] {
  return partidas.map((p) => ({
    avance: p.avance,
    recepcion: p.recepcion,
    precioDueno: p.precioDueno === null ? null : aNumero(p.precioDueno),
    quitadaEnOdoo: p.quitadaEnOdoo,
  }));
}

// El plan contra real en la forma del contrato (todo en pesos).
export function planContraRealAContrato(r: PlanContraReal): contrato.PlanContraReal {
  return {
    costo: {
      planificado: clp(r.costo.planificado),
      real: clp(r.costo.real),
      diferencia: clp(r.costo.diferencia),
    },
    plazo: r.plazo,
    partidas: r.partidas,
  };
}

// «Hasta cuándo» corre el plazo real: hoy, o el día del cierre si la obra ya se cerró.
export function hastaDeLaObra(datos: DatosObra): Date {
  return datos.servicio.cerradoEl ? hoyChile(datos.servicio.cerradoEl) : hoyChile();
}

export function planDeLaObra(datos: DatosObra): PlanContraReal {
  return planContraReal({
    presupuestos: presupuestosParaCuenta(datos.presupuestos),
    facturas: datos.facturas.map((f) => f.cuenta),
    partidas: partidasParaCuenta(datos.partidas),
    inicioObra: datos.servicio.inicioObra,
    hasta: hastaDeLaObra(datos),
  });
}

// ---------------------------------------------------------------------------
// Para el dueño
// ---------------------------------------------------------------------------

export function obraParaDueno(datos: DatosObra): contrato.ObraDueno {
  // Lo que Odoo ya no trae no existe para el dueño.
  const vigentes = datos.partidas.filter((p) => !p.quitadaEnOdoo);
  const paraCuenta = partidasParaCuenta(vigentes);

  // Los recintos, en el orden en que aparecen en la orden.
  const grupos: { nombre: string | null; indices: number[] }[] = [];
  vigentes.forEach((p, i) => {
    const grupo = grupos.find((g) => g.nombre === p.recinto);
    if (grupo) grupo.indices.push(i);
    else grupos.push({ nombre: p.recinto, indices: [i] });
  });

  return {
    vista: "dueno",
    servicioId: datos.servicio.id,
    orden: datos.orden
      ? {
          numero: datos.orden.numero,
          total: aMonto(datos.orden.total, datos.orden.moneda),
          anticipado: aMonto(datos.orden.facturado, datos.orden.moneda),
        }
      : null,
    avance: avancePonderado(paraCuenta),
    recepcion: resumenRecepcion(paraCuenta),
    recintos: grupos.map((g) => ({
      nombre: g.nombre,
      avance: avancePonderado(g.indices.map((i) => paraCuenta[i])),
      partidas: g.indices.map((i) => {
        const p = vigentes[i];
        return {
          id: p.id,
          codigo: p.codigo,
          descripcion: p.descripcion,
          cantidad: p.cantidad === null ? null : p.cantidad.toFixed(),
          unidad: p.unidad,
          avance: p.avance,
          recepcion: p.recepcion,
        };
      }),
    })),
  };
}

// ---------------------------------------------------------------------------
// Para el equipo
// ---------------------------------------------------------------------------

export function obraParaEquipo(datos: DatosObra): contrato.ObraEquipo {
  const presupuestos = presupuestosParaCuenta(datos.presupuestos);
  const facturas = datos.facturas.map((f) => f.cuenta);
  const partidas = partidasParaCuenta(datos.partidas);
  const cuentas = cuentasDeObra(presupuestos, facturas);
  const plan = planDeLaObra(datos);

  // El margen solo se calcula si la orden está en pesos, como los maestros.
  const margen =
    datos.orden && datos.orden.moneda === "CLP"
      ? (() => {
          const precio = aNumero(datos.orden.total);
          const m = margenDeObra(precio, plan.costo.planificado, plan.costo.real);
          return {
            precioDueno: clp(precio),
            costoPlanificado: clp(plan.costo.planificado),
            costoReal: clp(plan.costo.real),
            planificado: clp(m.planificado),
            real: clp(m.real),
          };
        })()
      : null;

  return {
    vista: "equipo",
    servicioId: datos.servicio.id,
    estado: datos.servicio.estado,
    inicioObra: datos.servicio.inicioObra ? aFechaISO(datos.servicio.inicioObra) : null,
    fechaComprometida: datos.servicio.fechaComprometida ? aFechaISO(datos.servicio.fechaComprometida) : null,
    orden: datos.orden
      ? {
          numero: datos.orden.numero,
          odooOrderId: datos.orden.odooOrderId,
          total: aMonto(datos.orden.total, datos.orden.moneda),
          facturadoAlDueno: aMonto(datos.orden.facturado, datos.orden.moneda),
          traidaEl: aFechaHoraISO(datos.orden.traidaEl),
        }
      : null,
    partidas: datos.partidas.map((p) => ({
      id: p.id,
      recinto: p.recinto,
      codigo: p.codigo,
      descripcion: p.descripcion,
      cantidad: p.cantidad === null ? null : p.cantidad.toFixed(),
      unidad: p.unidad,
      precioDueno: p.precioDueno === null ? null : aMonto(p.precioDueno, p.moneda),
      avance: p.avance,
      recepcion: p.recepcion,
      observacion: p.observacion,
      recibidaEl: p.recibidaEl ? aFechaHoraISO(p.recibidaEl) : null,
      recibidaPor: p.recibidaPor?.nombre ?? null,
      quitadaEnOdoo: p.quitadaEnOdoo,
      maestro: p.maestro,
      fotos: p.fotos,
    })),
    presupuestos: datos.presupuestos.map((p) => ({
      id: p.id,
      maestro: p.maestro,
      tipo: p.tipo,
      total: aMonto(p.total, "CLP"),
      plazoDias: p.plazoDias,
      estado: p.estado,
      nota: p.nota,
      pdfDriveFileId: p.pdfDriveFileId,
      partidaIds: p.partidas.map((x) => x.id),
      cargadoPor: p.cargadoPor.nombre,
      resueltoPor: p.resueltoPor?.nombre ?? null,
      resueltoEl: p.resueltoEl ? aFechaHoraISO(p.resueltoEl) : null,
      creadoEl: aFechaHoraISO(p.createdAt),
    })),
    facturas: datos.facturas.map((f) => ({
      id: f.id,
      maestro: f.maestro,
      origen: f.origen,
      odooMoveId: f.odooMoveId,
      numero: f.numero,
      fecha: f.fecha ? aFechaISO(f.fecha) : null,
      montoAsignado: clp(f.montoAsignado),
      nota: f.nota,
      totalOdoo: f.totalOdoo === null ? null : clp(f.totalOdoo),
      estado: f.estado,
      pendiente: f.pendiente === null ? null : clp(f.pendiente),
      pagada: f.pagada,
      sinDatosDeOdoo: f.sinDatosDeOdoo,
    })),
    cuentas: {
      aprobado: clp(cuentas.aprobado),
      adicionales: clp(cuentas.adicionales),
      facturado: clp(cuentas.facturado),
      pagado: clp(cuentas.pagado),
      saldo: clp(cuentas.saldo),
    },
    avance: avancePonderado(partidas),
    recepcion: resumenRecepcion(partidas),
    planContraReal: planContraRealAContrato(plan),
    margen,
    sePuedeCerrar: partidas.some((p) => !p.quitadaEnOdoo) && obraSePuedeCerrar(partidas),
    odooError: datos.odooError,
  };
}
