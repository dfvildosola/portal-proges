// Ayudas para leer lo que escribe la persona en los formularios del panel de venta y dejarlo como
// la API lo pide. Se usa solo desde las acciones (servidor).
import { textoDe } from "@/lib/acciones";
import type { Monto, Moneda } from "@proges/contrato";

/**
 * Convierte lo que se escribe en un campo de monto a lo que pide la API: solo dígitos y punto
 * decimal. En Chile el punto separa miles y la coma los decimales («14.900,5»), pero también
 * se escribe «14900.5»; se entienden las dos formas. Devuelve null si no es un número.
 */
export function valorDeMonto(texto: string): string | null {
  const limpio = texto.replace(/[\s$]|UF/gi, "");
  let normal = limpio;
  if (limpio.includes(",")) normal = limpio.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(limpio)) normal = limpio.replace(/\./g, "");
  return /^\d+(\.\d+)?$/.test(normal) ? normal : null;
}

export type MontoLeido = { monto: Monto } | { error: string };

/** Lee el monto y la moneda de un formulario. Si el monto no es un número, devuelve el error. */
export function montoDe(datos: FormData, campo: string, campoMoneda: string): MontoLeido {
  const texto = textoDe(datos, campo);
  if (!texto) return { error: "Escribe el monto." };
  const valor = valorDeMonto(texto);
  if (valor === null) return { error: "Escribe el monto solo con números (por ejemplo 14.900 o 14900,5)." };
  const moneda: Moneda = datos.get(campoMoneda) === "CLP" ? "CLP" : "UF";
  return { monto: { valor, moneda } };
}

/** Un número entero de un campo: undefined si está vacío, null si lo escrito no es un entero. */
export function enteroDe(datos: FormData, campo: string): number | undefined | null {
  const texto = textoDe(datos, campo);
  if (texto === undefined) return undefined;
  return /^\d+$/.test(texto) ? Number(texto) : null;
}
