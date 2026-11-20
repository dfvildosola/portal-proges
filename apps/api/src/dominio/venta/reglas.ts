// Las reglas de negocio del corretaje que no son cálculos del reporte: qué servicio admite
// cambios, qué monto vale, qué estado deja cada respuesta del dueño y qué tarea se le crea al
// corredor. Funciones puras (las que lanzan ErrorApi, lanzan por el dato recibido, no por la base).
// Vienen de legado/src/app/(app)/propiedades/comercial-actions.ts.
import type { Monto, VentaOfertaEstado, VentaRespuestaOferta } from "@proges/contrato";
import { ErrorApi } from "../../errores";
import { formatMoney } from "../../util/format";

// Solo la venta y el arriendo llevan precio, visitas y ofertas.
export function esComercial(tipo: string): boolean {
  return tipo === "VENTA" || tipo === "ARRIENDO";
}

// Un servicio cerrado o cancelado queda como registro: no se le anota nada más.
export function exigirServicioAbierto(servicio: { tipo: string; estado: string }): void {
  if (!esComercial(servicio.tipo)) {
    throw new ErrorApi(400, "Solo la venta y el arriendo llevan precio, visitas, ofertas y anuncios.");
  }
  if (servicio.estado !== "ABIERTO") {
    throw new ErrorApi(409, "El servicio ya está cerrado: no se puede modificar.");
  }
}

// Un monto tiene que ser mayor que cero. `campo` es el nombre del campo para el error.
export function exigirMontoPositivo(monto: Monto, campo: string): void {
  if (!(Number(monto.valor) > 0)) {
    throw new ErrorApi(400, "El monto debe ser mayor que cero.", { [campo]: "El monto debe ser mayor que cero." });
  }
}

// Una visita o una oferta ya ocurrida: no puede ser de mañana. `hoy` = hoyChile().
export function exigirFechaNoFutura(fecha: Date, hoy: Date, campo: string): void {
  if (fecha.getTime() > hoy.getTime()) {
    throw new ErrorApi(400, "La fecha no puede ser futura.", { [campo]: "La fecha no puede ser futura." });
  }
}

// Cada respuesta del dueño deja a la oferta en un estado.
export function estadoTrasRespuesta(respuesta: VentaRespuestaOferta): VentaOfertaEstado {
  switch (respuesta) {
    case "ACEPTA":
      return "ACEPTADA";
    case "CONTRAOFERTA":
      return "CONTRAOFERTADA";
    case "RECHAZA":
      return "RECHAZADA";
  }
}

// El texto de la tarea para el corredor: lo que respondió el dueño y a quién hay que avisarle.
export function textoTareaRespuesta(datos: {
  respuesta: VentaRespuestaOferta;
  oferente: string;
  monto: Monto;
  contraoferta: Monto | null;
}): string {
  const oferta = formatMoney(datos.monto.valor, datos.monto.moneda);
  const decision =
    datos.respuesta === "ACEPTA"
      ? "aceptó"
      : datos.respuesta === "RECHAZA"
        ? "rechazó"
        : `contraofertó ${formatMoney(datos.contraoferta?.valor, datos.contraoferta?.moneda)} a`;
  return `Comunicar la respuesta del dueño al oferente: ${decision} la oferta de ${oferta} de ${datos.oferente}.`;
}

// Lo que el dueño ya vio no se reescribe: desde que se le mostró la oferta, el monto, la moneda y
// la fecha quedan fijos, y desde que la respondió, también el estado (lo que él contestó se
// contestó sobre esa oferta). Solo frena un cambio real: mandar el mismo valor no molesta.
// `cambio` trae lo que la ruta quiere escribir (undefined = no se toca).
export function exigirCambioPermitido(
  oferta: {
    fecha: Date;
    monto: { equals(otro: Monto["valor"]): boolean };
    moneda: string;
    estado: string;
    mostradaAlDuenoEl: Date | null;
    respuestaDueno: string | null;
  },
  cambio: { fecha?: Date; monto?: Monto; estado?: string },
): void {
  if (oferta.mostradaAlDuenoEl !== null) {
    const cambiaFecha = cambio.fecha !== undefined && cambio.fecha.getTime() !== oferta.fecha.getTime();
    const cambiaMonto =
      cambio.monto !== undefined && (cambio.monto.moneda !== oferta.moneda || !oferta.monto.equals(cambio.monto.valor));
    if (cambiaFecha || cambiaMonto) {
      throw new ErrorApi(409, "Esta oferta ya se le mostró al dueño: el monto, la moneda y la fecha ya no se pueden cambiar.");
    }
  }
  // Lo que el dueño respondió no se reescribe. La única salida es CAIDA: el oferente se echó atrás
  // después de la respuesta (por ejemplo, el dueño aceptó y el comprador no firmó la promesa).
  const cambiaEstado = cambio.estado !== undefined && cambio.estado !== oferta.estado;
  if (oferta.respuestaDueno !== null && cambiaEstado && cambio.estado !== "CAIDA") {
    throw new ErrorApi(409, "El dueño ya respondió esta oferta: su estado ya no se puede cambiar, salvo marcarla caída.");
  }
}
