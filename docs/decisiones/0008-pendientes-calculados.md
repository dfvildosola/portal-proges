# 0008 — Los pendientes se calculan al abrirlos, no se guardan

Fecha: 2026-10-04 · Estado: aceptada

## Contexto

Hasta ahora los avisos («alertas») se guardaban en una tabla, como una libreta donde alguien anota cada problema. Pero nadie la mantenía al día: la libreta solo se reescribía cuando alguien abría Pendientes o una ficha de propiedad. Resultado:

- Se desfasaba. El número rojo del menú podía mentir, porque mostraba lo anotado la última vez y no lo que pasa hoy.
- El botón «Resolver» no servía. Resolver una alerta sin arreglar su causa (por ejemplo, un arriendo sin pagar) solo la borraba de la libreta, y reaparecía en la siguiente revisión.
- Era miope. De 8 tipos de aviso, solo 3 avisaban con anticipación; el resto llegaba cuando el problema ya había ocurrido.

## Decisión

**La lista de pendientes se calcula al momento, a partir de los datos reales** (cobros, contratos, cuentas, contribuciones, papeles y pólizas). Es la diferencia entre una libreta que alguien tiene que mantener al día y un estado de cuenta que se imprime cuando se pide: siempre refleja el momento en que lo pides, y no hay nada que se pueda olvidar actualizar.

Cada ítem dice **cuándo hay que actuar** (Atrasado, Esta semana, Este mes o Próximos meses), **cuánto es en pesos** (la UF se convierte con la última UF registrada) y **qué hacer**, con un botón que lleva al lugar donde se resuelve. Un ítem desaparece solo cuando su causa se resuelve: se paga el cobro, se renueva el contrato, se sube la póliza nueva. Por eso ya no hay «Resolver».

**El orden pone la plata primero.** Dentro de cada sección (y en las líneas que se ven en Inicio) salen primero los ítems con monto, del más caro al más barato; después los que no tienen monto, del más antiguo al más nuevo. Así lo que más plata cuesta no queda tapado por un reajuste viejo que no mueve plata.

Algunos ítems son uno por cosa (un cobro atrasado, una cuota de contribución, una cuenta) y otros son uno solo para toda la cartera (los arriendos de la semana, los cobros sin generar), para que el día 1 no aparezcan 50 líneas.

Se elimina la tabla `Alert` (lo hace la pieza 3c de esta tarea).

**Plazos de anticipación** (decididos por Diego):

| Qué | Cuánto antes |
|---|---|
| Aviso de no renovación de un contrato | 30 días antes de su fecha límite |
| Término de un contrato que no se renueva solo | 120 días |
| Reajuste | 30 días |
| Papeles y pólizas | 45 días |
| Contribuciones | 30 días |
| Cuentas (luz, agua, gasto común…) | 7 días |
| Arriendos que vencen | 7 días |

También cambió un criterio: una propiedad desocupada se mide desde que salió el último contrato (igual que la ficha), no desde la última vez que alguien editó la propiedad.

## Alternativa descartada

Seguir guardando los avisos en la tabla y agregarles fecha y monto. Seguiría desfasándose, y haría falta algo que la recalcule a cada rato (una tarea programada más que puede fallar sin que nadie se entere).

## Consecuencias

- No queda registro de cuándo apareció o se resolvió un aviso: lo que no está pendiente hoy, no existe.
- No se puede «posponer» un aviso («recuérdamelo en una semana»). Queda anotado en `PENDIENTES.md` para después.
- El cálculo corre cada vez que se abre una página que lo usa (una sola vez por página, gracias a `cache`) y hace unas 8 consultas a la base. Con la cartera actual es instantáneo; si crece mucho, habría que revisarlo.
