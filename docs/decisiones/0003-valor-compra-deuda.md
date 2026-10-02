# 0003 — Valor con fecha y fuente, compra y deuda

Fecha: 2026-10-01 · Estado: aceptada

## Contexto

Hasta ahora la ficha mostraba el valor comercial como un número suelto: no se sabía de cuándo era ni quién lo dio. Tampoco sabía cuánto se pagó por la propiedad ni cuánto se debe, así que no podía responder las dos preguntas que más le importan al dueño: **cuánto es realmente mío** (valor neto) y **cuánto ganó la propiedad** (plusvalía). `/resumen` tenía el mismo hueco: mostraba el patrimonio bruto, pero no el neto.

Se agregan a la propiedad la fecha y la fuente del valor, los datos de la compra, los de la deuda hipotecaria y si es exenta de contribuciones. Eso obliga a decidir dónde se guardan, cómo se comparan montos de distintas fechas y monedas, y qué cuenta como costo.

## Decisiones cerradas con Diego (2026-10-01)

1. **Fuente del valor comercial:** tasación, corredor o estimación propia. Cuando exista el piloto con un proveedor de tasaciones (ver `PENDIENTES.md`), se agrega «estimación automática».
2. **Compra:** fecha, precio y moneda. Sin gastos de compra (notaría, impuestos, corredor).
3. **Deuda:** saldo, moneda (por defecto UF, porque casi todas las hipotecas en Chile van en UF) y fecha del saldo, más el banco, el dividendo mensual (en la moneda del saldo) y la fecha del último dividendo, es decir, cuándo termina el crédito.
4. **Exenta de contribuciones:** un sí/no. Una propiedad exenta deja de pedir las 4 cuotas del año en «Datos al día» y en Finanzas no ofrece «Generar cuotas del año».

## Decisiones propuestas y aprobadas

5. **Todo vive en la propiedad, no en tablas aparte.** Una tabla de créditos permitiría varios créditos por propiedad, pero exige pantallas para agregarlos y borrarlos. Hoy lo normal es un crédito por propiedad, así que son columnas de `Property` (regla de código 1). Si aparece una propiedad con dos créditos, se separa entonces.
6. **Las fechas son opcionales.** Las propiedades ya cargadas tienen valor sin fecha; si la fecha fuera obligatoria, editar cualquier dato obligaría a inventarla. Sin fecha, la ficha lo marca como dato que falta. Ninguna fecha puede ser futura, salvo la del último dividendo.
7. **Plusvalía = valor comercial − precio de compra, comparados en la moneda en que se compró.**
   - Si se compró en UF, el valor de hoy se pasa a UF y la ganancia es real.
   - Si se compró en pesos, se compara en pesos y la ficha avisa «en pesos de la fecha de compra: incluye la inflación».

   Es como comparar el sueldo de hoy con el de hace diez años: en pesos parece que subió mucho, pero parte de esa subida es solo que todo cuesta más. La UF ya descuenta la inflación, así que una compra en UF da la ganancia de verdad.
8. **Valor neto = valor comercial − saldo de la deuda**, en la moneda del valor comercial. Si las monedas no coinciden, se convierte con la última UF de la base.
9. **El dividendo se muestra, pero no entra al costo anual.** Un dividendo mezcla dos cosas: el abono a capital, que es como poner plata en una alcancía que queda dentro de la propiedad, y los intereses, que sí son gasto. Sumarlo entero haría ver la rentabilidad neta peor de lo que es. Separar los intereses queda en `PENDIENTES.md`.
10. **El valor comercial queda «desactualizado» al cumplir 12 meses.** No hay norma: es la sugerencia de la investigación de la etapa 1 (los bancos piden tasaciones aún más recientes). La ficha lo pinta en color de aviso y «Datos al día» lo marca vencido.
11. **Sin saldo cargado = sin deuda.** La base no distingue «no tiene deuda» de «nadie la anotó». Se acepta así, y la ficha dice «Sin deuda registrada». Un saldo de 0 cuenta igual que sin saldo. Para que una deuda no se pierda a medias, el formulario no deja guardar el banco, el dividendo o sus fechas sin el saldo.

## En `/resumen`

El patrimonio neto de la cartera es la suma de los valores comerciales menos la suma de las deudas, cada una multiplicada por la participación del dueño o grupo elegido en el filtro (la misma regla que ya usaba el valor comercial). La deuda se cuenta aunque la propiedad no tenga valor comercial cargado: se debe igual.

## Alternativas descartadas

- **Tabla de créditos aparte:** ver decisión 5.
- **Fechas obligatorias:** ver decisión 6.
- **Plusvalía siempre en pesos:** más simple, pero en una compra de hace diez años mostraría como ganancia lo que es solo inflación.
- **Dividendo completo como costo:** ver decisión 9.

## Consecuencias

- La plusvalía y el valor neto dependen de la UF guardada en la base. Hoy la última es del 2026-06-01; mientras no se traiga la UF automática (`PENDIENTES.md`), las conversiones usan ese valor.
- Si falta la UF y las monedas no coinciden, la ficha muestra «—» en el neto o en la plusvalía, con un aviso, en vez de un número equivocado.
- El patrimonio neto puede verse más alto de lo real en propiedades con deuda que nadie anotó (decisión 11).
- También puede verse más bajo: en `/resumen` se resta la deuda de una propiedad sin valor comercial cargado, y al filtrar por un dueño el neto puede salir negativo. La ficha de esa misma propiedad muestra «—» en el valor neto, porque sin valor no hay nada contra qué restar. La solución es cargar el valor.
- Si no hay UF en la base, `/resumen` no puede pasar a pesos las deudas en UF: no las resta y lo dice en la métrica («N en UF sin convertir»).
