// Convención: las fechas del dominio («solo fecha») se guardan a medianoche UTC.
// «Hoy» es el día calendario que corre en Chile (America/Santiago), expresado
// también como medianoche UTC, para poder compararlo con esas fechas.

export function hoyChile(ahora: Date = new Date()): Date {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(ahora);
  const get = (tipo: string) =>
    Number(partes.find((p) => p.type === tipo)?.value);
  return new Date(Date.UTC(get("year"), get("month") - 1, get("day")));
}

// "AAAA-MM" del día de hoy en Chile.
export function mesActual(ahora: Date = new Date()): string {
  return hoyChile(ahora).toISOString().slice(0, 7);
}

export function sumarDias(fecha: Date, n: number): Date {
  return new Date(
    Date.UTC(
      fecha.getUTCFullYear(),
      fecha.getUTCMonth(),
      fecha.getUTCDate() + n,
    ),
  );
}

// Conserva el día; si el mes de destino es más corto, usa su último día.
export function sumarMeses(fecha: Date, n: number): Date {
  const y = fecha.getUTCFullYear();
  const m = fecha.getUTCMonth() + n;
  const ultimoDia = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(fecha.getUTCDate(), ultimoDia)));
}

// Primer y último día del mes ("AAAA-MM"), a medianoche UTC.
export function rangoDelMes(mes: string): { inicio: Date; fin: Date } {
  const [year, month] = mes.split("-").map(Number);
  return {
    inicio: new Date(Date.UTC(year, month - 1, 1)),
    fin: new Date(Date.UTC(year, month, 0)),
  };
}

// Vencimiento de un mes: si el día pasa el último del mes, se recorta.
export function vencimientoDelMes(mes: string, dia: number): Date {
  const { inicio, fin } = rangoDelMes(mes);
  return new Date(
    Date.UTC(
      inicio.getUTCFullYear(),
      inicio.getUTCMonth(),
      Math.min(dia, fin.getUTCDate()),
    ),
  );
}
