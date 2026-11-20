// Achica una foto EN EL TELÉFONO antes de subirla.
//
// Por qué: una foto de la cámara pesa 4 a 10 MB, y en terreno a veces hay una sola raya de señal.
// Achicada a ~1600 px de lado mayor y calidad 0,8 queda en unos 300 a 600 KB: se ve igual de bien
// en pantalla, sube en segundos y cabe en el límite de la API (4 MB por foto). Es como pedirle al
// fotógrafo que revele la foto en tamaño carta en vez de enviar el negativo.
//
// Sin librerías: se dibuja la foto en un lienzo (canvas) más chico y se exporta como JPEG.
// Esto solo corre en el navegador (usa canvas y createImageBitmap).

/** El lado mayor de la foto que se sube, en píxeles. */
export const LADO_MAYOR_PX = 1600;
const CALIDAD_JPEG = 0.8;

/** Cuando la foto no se pudo leer o achicar; `message` está escrito para una persona. */
export class ErrorDeFoto extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "ErrorDeFoto";
  }
}

// Abre la foto como imagen. `imageOrientation: "from-image"` respeta el giro que anota la cámara
// (una foto tomada con el teléfono de pie, si no, saldría acostada).
async function abrirImagen(archivo: File): Promise<{ imagen: CanvasImageSource; ancho: number; alto: number; cerrar: () => void }> {
  try {
    const mapa = await createImageBitmap(archivo, { imageOrientation: "from-image" });
    return { imagen: mapa, ancho: mapa.width, alto: mapa.height, cerrar: () => mapa.close() };
  } catch {
    // Algunos navegadores viejos no aceptan las opciones: se prueba con una etiqueta <img>.
    const direccion = URL.createObjectURL(archivo);
    try {
      const img = new Image();
      img.src = direccion;
      await img.decode();
      return { imagen: img, ancho: img.naturalWidth, alto: img.naturalHeight, cerrar: () => URL.revokeObjectURL(direccion) };
    } catch {
      URL.revokeObjectURL(direccion);
      throw new ErrorDeFoto("No se pudo leer la foto. Prueba sacándola de nuevo, o con otra.");
    }
  }
}

/** Devuelve la foto achicada, como un archivo JPEG nuevo. */
export async function achicarFoto(archivo: File): Promise<File> {
  if (!archivo.type.startsWith("image/")) {
    throw new ErrorDeFoto("Ese archivo no es una foto.");
  }
  const { imagen, ancho, alto, cerrar } = await abrirImagen(archivo);
  try {
    const escala = Math.min(1, LADO_MAYOR_PX / Math.max(ancho, alto));
    const lienzo = document.createElement("canvas");
    lienzo.width = Math.max(1, Math.round(ancho * escala));
    lienzo.height = Math.max(1, Math.round(alto * escala));
    const contexto = lienzo.getContext("2d");
    if (!contexto) throw new ErrorDeFoto("Tu teléfono no pudo preparar la foto. Prueba de nuevo.");
    // Fondo blanco: un PNG con transparencia saldría negro al pasarlo a JPEG.
    contexto.fillStyle = "#fff";
    contexto.fillRect(0, 0, lienzo.width, lienzo.height);
    contexto.drawImage(imagen, 0, 0, lienzo.width, lienzo.height);

    const blob = await new Promise<Blob | null>((resolver) => lienzo.toBlob(resolver, "image/jpeg", CALIDAD_JPEG));
    if (!blob) throw new ErrorDeFoto("No se pudo achicar la foto. Prueba de nuevo.");
    const nombre = archivo.name.replace(/\.[^.]+$/, "") || "foto";
    return new File([blob], `${nombre}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
  } finally {
    cerrar();
  }
}
