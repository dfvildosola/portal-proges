"use server";
// Las acciones de servidor de las tareas: marcar hecha (o deshacer) y crear una tarea nueva. Las
// usan Hoy, la ficha del servicio y Repartir.
//
// Qué pantallas se refrescan: marcar una tarea NO refresca Hoy a propósito. Si lo hiciera, la tarea
// recién marcada desaparecería de la lista de golpe y no se podría deshacer un toque equivocado.
// Hoy se actualiza solo la próxima vez que se abre.
import type { Tarea } from "@proges/contrato";
import { ejecutar, textoDe, type ResultadoAccion } from "@/lib/acciones";
import { llamar } from "@/lib/api";

// Las pantallas que muestran tareas de un servicio y se refrescan al cambiar una.
function rutasDelServicio(servicioId: string | undefined): string[] {
  return [...(servicioId ? [`/servicios/${servicioId}`] : []), "/servicios", "/inicio", "/repartir"];
}

/** Marca una tarea como hecha (`hecha: true`) o la deja abierta otra vez (`hecha: false`). */
export async function marcarTarea(tareaId: string, hecha: boolean, servicioId?: string): Promise<ResultadoAccion> {
  return ejecutar(() => llamar<Tarea>("PATCH", `/v1/tareas/${encodeURIComponent(tareaId)}`, { cuerpo: { hecha } }), {
    revalidar: rutasDelServicio(servicioId),
  });
}

/** Crea una tarea en un servicio. Campos: servicioId, que, responsableId (vacío = nadie), vence. */
export async function crearTarea(_anterior: ResultadoAccion | null, datos: FormData): Promise<ResultadoAccion> {
  const servicioId = textoDe(datos, "servicioId");
  if (!servicioId) throw new Error("crearTarea: falta el servicioId en el formulario.");
  return ejecutar(
    () =>
      llamar<Tarea>("POST", `/v1/servicios/${encodeURIComponent(servicioId)}/tareas`, {
        cuerpo: {
          que: textoDe(datos, "que") ?? "",
          responsableId: textoDe(datos, "responsableId") ?? null,
          vence: textoDe(datos, "vence") ?? null,
        },
      }),
    { revalidar: [...rutasDelServicio(servicioId), "/hoy"] },
  );
}
