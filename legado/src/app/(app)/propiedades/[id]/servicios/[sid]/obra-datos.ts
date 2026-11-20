// Los datos de la plata y el avance de una obra, ya leídos y convertidos a números simples, para
// que las secciones de la obra (cuentas, facturas, cierre) usen LOS MISMOS datos y las mismas
// funciones puras de src/lib/obra.ts. Solo para el EQUIPO: aquí hay costos del maestro.
//
// Lo que se guarda en el portal de una factura de Odoo es solo la asignación (cuánto de esa
// factura es de este proyecto). Su total, su estado y lo que falta pagar se leen de Odoo cada
// vez que se mira, para que nunca haya dos versiones de lo mismo. Si Odoo no responde, no se
// inventa nada: se devuelve el mensaje del error y las facturas quedan sin su dato de pago.

import { cache } from "react";
import { db } from "@/lib/db";
import { leerFacturas, type EstadoFactura } from "@/lib/odoo";
import type { FacturaCuenta, PartidaCuenta, PresupuestoCuenta } from "@/lib/obra";

// Una factura asignada al proyecto, lista para mostrar y para las cuentas.
export type FacturaDeObra = {
  id: string; // el id de FacturaMaestro (para quitarla)
  maestroId: string;
  maestroNombre: string;
  odooMoveId: number | null;
  origen: "odoo" | "manual";
  numero: string | null;
  fecha: Date | null;
  montoAsignado: number;
  nota: string | null;
  // Solo las de Odoo, y solo si Odoo respondió y la encontró:
  totalOdoo: number | null;
  estado: EstadoFactura | null;
  pendiente: number | null;
  // Solo las manuales:
  pagada: boolean;
  // Para las cuentas de obra.ts. Una factura de Odoo sin datos cuenta lo asignado y nada pagado.
  cuenta: FacturaCuenta;
  // true si es de Odoo pero no se pudo leer su estado (Odoo caído o no la devolvió).
  sinDatosDeOdoo: boolean;
};

export type PartidaDeObra = PartidaCuenta & {
  id: string;
  recinto: string | null;
  codigo: string | null;
  descripcion: string;
  recepcion: "PENDIENTE" | "CONFORME" | "OBSERVADA";
  observacion: string | null;
  recibidaEl: Date | null;
  quitadaEnOdoo: boolean;
};

export type DatosObra = {
  servicioId: string;
  organizationId: string;
  propertyId: string;
  inicioObra: Date | null;
  presupuestos: PresupuestoCuenta[];
  partidas: PartidaDeObra[];
  facturas: FacturaDeObra[];
  // El mensaje del error si Odoo no respondió al leer las facturas; null si todo bien.
  odooError: string | null;
};

const aNumero = (d: { toString(): string } | null | undefined): number => Number(d?.toString() ?? 0);

// `cache` hace que, dentro de una misma petición, se lea una sola vez aunque la pantalla de la
// obra pida los datos desde varias secciones (cuentas, facturas, cierre): así Odoo se consulta
// una vez por página.
export const cargarDatosDeObra = cache(async (servicioEnCursoId: string): Promise<DatosObra | null> => {
  const servicio = await db.servicioEnCurso.findUnique({
    where: { id: servicioEnCursoId },
    select: { id: true, organizationId: true, propertyId: true, inicioObra: true },
  });
  if (!servicio) return null;

  // Todo se filtra por el proyecto Y por su espacio: dos candados, no uno.
  const donde = { servicioEnCursoId: servicio.id, organizationId: servicio.organizationId };
  const [presupuestos, partidas, asignadas] = await Promise.all([
    db.presupuestoMaestro.findMany({
      where: donde,
      select: { tipo: true, estado: true, total: true, plazoDias: true },
    }),
    db.partida.findMany({
      where: donde,
      orderBy: { posicion: "asc" },
      select: {
        id: true,
        recinto: true,
        codigo: true,
        descripcion: true,
        avance: true,
        precioDueno: true,
        recepcion: true,
        observacion: true,
        recibidaEl: true,
        quitadaEnOdoo: true,
      },
    }),
    db.facturaMaestro.findMany({
      where: donde,
      orderBy: { createdAt: "asc" },
      include: { maestro: { select: { nombre: true } } },
    }),
  ]);

  // Lo que dice Odoo de las facturas asignadas (si tiene id de Odoo).
  const idsOdoo = asignadas.map((f) => f.odooMoveId).filter((id): id is number => id !== null);
  let odooError: string | null = null;
  const deOdoo = new Map<number, Awaited<ReturnType<typeof leerFacturas>>[number]>();
  if (idsOdoo.length > 0) {
    try {
      for (const f of await leerFacturas(idsOdoo)) deOdoo.set(f.id, f);
    } catch (e) {
      odooError = e instanceof Error ? e.message : "No se pudo leer Odoo.";
    }
  }

  const facturas: FacturaDeObra[] = asignadas.map((f) => {
    const montoAsignado = aNumero(f.montoAsignado);
    const base = {
      id: f.id,
      maestroId: f.maestroId,
      maestroNombre: f.maestro.nombre,
      odooMoveId: f.odooMoveId,
      montoAsignado,
      nota: f.nota,
    };
    if (f.odooMoveId === null) {
      return {
        ...base,
        origen: "manual" as const,
        numero: f.numero,
        fecha: f.fecha,
        totalOdoo: null,
        estado: null,
        pendiente: null,
        pagada: f.pagada,
        cuenta: { origen: "manual" as const, montoAsignado, pagada: f.pagada },
        sinDatosDeOdoo: false,
      };
    }
    const o = deOdoo.get(f.odooMoveId);
    if (!o) {
      // Sin datos de Odoo: cuenta lo asignado como facturado y nada como pagado (no se inventa
      // un pago que no se pudo comprobar).
      return {
        ...base,
        origen: "odoo" as const,
        numero: null,
        fecha: null,
        totalOdoo: null,
        estado: null,
        pendiente: null,
        pagada: false,
        cuenta: { origen: "odoo" as const, montoAsignado, total: montoAsignado, pendiente: montoAsignado, estado: "borrador" as const },
        sinDatosDeOdoo: true,
      };
    }
    return {
      ...base,
      origen: "odoo" as const,
      numero: o.numero,
      fecha: o.fecha,
      totalOdoo: o.total,
      estado: o.estado,
      pendiente: o.pendiente,
      pagada: false,
      cuenta: { origen: "odoo" as const, montoAsignado, total: o.total, pendiente: o.pendiente, estado: o.estado },
      sinDatosDeOdoo: false,
    };
  });

  return {
    servicioId: servicio.id,
    organizationId: servicio.organizationId,
    propertyId: servicio.propertyId,
    inicioObra: servicio.inicioObra,
    presupuestos: presupuestos.map((p) => ({
      tipo: p.tipo,
      estado: p.estado,
      total: aNumero(p.total),
      plazoDias: p.plazoDias,
    })),
    partidas: partidas.map((p) => ({
      id: p.id,
      recinto: p.recinto,
      codigo: p.codigo,
      descripcion: p.descripcion,
      avance: p.avance,
      precioDueno: p.precioDueno === null ? null : aNumero(p.precioDueno),
      recepcion: p.recepcion,
      observacion: p.observacion,
      recibidaEl: p.recibidaEl,
      quitadaEnOdoo: p.quitadaEnOdoo,
    })),
    facturas,
    odooError,
  };
});
