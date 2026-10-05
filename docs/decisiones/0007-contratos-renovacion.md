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

**Qué hizo la migración con los contratos que ya existían:** los Terminados y Renovados pasaron a tener fecha de salida igual a su término; los Vencidos quedaron como «no se renueva solo»; el plazo se sacó de las fechas de inicio y término; y los que tenían reajuste sin frecuencia pasaron a reajustarse cada 12 meses.

## Alternativa descartada

Seguir guardando el estado y actualizarlo con una tarea programada que corre cada noche. Es una pieza más que puede fallar sin que nadie se entere, y el estado volvería a poder desfasarse de las fechas.

## Consecuencias

- El botón «Renovar» solo adelantará una renovación; no es necesario apretarlo para que el contrato siga vigente.
- Un contrato que no se renueva solo y pasa su término queda «Vencido» a la vista, en vez de aparecer como vigente.
- Ya no se elige el estado en el formulario: cambia solo al cambiar las fechas.
- El plazo en meses es una aproximación (días entre inicio y término ÷ 30,4375, redondeado); para contratos de duración rara puede no ser exacto.
