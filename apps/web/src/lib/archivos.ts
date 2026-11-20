// Las direcciones de las fotos y los PDF, para ponerlas en un <img src> o en un enlace.
//
// El navegador no puede pedirle una foto a la API (no tiene el token). Pide a la propia web, en
// /archivos/<tipo>/<id>, y esa ruta (app/archivos/[tipo]/[id]/route.ts) la trae de la API con la
// sesión de quien pregunta. Así ninguna foto tiene un enlace público. Este archivo no usa nada del
// servidor: se puede importar desde componentes de servidor y de cliente.
export type TipoDeArchivo = "foto" | "documento" | "presupuesto";

/** Dirección de un archivo. `miniatura` solo aplica a fotos (la versión chica, para listas). */
export function urlDeArchivo(tipo: TipoDeArchivo, id: string, opciones: { miniatura?: boolean } = {}): string {
  const base = `/archivos/${tipo}/${encodeURIComponent(id)}`;
  return opciones.miniatura && tipo === "foto" ? `${base}?miniatura=1` : base;
}
