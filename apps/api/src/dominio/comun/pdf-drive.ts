// Guardar y entregar PDF en el Drive de la propiedad (ADR 0015 y 0017), en un solo lugar.
//
// Piensa en el archivador de la oficina: cada propiedad tiene su carpeta, y el portal deja los PDF
// en la subcarpeta «Portal». Los dos lugares que guardan un PDF (los documentos de la propiedad y
// el presupuesto de un maestro) y los dos que lo entregan usan estas funciones, para que digan lo
// mismo cuando falta la carpeta o Drive falla, y para que nadie entregue un archivo sin revisar
// antes el permiso (eso lo hace cada ruta; aquí solo se arma la respuesta).
import { ErrorApi } from "../../errores";
import type { Drive } from "../../integraciones/tipos";

export const SIN_CARPETA = "Primero enlaza la carpeta de Drive de la propiedad.";

// Sin carpeta enlazada no se sube nada: 409 con la instrucción para arreglarlo.
export function exigirCarpetaDeDrive(property: { driveCarpetaId: string | null }): void {
  if (!property.driveCarpetaId) throw new ErrorApi(409, SIN_CARPETA);
}

// Un fallo de Drive (falta la llave, la carpeta no está compartida…) llega con un mensaje que dice
// qué hacer; se entrega tal cual como 502 («la puerta de al lado falló»), y el detalle queda en el
// registro del servidor.
function falloDeDrive(accion: string, e: unknown): ErrorApi {
  console.error(`[api] Drive falló al ${accion}:`, e);
  return new ErrorApi(502, `No se pudo ${accion} en Drive: ${e instanceof Error ? e.message : "error desconocido"}`);
}

// Sube el PDF a la carpeta «Portal» de la propiedad y devuelve su id de Drive (lo que se guarda en
// la base).
export async function guardarPdf(
  drive: Drive,
  property: { driveCarpetaId: string | null },
  nombre: string,
  datos: Uint8Array,
): Promise<string> {
  exigirCarpetaDeDrive(property);
  try {
    const { driveFileId } = await drive.subirArchivo({ property, nombre, mime: "application/pdf", datos });
    return driveFileId;
  } catch (e) {
    throw falloDeDrive("subir el PDF", e);
  }
}

// El PDF listo para entregar: cuerpo y cabeceras. Quien llama ya comprobó que la persona puede
// verlo. Es privado: ningún intermediario lo guarda, y nunca tiene un enlace público.
export async function leerPdf(drive: Drive, driveFileId: string, nombre: string) {
  let datos: Buffer;
  try {
    ({ datos } = await drive.leerArchivo(driveFileId));
  } catch (e) {
    throw falloDeDrive("leer el PDF", e);
  }
  const nombreSeguro = encodeURIComponent(nombre.replace(/\.pdf$/i, "") + ".pdf");
  return {
    // Se copia a un ArrayBuffer propio: así el cuerpo es un tipo que Response siempre acepta.
    cuerpo: new Uint8Array(datos).buffer as ArrayBuffer,
    cabeceras: {
      // Siempre se entrega como PDF, aunque Drive diga otra cosa del archivo.
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename*=UTF-8''${nombreSeguro}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  };
}

// Manda el PDF a la papelera de Drive. Si falla, no se frena a la persona (la fila de la base ya
// se borró): se anota en el registro del servidor con el id para limpiarlo a mano.
export async function borrarPdf(drive: Drive, driveFileId: string, contexto: Record<string, unknown>): Promise<void> {
  try {
    await drive.borrarArchivo(driveFileId);
  } catch (e) {
    console.error("[api] No se pudo mandar el PDF a la papelera de Drive", { driveFileId, ...contexto }, e);
  }
}
