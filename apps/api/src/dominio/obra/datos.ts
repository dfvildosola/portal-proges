// Lee de la base (y de Odoo) todo lo que el panel de una obra necesita, ya convertido a números
// simples, para que el panel, el cierre y las cuentas usen LOS MISMOS datos y las mismas funciones
// puras de obra.ts. Aquí hay costos del maestro: lo que sale hacia un dueño pasa antes por
// recorte.ts, que arma su objeto campo por campo.
//
// Lo que el portal guarda de una factura de Odoo es solo la asignación (cuánto de esa factura es
// de esta obra). Su total, su estado y lo que falta pagar se leen de Odoo cada vez que se mira,
// para que nunca haya dos versiones de lo mismo. Si Odoo no responde, no se inventa nada: queda el
// mensaje del error y esas facturas cuentan lo asignado como facturado y nada como pagado.
import { db } from "@proges/db";
import type { Odoo } from "../../integraciones/tipos";
import type { EstadoFactura } from "../../integraciones/odoo";
import type { FacturaCuenta } from "./obra";

// Una factura asignada a la obra, lista para mostrar y para las cuentas.
export type FacturaDeObra = {
  id: string; // el id de FacturaMaestro (para quitarla)
  maestro: { id: string; nombre: string };
  odooMoveId: number | null;
  origen: "odoo" | "manual";
  numero: string | null;
  fecha: Date | null;
  montoAsignado: number;
  nota: string | null;
  totalOdoo: number | null;
  estado: EstadoFactura | null;
  pendiente: number | null;
  pagada: boolean | null;
  sinDatosDeOdoo: boolean;
  cuenta: FacturaCuenta;
};

const aNumero = (d: { toString(): string } | null | undefined): number => Number(d?.toString() ?? 0);

// `servicio` es el servicio ya leído y ya revisado por permisos (legible / espacioParaEscribirEn).
// Con `paraDueno` ni siquiera se leen los presupuestos ni las facturas (ni se consulta Odoo): lo
// que no se lee, no se puede colar hacia un dueño por error.
export async function cargarDatosDeObra(
  odoo: Odoo,
  servicio: { id: string; organizationId: string },
  opciones: { paraDueno?: boolean } = {},
) {
  // Todo se filtra por el servicio Y por su espacio: dos candados, no uno.
  const donde = { servicioEnCursoId: servicio.id, organizationId: servicio.organizationId };
  const [datosServicio, orden, partidas, presupuestos, asignadas] = await Promise.all([
    db.servicioEnCurso.findUniqueOrThrow({
      where: { id: servicio.id },
      select: {
        id: true,
        organizationId: true,
        estado: true,
        porConfirmar: true,
        porRevisar: true,
        inicioObra: true,
        fechaComprometida: true,
        cerradoEl: true,
      },
    }),
    db.ordenDueno.findFirst({
      where: donde,
      select: { numero: true, odooOrderId: true, total: true, moneda: true, facturado: true, traidaEl: true },
    }),
    db.partida.findMany({
      where: donde,
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
        recibidaEl: true,
        quitadaEnOdoo: true,
        maestro: { select: { id: true, nombre: true } },
        recibidaPor: { select: { nombre: true } },
        fotos: { orderBy: { createdAt: "asc" }, select: { id: true, driveFileId: true, nombre: true } },
      },
    }),
    opciones.paraDueno ? Promise.resolve([]) : db.presupuestoMaestro.findMany({
      where: donde,
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        tipo: true,
        total: true,
        plazoDias: true,
        estado: true,
        nota: true,
        pdfDriveFileId: true,
        resueltoEl: true,
        createdAt: true,
        maestro: { select: { id: true, nombre: true } },
        cargadoPor: { select: { nombre: true } },
        resueltoPor: { select: { nombre: true } },
        partidas: { select: { id: true } },
      },
    }),
    opciones.paraDueno ? Promise.resolve([]) : db.facturaMaestro.findMany({
      where: donde,
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        odooMoveId: true,
        numero: true,
        fecha: true,
        pagada: true,
        nota: true,
        montoAsignado: true,
        maestro: { select: { id: true, nombre: true } },
      },
    }),
  ]);

  // Lo que dice Odoo de las facturas asignadas (las que tienen id de Odoo).
  const idsOdoo = asignadas.map((f) => f.odooMoveId).filter((id): id is number => id !== null);
  let odooError: string | null = null;
  const deOdoo = new Map<number, Awaited<ReturnType<Odoo["leerFacturas"]>>[number]>();
  if (idsOdoo.length > 0) {
    try {
      for (const f of await odoo.leerFacturas(idsOdoo)) deOdoo.set(f.id, f);
    } catch (e) {
      // No se esconde: el panel muestra este mensaje y marca las facturas «sin datos de Odoo».
      odooError = e instanceof Error ? e.message : "No se pudo leer Odoo.";
    }
  }

  const facturas: FacturaDeObra[] = asignadas.map((f) => {
    const montoAsignado = aNumero(f.montoAsignado);
    const base = { id: f.id, maestro: f.maestro, odooMoveId: f.odooMoveId, montoAsignado, nota: f.nota };
    if (f.odooMoveId === null) {
      return {
        ...base,
        origen: "manual",
        numero: f.numero,
        fecha: f.fecha,
        totalOdoo: null,
        estado: null,
        pendiente: null,
        pagada: f.pagada,
        sinDatosDeOdoo: false,
        cuenta: { origen: "manual", montoAsignado, pagada: f.pagada },
      };
    }
    const o = deOdoo.get(f.odooMoveId);
    if (!o) {
      // Sin datos de Odoo: cuenta lo asignado como facturado y nada como pagado (no se inventa
      // un pago que no se pudo comprobar).
      return {
        ...base,
        origen: "odoo",
        numero: null,
        fecha: null,
        totalOdoo: null,
        estado: null,
        pendiente: null,
        pagada: null,
        sinDatosDeOdoo: true,
        cuenta: { origen: "odoo", montoAsignado, total: montoAsignado, pendiente: montoAsignado, estado: "borrador" },
      };
    }
    return {
      ...base,
      origen: "odoo",
      numero: o.numero,
      fecha: o.fecha,
      totalOdoo: o.total,
      estado: o.estado,
      pendiente: o.pendiente,
      pagada: null,
      sinDatosDeOdoo: false,
      cuenta: { origen: "odoo", montoAsignado, total: o.total, pendiente: o.pendiente, estado: o.estado },
    };
  });

  return { servicio: datosServicio, orden, partidas, presupuestos, facturas, odooError };
}

export type DatosObra = Awaited<ReturnType<typeof cargarDatosDeObra>>;
