# 0007 — El estado del contrato se calcula, y la renovación también

Fecha: 2026-10-04 · Estado: aceptada

## Contexto

Cada contrato guardaba un «estado» que alguien elegía a mano (Vigente, Por vencer, Vencido, Renovado, Terminado). Ese dato se desfasaba de las fechas: «Por vencer» nunca se actualizaba solo, y un contrato ya vencido seguía en «Vigente», con lo que dejaba de generar cobros sin avisar a nadie. Además, los contratos de arriendo se renuevan solos por el mismo plazo si ninguna de las partes avisa lo contrario, y el sistema no sabía eso.

## Decisión

**B. El estado del contrato se calcula de las fechas, no se guarda.** Es como saber si un evento del calendario ya pasó: no hay que marcarlo, se ve mirando la fecha de hoy. Los cinco estados:

- **Por empezar**: la fecha de inicio todavía no llega.
- **Vigente**: está corriendo y no tiene salida fijada.
- **Termina**: está corriendo, pero ya se fijó el día de salida (se avisó que se va). Se muestra «Termina» hasta ese día.
- **Terminado**: la fecha de salida ya pasó.
- **Vencido**: no se renueva solo, pasó su fecha de término y nadie lo terminó. Es un error a corregir (renovarlo o terminarlo) y levantará un aviso.

**C. La renovación automática se calcula, no se escribe.** Piensa en el evento repetido del calendario («cada 12 meses»): se guarda la regla, no cada repetición. Cada contrato guarda su fecha de término original, su plazo en meses y si se renueva solo. El «término vigente» sale de avanzar el término guardado de a un plazo hasta pasar hoy; no hace falta nada que corra a medianoche. La renovación es por el mismo plazo del contrato original. El aviso de no renovación se levanta 60 días antes del término por defecto, y se puede ajustar por contrato (`diasAviso`).

También se agregaron al contrato la fecha de salida, la garantía (en la moneda del arriendo) y la fecha del último reajuste.

**Fin de mes.** Al avanzar un término de a meses, un contrato que termina el último día de un mes sigue terminando el último día del mes: 31-08 → 28-02 → 31-08, y no 31-08 → 28-02 → 28-08. Si no termina a fin de mes, se conserva el día (y se recorta solo si el mes de destino es más corto).

**Qué hizo la migración con los contratos que ya existían:** los Terminados y Renovados pasaron a tener fecha de salida igual a su término o, si se marcaron terminados antes de que llegara (terminado antes de plazo), igual al día de su última edición, que es la mejor pista de cuándo se fueron; los Vencidos quedaron como «no se renueva solo»; el plazo se sacó de las fechas de inicio y término; y los que tenían reajuste sin frecuencia pasaron a reajustarse cada 12 meses.

## Alternativa descartada

Seguir guardando el estado y actualizarlo con una tarea programada que corre cada noche. Es una pieza más que puede fallar sin que nadie se entere, y el estado volvería a poder desfasarse de las fechas.

## Consecuencias

- El botón «Renovar» solo adelantará una renovación; no es necesario apretarlo para que el contrato siga vigente.
- Un contrato que no se renueva solo y pasa su término queda «Vencido» a la vista, en vez de aparecer como vigente.
- Ya no se elige el estado en el formulario: cambia solo al cambiar las fechas.
- **Un reajuste se aplica cuando llega su mes, no antes.** «Reajustar» cambia el monto del contrato en el momento, y los cobros que todavía no se generan copian ese monto. Si se aplicara en octubre un reajuste que corre en diciembre, el cobro de noviembre saldría con el monto nuevo. Por eso la fecha efectiva puede ser futura solo dentro del mes en curso. El aviso de la agenda, 30 días antes, sirve para prepararse (por ejemplo, avisarle al arrendatario el monto nuevo), y el reajuste se aplica cuando llega el mes. Salió al probar los arreglos del `/code-review`, el 2026-10-05.
- El plazo en meses es una aproximación (días entre inicio y término ÷ 30,4375, redondeado); para contratos de duración rara puede no ser exacto.
