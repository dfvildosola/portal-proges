# 0001 — Cuentas por pagar en una tabla nueva

Fecha: 2026-10-01 · Estado: aceptada

## Contexto

Proges ya sabe lo que el dueño **cobra** (los arriendos) y las contribuciones que debe pagar al SII. Pero no sabe lo que debe pagar mes a mes por cada propiedad: gasto común, luz, agua, gas u otras cuentas. La persona de Proges pidió controlar esos pagos, con su vencimiento y saber si ya se pagaron.

## Decisión

Se crea una tabla nueva, `PropertyBill` («cuenta de la propiedad»). Cada fila es una cuenta con su tipo, el mes al que corresponde, el monto (que puede quedar vacío hasta tener la boleta), el vencimiento y el estado pendiente o pagada. Piensa en una libreta de deudas separada de la libreta de cobros: cada una tiene sus propias columnas y no se mezclan. Las contribuciones (`PropertyTax`) se quedan en su libreta aparte.

## Alternativa descartada

Meter las contribuciones en la misma tabla nueva, para tener una sola libreta de «cosas por pagar». Se descartó porque las contribuciones tienen estructura propia (año más cuota del 1 al 4, con fechas fijas del SII) y ya tienen alertas y su pestaña funcionando. Unificar obligaba a migrar los datos existentes y a reescribir lo que hoy anda bien, a cambio de poco. La lista transversal `/cuentas` puede mostrar ambas leyendo las dos tablas.

## Consecuencias

Marcar una cuenta como pagada **no crea un gasto en la contabilidad** (`Movement`). Por eso ese gasto todavía no aparece en la rentabilidad de la propiedad, y quien lo quiera ahí debe registrarlo aparte como movimiento. Queda anotado en `PENDIENTES.md` para resolverlo cuando el flujo lleve un tiempo en uso real. Además, hay dos tablas de «cosas por pagar», así que cualquier vista que quiera juntarlas debe leer ambas.
