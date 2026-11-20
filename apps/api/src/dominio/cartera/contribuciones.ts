// Contribuciones (impuesto territorial): las cuatro cuotas del año y cuándo vence cada una.
// Funciones puras.

// El mes en que vence cada cuota, según el calendario del SII de Chile: abril, junio,
// septiembre y noviembre. Vence el último día de ese mes.
const MES_DE_LA_CUOTA: Record<number, number> = { 1: 4, 2: 6, 3: 9, 4: 11 };

export function vencimientoDeCuota(anio: number, cuota: number): Date {
  const mes = MES_DE_LA_CUOTA[cuota];
  if (mes === undefined) throw new Error(`La cuota ${cuota} no existe: son 1, 2, 3 y 4.`);
  const ultimoDia = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
  return new Date(Date.UTC(anio, mes - 1, ultimoDia));
}
