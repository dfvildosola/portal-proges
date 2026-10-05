# 0006 — Los pagos parciales se suman en el mismo cobro

Fecha: 2026-10-04 · Estado: aceptada

## Contexto

Hasta ahora, «Registrar pago» marcaba el cobro como pagado sin importar el monto. Si un arrendatario pagaba 400.000 de 500.000, el cobro quedaba en verde y los 100.000 que faltaban desaparecían: nadie los veía ni los cobraba. Además, Inicio sumaba como «Ingreso del mes» solo lo cobrado en pesos, y dejaba fuera todo lo cobrado en UF.

## Decisión

**Pagos parciales.** Cada vez que se registra un pago, su monto se **suma** a lo ya pagado en ese mismo cobro. Piensa en una libreta donde se anota cuánto se ha abonado a una deuda: cada abono suma al total, y la deuda se cierra cuando el total llega a lo esperado. El cobro pasa a «Pagado» solo cuando lo pagado cubre lo esperado; mientras no, conserva su estado (pendiente o atrasado) y se ve como «Parcial · falta $X». El formulario propone como monto el saldo que falta y como fecha el día de hoy. Si el cobro se «revierte a pendiente», se borran todos los pagos y se parte de cero.

**Lo cobrado en UF se convierte a pesos con la última UF registrada**, no con la UF del día en que se pagó. Así Inicio y el Resumen pueden sumar arriendos en pesos y en UF en una sola cifra.

## Alternativa descartada

Una tabla nueva de abonos, con una fila por cada pago (fecha, monto, nota). Sería lo más exacto, pero agrega una tabla, una pantalla para ver el historial y más cuentas en cada informe, para un caso que hoy es poco frecuente. Se prefirió lo simple y se anotó lo que se pierde.

## Consecuencias

- Se pierde la fecha de cada abono: el cobro guarda solo la fecha del **último** pago. Las notas de los pagos sí se acumulan, separadas por « · ».
- Un cobro pagado en un solo abono se comporta igual que antes.
- Lo cobrado en UF puede diferir un poco de lo que valía en pesos el día del pago, porque se usa la UF más reciente. La diferencia es chica. Cuando exista la carga automática de la UF del Banco Central (ya está en `PENDIENTES.md`), se podrá usar la UF del día del pago.
- Si hay pagos en UF y no hay ningún valor UF registrado, Inicio lo avisa en vez de mostrar una cifra incompleta sin explicación.
