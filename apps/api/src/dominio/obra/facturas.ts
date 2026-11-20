// Facturas del maestro asignadas a una obra (ADR 0014, punto 3 y 4).
//
// El maestro le factura a Proges y esa factura (si está en Odoo) puede cubrir una o varias obras.
// Aquí el equipo decide cuánto de cada factura es de ESTA obra: eso es una «asignación». De Odoo
// solo se guarda el id de la factura y el monto asignado; su total, su estado y su pago se leen de
// Odoo cada vez que se mira. Si la factura no está en Odoo, se anota a mano («fuera de Odoo»).
//
// Regla de plata: la suma asignada de una factura, entre TODAS las obras, nunca pasa su total. Se
// comprueba en una transacción con un candado por factura: dos personas asignando la misma factura
// a la vez no pueden pasarse del total.
import { db, ORG_PROGES, Prisma } from "@proges/db";
import type * as contrato from "@proges/contrato";
import type { Quien } from "../../acceso/quien";
import { ErrorApi } from "../../errores";
import type { Odoo } from "../../integraciones/tipos";
import { aFechaISO, aMonto } from "../../util/al-contrato";
import { espacioParaEscribirEn, exigirEquipo } from "../../permisos";
import { aFechaCivil, textoONull } from "./formulario";
import { asignableRestante } from "./obra";
import { desdeAfuera, exigirAbierto, servicioParaEscribir } from "./permisos-obra";

const formatoPesos = new Intl.NumberFormat("es-CL");

// Cuánto de cada factura ya está asignado, entre todas las obras. Solo es una suma: no entrega
// ningún dato de las obras de otros clientes.
async function asignadoPorFactura(odooMoveIds: number[]): Promise<Map<number, number>> {
  const filas = await db.facturaMaestro.groupBy({
    by: ["odooMoveId"],
    where: { odooMoveId: { in: odooMoveIds } },
    _sum: { montoAsignado: true },
  });
  const mapa = new Map<number, number>();
  for (const f of filas) if (f.odooMoveId !== null) mapa.set(f.odooMoveId, Number(f._sum.montoAsignado?.toString() ?? 0));
  return mapa;
}

// Las facturas de proveedor de un maestro en Odoo, con cuánto de cada una ya está asignado.
export async function facturasOdooDeMaestro(odoo: Odoo, maestroId: string): Promise<contrato.FacturasOdooRespuesta> {
  const maestro = await db.maestro.findFirst({
    where: { id: maestroId, organizationId: ORG_PROGES },
    select: { odooPartnerId: true },
  });
  if (!maestro) throw new ErrorApi(404, "No se encontró lo que buscas.");
  const facturas = await desdeAfuera("Odoo", () => odoo.facturasDeProveedor(maestro.odooPartnerId));
  const asignadas = await asignadoPorFactura(facturas.map((f) => f.id));
  return {
    items: facturas.map((f) => {
      const asignado = asignadas.get(f.id) ?? 0;
      return {
        odooMoveId: f.id,
        numero: f.numero,
        fecha: f.fecha ? aFechaISO(f.fecha) : null,
        total: aMonto(f.total, "CLP"),
        estado: f.estado,
        pendiente: aMonto(f.pendiente, "CLP"),
        asignado: aMonto(asignado, "CLP"),
        asignable: aMonto(asignableRestante(f.total, asignado), "CLP"),
      };
    }),
  };
}

// Asigna (parte de) una factura de proveedor de Odoo a esta obra.
export async function asignarFactura(
  quien: Quien,
  odoo: Odoo,
  servicioId: string,
  pedido: contrato.FacturaAsignar,
): Promise<contrato.AsignacionRespuesta> {
  const { persona, orgId, servicio } = await servicioParaEscribir(quien, servicioId);
  exigirAbierto(servicio.estado);
  const { odooMoveId } = pedido;
  const monto = Number(pedido.monto.valor);

  const maestro = await db.maestro.findFirst({
    where: { id: pedido.maestroId, organizationId: ORG_PROGES },
    select: { id: true, odooPartnerId: true },
  });
  if (!maestro) throw new ErrorApi(400, "Ese maestro no existe.", { maestroId: "Ese maestro no existe." });

  // La factura tiene que ser de ese maestro en Odoo: se lee de nuevo, no se confía en la web.
  const facturas = await desdeAfuera("Odoo", () => odoo.facturasDeProveedor(maestro.odooPartnerId));
  const factura = facturas.find((f) => f.id === odooMoveId);
  if (!factura) throw new ErrorApi(400, "Esa factura no es de este maestro en Odoo.", { odooMoveId: "No es de este maestro en Odoo." });
  if (factura.estado === "anulada") throw new ErrorApi(409, "Esa factura está anulada en Odoo.");

  return db.$transaction(async (tx) => {
    // Candado por factura: quien llegue segundo espera a que el primero termine, y recién ahí
    // cuenta lo ya asignado. Se libera solo al terminar la transacción.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${odooMoveId}::bigint)`;

    const yaAqui = await tx.facturaMaestro.findFirst({
      where: { servicioEnCursoId: servicio.id, odooMoveId },
      select: { id: true },
    });
    if (yaAqui) {
      throw new ErrorApi(409, "Esa factura ya está asignada a esta obra: quita la asignación y hazla de nuevo con el monto correcto.");
    }

    const suma = await tx.facturaMaestro.aggregate({ where: { odooMoveId }, _sum: { montoAsignado: true } });
    const restante = asignableRestante(factura.total, Number(suma._sum.montoAsignado?.toString() ?? 0));
    if (monto > restante) {
      const mensaje = `Solo quedan ${formatoPesos.format(restante)} pesos por asignar de esa factura.`;
      throw new ErrorApi(409, mensaje, { monto: mensaje });
    }

    const creada = await tx.facturaMaestro.create({
      data: {
        organizationId: orgId,
        servicioEnCursoId: servicio.id,
        maestroId: maestro.id,
        odooMoveId,
        montoAsignado: new Prisma.Decimal(pedido.monto.valor),
        asignadaPorId: persona.usuario.id,
      },
      select: { id: true },
    });
    return { id: creada.id };
  });
}

// Anota a mano una factura «fuera de Odoo»: su monto y si está pagada se escriben aquí. Las cuentas
// la suman igual que a las de Odoo.
export async function anotarFacturaManual(
  quien: Quien,
  servicioId: string,
  pedido: contrato.FacturaManual,
): Promise<contrato.AsignacionRespuesta> {
  const { persona, orgId, servicio } = await servicioParaEscribir(quien, servicioId);
  exigirAbierto(servicio.estado);
  const maestro = await db.maestro.findFirst({
    where: { id: pedido.maestroId, organizationId: ORG_PROGES, activo: true },
    select: { id: true },
  });
  if (!maestro) throw new ErrorApi(400, "Ese maestro no está disponible.", { maestroId: "Ese maestro no está disponible." });

  const creada = await db.facturaMaestro.create({
    data: {
      organizationId: orgId,
      servicioEnCursoId: servicio.id,
      maestroId: maestro.id,
      odooMoveId: null,
      numero: textoONull(pedido.numero),
      fecha: aFechaCivil(pedido.fecha),
      pagada: pedido.pagada,
      nota: textoONull(pedido.nota),
      montoAsignado: new Prisma.Decimal(pedido.monto.valor),
      asignadaPorId: persona.usuario.id,
    },
    select: { id: true },
  });
  return { id: creada.id };
}

// Quita una asignación (de Odoo o manual). La factura de Odoo no se toca: solo deja de estar
// asignada a esta obra y su monto vuelve a quedar disponible.
export async function quitarFactura(quien: Quien, servicioId: string, facturaId: string): Promise<void> {
  exigirEquipo(quien);
  const asignacion = await db.facturaMaestro.findFirst({
    where: { id: facturaId, servicioEnCursoId: servicioId },
    select: { id: true, organizationId: true, servicioEnCurso: { select: { estado: true } } },
  });
  await espacioParaEscribirEn(quien, asignacion?.organizationId);
  if (!asignacion) throw new ErrorApi(404, "No se encontró lo que buscas."); // ya dio 404 arriba
  exigirAbierto(asignacion.servicioEnCurso.estado);
  await db.facturaMaestro.delete({ where: { id: asignacion.id } });
}
