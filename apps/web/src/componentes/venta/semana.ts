// Ayudas para las semanas de las cifras de los anuncios. Las cifras se anotan «por lunes»: la API
// rechaza una fecha que no sea lunes. Se calcula con las partes de la fecha en UTC (no con la zona
// del aparato) para que el servidor y el Mac den el mismo día.

/** Suma días a una fecha «AAAA-MM-DD» y devuelve «AAAA-MM-DD». */
function sumarDias(fecha: string, dias: number): string {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  const f = new Date(Date.UTC(anio!, mes! - 1, dia! + dias));
  return f.toISOString().slice(0, 10);
}

/** El lunes de la semana a la que pertenece `fecha` («AAAA-MM-DD»). */
export function lunesDe(fecha: string): string {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  const diaSemana = new Date(Date.UTC(anio!, mes! - 1, dia!)).getUTCDay(); // 0 = domingo
  return sumarDias(fecha, -((diaSemana + 6) % 7));
}

/** Los últimos `cuantos` lunes hasta el de la semana de `hoy`, del más nuevo al más antiguo. */
export function ultimosLunes(hoy: string, cuantos: number): string[] {
  const esta = lunesDe(hoy);
  return Array.from({ length: cuantos }, (_, i) => sumarDias(esta, -7 * i));
}
