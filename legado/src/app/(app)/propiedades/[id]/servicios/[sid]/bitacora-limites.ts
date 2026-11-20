// Límites de las fotos de una nota. Los usan el formulario (que achica las fotos antes de
// enviarlas) y la acción (que las vuelve a comprobar). Van aparte porque un archivo
// "use server" solo puede exportar funciones.

export const MAX_FOTOS_POR_NOTA = 6;
// Lado mayor de la foto ya achicada. Con JPEG calidad 0,8 cada foto queda en unos 300-600 KB,
// y 6 caben bajo los 4,5 MB que Vercel deja pasar por envío.
export const LADO_MAYOR_PX = 1600;
export const CALIDAD_JPEG = 0.8;
// Tope por foto en el servidor: red de seguridad por si llega una sin achicar.
export const MAX_BYTES_FOTO = 4 * 1024 * 1024;
