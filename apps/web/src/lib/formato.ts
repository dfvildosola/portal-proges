// Cómo se escriben la plata y las fechas en pantalla. Un solo lugar: ninguna pantalla arma sus
// propios textos de plata o de fecha.
//
// Dos trampas que este archivo evita a propósito:
// - La plata llega como texto («1234567.50»), no como número, porque un número de JavaScript
//   redondea decimales y en plata eso no se acepta. Aquí se redondea con enteros grandes (BigInt),
//   nunca con decimales de JavaScript.
// - Una fecha «solo fecha» («2026-11-19») no tiene hora. Si se convierte con `new Date("2026-11-19")`,
//   JavaScript la toma como medianoche UTC y, en hora de Chile, queda el día anterior. Por eso las
//   fechas se leen por partes (año, mes, día) y nunca con new Date(texto) y métodos locales.
import type { Monto } from "@proges/contrato";

// ---------------------------------------------------------------------------
// Plata
// ---------------------------------------------------------------------------

// Escribe el número con punto cada tres cifras: 1234567 → «1.234.567».
function conMiles(digitos: string): string {
  return digitos.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// Redondea el texto decimal («1234.565») a una cantidad de decimales, hacia arriba desde el 5, y lo
// devuelve como { negativo, entero, decimales } para armar el texto sin pasar por number.
function redondear(valor: string, decimales: number): { negativo: boolean; entero: string; decimales: string } {
  const negativo = valor.startsWith("-");
  const [parteEntera = "0", parteDecimal = ""] = valor.replace("-", "").split(".");
  const relleno = parteDecimal.padEnd(decimales + 1, "0");
  let escalado = BigInt(parteEntera + relleno.slice(0, decimales));
  if (relleno.charAt(decimales) >= "5") escalado += 1n;
  const texto = escalado.toString().padStart(decimales + 1, "0");
  const corte = texto.length - decimales;
  return {
    // Un monto que redondea a cero no lleva signo menos («-$ 0» no existe).
    negativo: negativo && escalado !== 0n,
    entero: texto.slice(0, corte),
    decimales: texto.slice(corte),
  };
}

/** «$ 1.234.567» para pesos y «UF 1.234,56» para UF. */
export function formatearMonto(monto: Monto): string {
  if (monto.moneda === "UF") {
    const { negativo, entero, decimales } = redondear(monto.valor, 2);
    return `${negativo ? "-" : ""}UF ${conMiles(entero)},${decimales}`;
  }
  const { negativo, entero } = redondear(monto.valor, 0);
  return `${negativo ? "-" : ""}$ ${conMiles(entero)}`;
}

// ---------------------------------------------------------------------------
// Fechas
// ---------------------------------------------------------------------------

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MESES_LARGOS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const DIAS_LARGOS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const DIAS_CORTOS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

const ZONA_CHILE = "America/Santiago";

type Dia = { anio: number; mes: number; dia: number };

// El día y la hora de Chile de un momento exacto, sin pasar por la zona del aparato.
const PARTES_CHILE = new Intl.DateTimeFormat("en-CA", {
  timeZone: ZONA_CHILE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function partesEnChile(momento: Date): Dia & { hora: string } {
  const partes: Record<string, string> = {};
  for (const p of PARTES_CHILE.formatToParts(momento)) partes[p.type] = p.value;
  return {
    anio: Number(partes.year),
    mes: Number(partes.month),
    dia: Number(partes.day),
    hora: `${partes.hour}:${partes.minute}`,
  };
}

function aTexto({ anio, mes, dia }: Dia): string {
  return `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

// Lee «2026-11-19» o «2026-11-19T14:30:00.000Z». A una fecha «solo fecha» se la lee tal cual; a un
// momento exacto se lo pasa a su día en Chile.
function leerDia(iso: string): Dia {
  const solo = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (solo) return { anio: Number(solo[1]), mes: Number(solo[2]), dia: Number(solo[3]) };
  const momento = new Date(iso);
  if (Number.isNaN(momento.getTime())) throw new Error(`Fecha no válida: «${iso}».`);
  return partesEnChile(momento);
}

// Cuenta de días corridos de una fecha, para restar días sin que importe la zona horaria.
function numeroDeDia({ anio, mes, dia }: Dia): number {
  return Math.round(Date.UTC(anio, mes - 1, dia) / 86_400_000);
}

/** El día de hoy en Chile, como «AAAA-MM-DD». Sirve para comparar con las fechas de la API. */
export function hoyChile(): string {
  return aTexto(partesEnChile(new Date()));
}

/** La fecha de un momento exacto, en hora de Chile, como «AAAA-MM-DD». */
export function diaChile(iso: string): string {
  return aTexto(leerDia(iso));
}

/** Cuántos días hay de `desde` a `hasta` (negativo si `hasta` es antes). Sin `hasta`, cuenta hasta hoy. */
export function diasEntre(desde: string, hasta: string = hoyChile()): number {
  return numeroDeDia(leerDia(hasta)) - numeroDeDia(leerDia(desde));
}

/** «19 nov». */
export function fechaCorta(iso: string): string {
  const { mes, dia } = leerDia(iso);
  return `${dia} ${MESES[mes - 1]}`;
}

/** «nov 2026», a partir de un mes «AAAA-MM» (los cobros y las cuentas son de un mes entero). */
export function mesConAnio(periodo: string): string {
  const partes = /^(\d{4})-(\d{2})$/.exec(periodo);
  if (!partes) throw new Error(`Mes no válido: «${periodo}». Se esperaba AAAA-MM.`);
  return `${MESES[Number(partes[2]) - 1]} ${partes[1]}`;
}

/** «19 nov 2026». */
export function fechaConAnio(iso: string): string {
  const { anio, mes, dia } = leerDia(iso);
  return `${dia} ${MESES[mes - 1]} ${anio}`;
}

/** «19 nov» si es de este año y «19 nov 2025» si no. Es la que usan casi todas las pantallas. */
export function fechaAuto(iso: string): string {
  return leerDia(iso).anio === leerDia(hoyChile()).anio ? fechaCorta(iso) : fechaConAnio(iso);
}

/** «jue 19 nov», con el día de la semana. */
export function fechaConDia(iso: string): string {
  const d = leerDia(iso);
  const semana = new Date(Date.UTC(d.anio, d.mes - 1, d.dia)).getUTCDay();
  return `${DIAS_CORTOS[semana]} ${d.dia} ${MESES[d.mes - 1]}`;
}

/** «jueves 19 de noviembre», para los títulos. */
export function fechaDelDia(iso: string): string {
  const d = leerDia(iso);
  const semana = new Date(Date.UTC(d.anio, d.mes - 1, d.dia)).getUTCDay();
  return `${DIAS_LARGOS[semana]} ${d.dia} de ${MESES_LARGOS[d.mes - 1]}`;
}

/** «12:20», la hora de Chile de un momento exacto. */
export function horaChile(iso: string): string {
  const momento = new Date(iso);
  if (Number.isNaN(momento.getTime())) throw new Error(`Fecha no válida: «${iso}».`);
  return partesEnChile(momento).hora;
}

/** «hoy», «ayer», «hace 3 días», «hace 2 meses»; para fechas futuras, «mañana» o «en 3 días». */
export function haceCuanto(iso: string): string {
  const dias = diasEntre(iso);
  if (dias === 0) return "hoy";
  if (dias === 1) return "ayer";
  if (dias === -1) return "mañana";
  if (dias < 0) return `en ${-dias} días`;
  if (dias < 45) return `hace ${dias} días`;
  if (dias < 365) return `hace ${Math.round(dias / 30)} meses`;
  const anios = Math.round(dias / 365);
  return anios === 1 ? "hace 1 año" : `hace ${anios} años`;
}
