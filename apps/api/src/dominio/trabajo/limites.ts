// Límites de las fotos de una nota. Las fotos ya vienen achicadas desde el teléfono (lado mayor
// de 1600 px, JPEG): estos topes son la red de seguridad por si llega una sin achicar.
export const MAX_FOTOS_POR_NOTA = 6;
export const MAX_BYTES_FOTO = 4 * 1024 * 1024;
export const EXTENSION_DE_FOTO: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
