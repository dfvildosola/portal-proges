// Achicar una foto en el navegador antes de enviarla (solo corre en el cliente).
//
// Las fotos del celular pesan 4 a 10 MB y Vercel solo deja pasar unos 4,5 MB por envío (ADR 0015).
// Se dibuja la foto en un lienzo (canvas) más chico y se guarda como JPEG: es como reducir la foto
// antes de adjuntarla a un correo. `imageOrientation: "from-image"` respeta la rotación con que el
// celular la sacó. Es la misma idea que usa la bitácora (bitacora-nota-form.tsx); está repetida
// acá y no compartida porque ese archivo es de otra pieza.

import { CALIDAD_JPEG, LADO_MAYOR_PX } from "./bitacora-limites";

export async function achicarFoto(archivo: File): Promise<Blob> {
  const imagen = await createImageBitmap(archivo, { imageOrientation: "from-image" });
  try {
    const escala = Math.min(1, LADO_MAYOR_PX / Math.max(imagen.width, imagen.height));
    const lienzo = document.createElement("canvas");
    lienzo.width = Math.round(imagen.width * escala);
    lienzo.height = Math.round(imagen.height * escala);
    const contexto = lienzo.getContext("2d");
    if (!contexto) throw new Error("El navegador no pudo preparar la foto.");
    contexto.drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
    return await new Promise<Blob>((resolver, rechazar) =>
      lienzo.toBlob(
        (b) => (b ? resolver(b) : rechazar(new Error("El navegador no pudo preparar la foto."))),
        "image/jpeg",
        CALIDAD_JPEG,
      ),
    );
  } finally {
    imagen.close();
  }
}
