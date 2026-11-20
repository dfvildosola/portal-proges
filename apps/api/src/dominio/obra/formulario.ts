// Piezas chicas y puras para recibir lo que llega de la web en la obra: archivos de un formulario,
// fechas, textos vacíos. Van aparte de las rutas para poder probarlas sin levantar la API.
import { ErrorApi } from "../../errores";

export const MAX_FOTOS = 6;
export const MAX_BYTES_ARCHIVO = 4 * 1024 * 1024;
export const TIPOS_DE_FOTO: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

// Un formulario con un solo archivo trae el archivo; con varios, una lista; sin ninguno, nada.
// Un navegador que no eligió archivo manda uno vacío (size 0): no cuenta.
export function archivosDe(valor: unknown, campo: string): File[] {
  const lista = valor === undefined || valor === null ? [] : Array.isArray(valor) ? valor : [valor];
  const archivos: File[] = [];
  for (const v of lista) {
    if (v === "") continue; // un campo de archivo vacío a veces llega como texto vacío
    if (!(v instanceof File)) throw new ErrorApi(400, "Adjunta un archivo, no texto.", { [campo]: "Adjunta un archivo." });
    if (v.size > 0) archivos.push(v);
  }
  return archivos;
}

export function validarFotos(fotos: File[]): void {
  if (fotos.length > MAX_FOTOS) {
    throw new ErrorApi(400, `Máximo ${MAX_FOTOS} fotos.`, { fotos: `Máximo ${MAX_FOTOS} fotos.` });
  }
  for (const f of fotos) {
    if (!TIPOS_DE_FOTO[f.type]) {
      throw new ErrorApi(400, "Solo se aceptan fotos JPG, PNG o WebP.", { fotos: "Solo se aceptan fotos JPG, PNG o WebP." });
    }
    if (f.size > MAX_BYTES_ARCHIVO) {
      throw new ErrorApi(400, "Una foto pesa demasiado: prueba con otra.", { fotos: "Una foto pesa más de 4 MB." });
    }
  }
}

// Un PDF de verdad empieza con «%PDF»; una foto renombrada, por ejemplo, no vale.
export function esPdf(datos: Uint8Array): boolean {
  return Buffer.from(datos.subarray(0, 4)).toString("latin1") === "%PDF";
}

// El texto de la tarea que abre una observada: «Corregir: <partida>: <observación>».
export function textoDeTareaCorreccion(descripcion: string, observacion: string): string {
  const corta = descripcion.length > 80 ? `${descripcion.slice(0, 77)}…` : descripcion;
  return `Corregir: ${corta}: ${observacion}`;
}

// Un nombre de archivo que Drive acepte sin sorpresas: solo letras, números y unos signos.
export function nombreSeguro(texto: string, maximo = 60): string {
  return texto.replace(/[^\p{L}\p{N} ._-]/gu, "").trim().slice(0, maximo);
}

// «Solo fecha» a medianoche UTC desde «AAAA-MM-DD» (nunca con la hora local: el Mac está en Chile
// y el servidor en UTC, y darían días distintos).
export function aFechaCivil(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

// Un texto optativo: lo vacío es «nada» (null) para la base.
export function textoONull(valor: string | null | undefined): string | null {
  const t = valor?.trim();
  return t ? t : null;
}

// El valor de un formulario (texto de pesos) a número de pesos.
export function pesos(valor: string): number {
  return Number(valor);
}
