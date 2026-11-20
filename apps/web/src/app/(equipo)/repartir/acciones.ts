"use server";
// Lo que se guarda desde Repartir. Cada acción llama a la API y, si sale bien, refresca Repartir y
// Inicio (las dos pantallas muestran lo mismo desde ángulos distintos) y las fichas de servicio.
import { ejecutar, textoDe, type ResultadoAccion } from "@/lib/acciones";
import { llamar } from "@/lib/api";

const REFRESCAR = ["/repartir", "/inicio", "/servicios"];

// Un campo de «elige a alguien» vacío significa «sin responsable»: la API lo espera como null.
function responsableDe(datos: FormData): string | null {
  return textoDe(datos, "responsableId") ?? null;
}

/** Pone o cambia el responsable de un servicio (desde la lista de «sin responsable»). */
export async function asignarResponsableDeServicio(
  _anterior: ResultadoAccion | null,
  datos: FormData,
): Promise<ResultadoAccion> {
  const servicioId = textoDe(datos, "servicioId");
  if (!servicioId) return { ok: false, error: "Falta elegir el servicio.", campos: {} };
  const responsableId = responsableDe(datos);
  if (!responsableId) {
    return { ok: false, error: "Elige a quién se le asigna.", campos: { responsableId: "Elige a una persona." } };
  }
  return ejecutar(() => llamar("PATCH", `/v1/servicios/${servicioId}`, { cuerpo: { responsableId } }), {
    revalidar: REFRESCAR,
  });
}

/** Le cambia el responsable a una tarea (se llama directo desde el selector «Pasar a…»). */
export async function pasarTarea(tareaId: string, responsableId: string | null): Promise<ResultadoAccion> {
  return ejecutar(() => llamar("PATCH", `/v1/tareas/${tareaId}`, { cuerpo: { responsableId } }), {
    revalidar: REFRESCAR,
  });
}

/** Crea una tarea en un servicio: qué, quién y para cuándo. */
export async function crearTarea(_anterior: ResultadoAccion | null, datos: FormData): Promise<ResultadoAccion> {
  const servicioId = textoDe(datos, "servicioId");
  if (!servicioId) {
    return { ok: false, error: "Elige en qué servicio va la tarea.", campos: { servicioId: "Elige un servicio." } };
  }
  return ejecutar(
    () =>
      llamar("POST", `/v1/servicios/${servicioId}/tareas`, {
        cuerpo: { que: textoDe(datos, "que") ?? "", responsableId: responsableDe(datos), vence: textoDe(datos, "vence") ?? null },
      }),
    { revalidar: [...REFRESCAR, `/servicios/${servicioId}`] },
  );
}

/** Abre un servicio a mano en una propiedad. */
export async function abrirServicio(_anterior: ResultadoAccion | null, datos: FormData): Promise<ResultadoAccion> {
  return ejecutar(
    () =>
      llamar("POST", "/v1/servicios", {
        cuerpo: {
          propiedadId: textoDe(datos, "propiedadId") ?? "",
          servicioId: textoDe(datos, "servicioId") ?? "",
          tipo: textoDe(datos, "tipo"),
          responsableId: responsableDe(datos),
          nota: textoDe(datos, "nota") ?? null,
        },
      }),
    { revalidar: REFRESCAR },
  );
}

/** Acepta un pedido de cliente: elige el servicio del catálogo y quién lo lleva. */
export async function aceptarPedido(_anterior: ResultadoAccion | null, datos: FormData): Promise<ResultadoAccion> {
  const pedidoId = textoDe(datos, "pedidoId");
  if (!pedidoId) return { ok: false, error: "Falta elegir el pedido.", campos: {} };
  return ejecutar(
    () =>
      llamar("POST", `/v1/pedidos/${pedidoId}/aceptar`, {
        cuerpo: {
          servicioId: textoDe(datos, "servicioId") ?? "",
          responsableId: responsableDe(datos),
          nota: textoDe(datos, "nota") ?? null,
        },
      }),
    { revalidar: REFRESCAR },
  );
}

/** Rechaza un pedido; el motivo lo ve quien lo pidió. */
export async function rechazarPedido(_anterior: ResultadoAccion | null, datos: FormData): Promise<ResultadoAccion> {
  const pedidoId = textoDe(datos, "pedidoId");
  if (!pedidoId) return { ok: false, error: "Falta elegir el pedido.", campos: {} };
  return ejecutar(
    () => llamar("POST", `/v1/pedidos/${pedidoId}/rechazar`, { cuerpo: { motivo: textoDe(datos, "motivo") ?? "" } }),
    { revalidar: REFRESCAR },
  );
}
