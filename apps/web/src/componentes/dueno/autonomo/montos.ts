// Pasa lo que la persona escribió en un formulario («1.180.000», «12,5») a un monto como lo pide
// la API: texto con punto decimal y sin separador de miles, más su moneda. Si lo escrito no se
// entiende, se manda tal cual: la API responde con un mensaje claro para ese campo.
import type { Moneda, Monto } from "@proges/contrato";
import { textoDe } from "@/lib/acciones";

function limpiar(texto: string, moneda: Moneda): string {
  const sinAdornos = texto.replace(/[\s$]|UF/gi, "");
  // En pesos no hay decimales: los puntos y las comas son separadores de miles.
  if (moneda === "CLP") return sinAdornos.replace(/[.,]/g, "");
  // En UF, la coma es el decimal («12,5»); los puntos que sobran son de miles.
  return sinAdornos.includes(",") ? sinAdornos.replace(/\./g, "").replace(",", ".") : sinAdornos;
}

function monedaDe(datos: FormData, campoMoneda: string): Moneda {
  return textoDe(datos, campoMoneda) === "UF" ? "UF" : "CLP";
}

/** El monto de un par de campos (el valor y su moneda); undefined si el valor quedó vacío. */
export function montoDe(datos: FormData, campo: string, campoMoneda = `${campo}Moneda`): Monto | undefined {
  const texto = textoDe(datos, campo);
  if (texto === undefined) return undefined;
  const moneda = monedaDe(datos, campoMoneda);
  return { valor: limpiar(texto, moneda), moneda };
}

/** Lo mismo, pero con la moneda fija (las contribuciones siempre son en pesos). */
export function montoEnPesosDe(datos: FormData, campo: string): Monto | undefined {
  const texto = textoDe(datos, campo);
  return texto === undefined ? undefined : { valor: limpiar(texto, "CLP"), moneda: "CLP" };
}
