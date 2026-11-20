// Las pestañas de la ficha de una propiedad. Cada una es una dirección (`?pestana=historial`) y no
// un cambio dentro de la página: así la pantalla pide solo los datos de la pestaña que se ve (el
// historial y las reparaciones son pesados) y el enlace se puede compartir o recargar.
export const PESTANAS = [
  { clave: "resumen", nombre: "Resumen" },
  { clave: "historial", nombre: "Historial" },
  { clave: "reparaciones", nombre: "Reparaciones" },
  { clave: "documentos", nombre: "Documentos" },
  { clave: "datos", nombre: "Datos y ubicación" },
  { clave: "arriendo", nombre: "Arriendo y venta" },
] as const;

export type ClavePestana = (typeof PESTANAS)[number]["clave"];

/** La pestaña que pidió la dirección; si no existe o no vino, «resumen». */
export function pestanaDe(valor: string | string[] | undefined): ClavePestana {
  const clave = Array.isArray(valor) ? valor[0] : valor;
  return PESTANAS.find((p) => p.clave === clave)?.clave ?? "resumen";
}

/** La dirección de una pestaña de una propiedad, con lo que se quiera agregar (filtro, página). */
export function hrefDePestana(propiedadId: string, clave: ClavePestana, extra: Record<string, string | undefined> = {}): string {
  const consulta = new URLSearchParams();
  if (clave !== "resumen") consulta.set("pestana", clave);
  for (const [nombre, valor] of Object.entries(extra)) if (valor) consulta.set(nombre, valor);
  const texto = consulta.toString();
  return `/propiedades/${encodeURIComponent(propiedadId)}${texto ? `?${texto}` : ""}`;
}
