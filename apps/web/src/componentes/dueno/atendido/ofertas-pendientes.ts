// Busca las ofertas que Proges ya le mostró al dueño y que él todavía no responde. La API no tiene
// una lista de ofertas de todo el cliente: se pide el reporte de cada venta o arriendo abierto
// (son pocos) y se juntan aquí. Lo usan el inicio y el seguimiento de un servicio.
import type { ServicioTipo, TrabajoPropiedad, VentaOferta, VentaReporte } from "@proges/contrato";
import { ErrorDeApi, pedir } from "@/lib/api";

export type OfertaPorResponder = {
  servicio: { id: string; tipo: ServicioTipo; nombre: string };
  propiedad: TrabajoPropiedad;
  oferta: VentaOferta;
};

type ServicioParaBuscar = { id: string; tipo: ServicioTipo; nombre: string; propiedad: TrabajoPropiedad };

/** Una oferta espera al dueño cuando se le mostró, está vigente y todavía no responde. */
export function esperaAlDueno(o: VentaOferta): boolean {
  return o.estado === "RECIBIDA" && o.mostradaAlDuenoEl !== null && o.respuestaDelDueno === null;
}

export type ResultadoDeOfertas = { pendientes: OfertaPorResponder[]; error: string | null };

export async function ofertasPorResponder(servicios: ServicioParaBuscar[]): Promise<ResultadoDeOfertas> {
  const conVenta = servicios.filter((s) => s.tipo === "VENTA" || s.tipo === "ARRIENDO");
  try {
    const reportes = await Promise.all(
      conVenta.map((s) => pedir<VentaReporte>(`/v1/servicios/${encodeURIComponent(s.id)}/venta`)),
    );
    const pendientes = reportes.flatMap((reporte, i) => {
      const servicio = conVenta[i];
      return reporte.ofertas.filter(esperaAlDueno).map((oferta) => ({
        servicio: { id: servicio.id, tipo: servicio.tipo, nombre: servicio.nombre },
        propiedad: servicio.propiedad,
        oferta,
      }));
    });
    return { pendientes, error: null };
  } catch (error) {
    // Un fallo aquí no debe tumbar la pantalla entera: se muestra el mensaje en este bloque.
    if (error instanceof ErrorDeApi) return { pendientes: [], error: error.mensaje };
    throw error;
  }
}
