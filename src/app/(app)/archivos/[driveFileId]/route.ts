// Entrega una foto o un PDF guardado en el Drive de la propiedad (ADR 0015).
//
// Es la única puerta por la que un archivo llega al navegador: Drive nunca da un enlace
// público. Como el guardia de una bodega: antes de entregar la caja, mira quién la pide y si
// esa caja es de un piso que esa persona puede ver.
//
//  - Solo se entrega lo que el portal conoce: una Foto o el PDF de un PresupuestoMaestro.
//    Un id cualquiera de Drive (aunque la cuenta de servicio lo pueda abrir) da «No encontrado».
//  - El espacio se comprueba con el organizationId del registro (exigirLectura), no con nada
//    que mande el navegador.
//  - Un CLIENTE solo ve fotos de notas marcadas para el dueño y fotos de partidas
//    (recepción); nunca el PDF del presupuesto del maestro.
//  - Todo lo que no se puede mostrar responde «No encontrado», para no confirmar que existe.
//  - `?miniatura=1` entrega la miniatura que genera Drive (para las listas); si no la tiene
//    todavía, entrega el original.
import { db } from "@/lib/db";
import { exigirLectura } from "@/lib/org";
import { exigirUsuario } from "@/lib/sesion";
import { leerArchivo, miniatura } from "@/lib/archivos";

const NO_ENCONTRADO = () => new Response("No encontrado", { status: 404 });

export async function GET(request: Request, ctx: { params: Promise<{ driveFileId: string }> }) {
  const usuario = await exigirUsuario();
  const { driveFileId } = await ctx.params;
  const esCliente = usuario.rol === "CLIENTE";

  // ¿De quién es este archivo y puede esta persona verlo?
  let organizationId: string;
  const foto = await db.foto.findUnique({
    where: { driveFileId },
    select: { organizationId: true, partidaId: true, nota: { select: { paraDueno: true } } },
  });
  if (foto) {
    // Un cliente: solo la foto de una nota marcada para él, o la de una partida.
    if (esCliente && !(foto.nota?.paraDueno || foto.partidaId)) return NO_ENCONTRADO();
    organizationId = foto.organizationId;
  } else {
    // El PDF de un presupuesto es solo del equipo: trae el costo del maestro.
    if (esCliente) return NO_ENCONTRADO();
    const presupuesto = await db.presupuestoMaestro.findFirst({
      where: { pdfDriveFileId: driveFileId },
      select: { organizationId: true },
    });
    if (!presupuesto) return NO_ENCONTRADO();
    organizationId = presupuesto.organizationId;
  }

  try {
    await exigirLectura(organizationId);
  } catch {
    // «Sin permiso»: de otro cliente. No se dice que el archivo existe.
    return NO_ENCONTRADO();
  }

  try {
    const pideMiniatura = new URL(request.url).searchParams.get("miniatura") === "1";
    const chica = pideMiniatura ? await miniatura(driveFileId) : null;
    const archivo: { datos: Buffer; mime: string; nombre: string } = chica
      ? { ...chica, nombre: "miniatura" }
      : await leerArchivo(driveFileId);
    const nombre = archivo.nombre;
    return new Response(new Uint8Array(archivo.datos), {
      headers: {
        "Content-Type": archivo.mime,
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(nombre)}`,
        // Privada: solo el navegador de quien pidió puede guardarla, nunca una caché compartida.
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    // Falta la llave de Google, la carpeta no está compartida… el mensaje dice qué hacer.
    return new Response((e as Error).message, { status: 502 });
  }
}
