# TAREA — Paneles de contratos, cobranza y cuentas

Espacio `contratos-cobranza` de portal-proges (branch `contratos-cobranza`, base `proges_dev_contratos_cobranza`, portal en el puerto 4030).

## Objetivo
Desarrollar y mejorar los paneles `/contratos`, `/cobranza` y `/cuentas`: resolver los pendientes ya anotados que los tocan y sumar las mejoras que salgan de cómo Diego los usa hoy.

## Qué es «listo»
1. Resueltos (o decididos y anotados por qué no) los pendientes de `PENDIENTES.md` que tocan estos paneles:
   - Cuentas pagadas no llegan a la rentabilidad (`PropertyBill` pagada no crea `Movement`).
   - `toFieldErrors` copiado en `cobranza/actions.ts` y `contratos/actions.ts` (y de paso `duenos`, `contactos`) → usar `src/lib/form-helpers.ts`.
   - Cuentas: «vencida» desde la tarde anterior (fechas UTC vs. Chile; también ficha, `noFutura`, `mesesDesde`).
   - Alertas que se actualizan solo al abrir `/pendientes` o la ficha.
   - Cuentas: `revalidatePath` usa el `propertyId` del formulario.
   - Cuentas: «Marcar pagada» no propone la fecha de hoy.
   - Alerta de desocupada cuenta desde la última edición.
   - Ficha: contrato terminado antes de plazo (falta la fecha real de salida).
   - Contratos con estado guardado `POR_VENCER` (decidir: se elimina o cuenta como vigente).
2. Las mejoras nuevas que Diego apruebe en el plan, construidas.
3. Pasan las verificaciones del proyecto (`npm run lint`, `npm run build`) y cada cambio se probó en el navegador en `localhost:4030`.
4. `/code-review` sobre la branch, hallazgos arreglados o anotados en `PENDIENTES.md`; las líneas resueltas salen de `PENDIENTES.md` en el mismo commit.

## Paso siguiente
**Etapa 2: 2b, 2c y 2d corriendo en paralelo** (subagentes Sonnet, sin `isolation`; no corren `npm run build` porque comparten `.next`). Archivos de cada uno:
- **2b** (acciones del contrato): `contratos/actions.ts`, nuevo `contratos/ciclo-actions.ts`, `contratos/[id]/page.tsx` + componentes nuevos, `contract-form.tsx`, páginas `nuevo` y `editar`; puede agregar funciones puras a `src/lib/contratos.ts`. Extra acordado: al editar un contrato con `fechaSalida`, el formulario muestra «Fecha de salida» para corregirla o borrarla (si no, un término mal ingresado no tendría arreglo).
- **2c** (avisos): solo `src/lib/alerts.ts` (y, si hace falta, las etiquetas de los 3 avisos nuevos en `domain.ts`).
- **2d** (ficha): `lease-tab.tsx`, `situation-card.tsx`, `propiedades/[id]/page.tsx`, `property-metrics.ts` (`diasSinContrato` devuelve `{ dias, desde }`).

Si la conversación se cortó con los subagentes a medias: revisar `git status` / `git diff --stat` y relanzar solo la pieza que falte, con su lista de archivos. Cuando vuelvan los tres: leer el diff, `npx tsc --noEmit`, `npm run lint`, `npm run build`, y probar en el navegador lo de «Verificación → Etapa 2» del plan. Después, commit, cerrar la etapa aquí y pausar con «Etapa 2 lista. Escribe `/clear` y después `sigue`».

## Etapas
✅ Etapa 1 — La plata que se escapa (1a → 1b ∥ 1c). Commits `b01bc74` y siguiente.
⏳ Etapa 2 — Contratos que se renuevan solos (2a → 2b ∥ 2c ∥ 2d)
◻️ Etapa 3 — Pendientes: anticiparse (3a → 3b ∥ 3c)

## Bitácora
- 2026-10-04: espacio abierto; Diego confirmó que los pendientes entran en la tarea.
- 2026-10-04: conversación de revisión (mirada de inversionista con objetivos distintos). Ver «Lo conversado».
- 2026-10-04: Diego aprobó el plan (abajo). Renovación por el mismo plazo del contrato original.
- 2026-10-04: **etapa 1 cerrada.** Lo hecho: `src/lib/fechas.ts` (`hoyChile` y compañía) y `src/lib/contratos.ts` (`whereCubreMes`); pagos parciales que se suman (ADR 0006); Inicio y `/resumen` cuentan lo cobrado en UF (convertido con la última UF) y los parciales; aviso `COBROS_SIN_GENERAR` (migración `20261005002925`); cuentas: `revalidatePath` con la propiedad de la cuenta y fecha de hoy al marcar pagada; `toFieldErrors` y `dateField` desde `form-helpers`. Probado en el navegador a las ~21:30 de Chile: pago parcial 40.000 + 15.000 sobre 55.000 (Parcial → Pagado); Inicio = 443.090 (55.000 + 9,85 UF × 39.400); aviso de cobros sin generar aparece y se va al generar; la luz que vence hoy figura «Pendiente», no «Vencida». Datos de prueba restaurados.
  - Aprendido: en Chrome, el clic por `ref` a veces no llega al botón de enviar; hacer clic por coordenadas después de una captura. Un script suelto de `npx tsx` no lee el `.env`: agregar `import "dotenv/config"`.
  - Visto y no tocado (se va con la etapa 3): `/pendientes` tira en consola el error de botón dentro de botón (ya en pendientes); la fecha de creación de las alertas sale en UTC (una alerta creada de noche aparece con fecha de mañana).

- 2026-10-04: **pieza 2a hecha** (commit `c010ef2`). Migración `20261005004449_contratos_renovacion`: 69 contratos antes y después; los 13 terminados con `fechaSalida`; los 56 vigentes suman igual ($19.365.000 + 912,12 UF). `src/lib/contratos.ts` con `terminoVigente`, `fechaLimiteAviso`, `estadoContrato`, `estaVigente`, `proximoReajuste`, `plazoEnMeses`, `whereVigenteEn`, `whereCubreMes`. ADR 0007. Probado en el navegador: `/resumen` (yield 4,6% = $663,6 M ÷ valor), filtro de estados en `/contratos` (13 terminados), ficha de Placer 656 (33,07 UF, «Vigente»), detalle y formulario sin selector de estado.
  - Aprendido: `prisma migrate dev --create-only` se niega sin terminal interactiva cuando la migración bota datos; el SQL se escribe a mano. El subagente le puso una hora inventada (mediodía de mañana); se renombró a la hora UTC real (`date -u +%Y%m%d%H%M%S`) y se corrigió `_prisma_migrations.migration_name`, para que la migración de la etapa 3 quede ordenada después.
  - Aprendido: el seed toma 45 propiedades de `prisma/datos-reales.json` (fuera de git, solo en la carpeta original). Sin ese archivo inventa las 80 y los números cambian. Se copió al espacio (también ignorado por git) antes de recargar.

## Plan aprobado (2026-10-04)

**Tamaño: grande.** Tiene más de 10 archivos y varias piezas que se pueden hacer en paralelo. Va en tres etapas, con pausa y `/clear` entre cada una (regla 10). Cada pieza la ejecuta un subagente Sonnet.

### Contexto

En la conversación del 2026-10-04 revisamos Pendientes, Cobranza, Cuentas y Contratos con la mirada de un inversionista que tiene muchas propiedades y objetivos distintos. Aparecieron dos problemas:

1. **Plata que se escapa sin aviso.** Inicio no cuenta lo cobrado en UF, que en los datos de ejemplo son unos $32 M de $49 M. Los reajustes nunca se aplican: hay 14 contratos que siguen cobrando el monto original. Un pago incompleto queda como «Pagado». Si nadie genera los cobros del mes, nada avisa. Un contrato vencido que sigue marcado «Vigente» se apaga en silencio.
2. **La app avisa tarde.** De los 8 tipos de alerta, solo 3 se adelantan. Diego definió el valor de la app como *anticiparse antes de que venzan las cosas*.

**Proceso que soporta:** el control mensual del dueño (cobrar, pagar, decidir sobre cada contrato) y las decisiones con plazo: renovar o no, reajustar, renovar pólizas.

**Ya decidido por Diego:**
- Los plazos de aviso de la tabla: aviso de no renovación 30 días antes de la fecha límite; término 120; reajuste 30; pólizas y papeles 45; contribuciones 30; cuentas 7.
- Los contratos **se renuevan solos** salvo aviso, con **60 días** de aviso, y ese plazo es una **perilla por contrato**.
- Cada renovación es **por el mismo plazo del contrato original**.

### Decisiones que cierra este plan (cada una con su ADR)

**A. Un pago parcial se suma en el mismo cobro (ADR 0006, etapa 1).**
Cada «Registrar pago» se suma a lo ya pagado. El cobro queda «Pagado» solo cuando cubre lo esperado; mientras tanto se muestra «Parcial · falta $X» y sigue contando como atrasado si ya venció.
- *Alternativa descartada:* una tabla de abonos, uno por pago. Sería más completa, pero no hace falta hoy.
- *Costo:* se pierde la fecha de cada abono; queda la del último.

**B. El estado del contrato se calcula a partir de las fechas, no se guarda (ADR 0007, etapa 2).**
Hoy el estado se elige a mano y puede no calzar con las fechas: así pasó con `POR_VENCER` y con el contrato vencido marcado «Vigente». Se elimina la columna `estado` del contrato y el estado se deduce así:
- **Por empezar:** la fecha de inicio todavía no llega.
- **Vigente:** se renueva solo, o su término no ha llegado.
- **Termina el X:** ya se avisó la salida.
- **Terminado:** la fecha de salida ya pasó.
- **Vencido:** no se renueva solo, ya pasó el término y nadie lo terminó. Es un error a corregir y levanta un aviso.

**C. La renovación automática se calcula, no se escribe (ADR 0007).**
Funciona como un evento repetido del calendario: se guarda la regla («cada 12 meses») y no cada repetición. El «término vigente» se obtiene avanzando el término guardado de a un plazo hasta pasar hoy. Así no hace falta que nada corra a medianoche para renovar contratos. El botón «Renovar» solo adelanta esa renovación.

**D. Pendientes se calcula al abrirlo, sin guardar alertas (ADR 0008, etapa 3).**
Hoy las alertas se guardan en una tabla, se desfasan y el botón «Resolver» no sirve. La lista pasa a ser una consulta que se calcula al momento: siempre está al día y cada línea desaparece cuando se resuelve su causa. Se elimina la tabla `Alert`.
- *Alternativa descartada:* mantener la tabla y agregarle columnas de fecha y monto.

### Etapa 1 — La plata que se escapa

**Pieza 1a (va primero): fechas en hora de Chile.**
- Archivo nuevo `src/lib/fechas.ts` con:
  - `hoyChile(ahora = new Date())`: medianoche UTC del día calendario en Santiago, usando `Intl` con `America/Santiago`, sin librerías.
  - `mesActual()`, `sumarDias()`, `sumarMeses()` (recorta al último día del mes), `rangoDelMes(mes)`, y `vencimientoDelMes(mes, dia)`, que se mueve desde `cobranza/actions.ts` (`calcVencimiento`).
- Archivo nuevo `src/lib/contratos.ts` con `whereCubreMes(mes)`, el filtro que hoy está dentro de `generateMonthCharges`, para compartirlo.
- Reemplazar las comparaciones con `new Date()` por `hoyChile()` en:
  - `alerts.ts` y `cuentas/page.tsx`;
  - `propiedades/[id]/bills-tab.tsx` y `propiedades/[id]/page.tsx` (el `now` que reciben `property-metrics` y `papeles`), y `documents-tab.tsx`;
  - `form-helpers.ts` (`noFutura`);
  - `cobranza/page.tsx` (`currentMonth`), Inicio y `resumen/page.tsx`.
- Las marcas de tiempo reales siguen con `new Date()`.

**Pieza 1b: cobranza.** Archivos: `cobranza/actions.ts`, `cobranza/[id]/page.tsx`, `pay-form.tsx`, `charges-table.tsx`, `(app)/page.tsx`, `resumen/page.tsx` y `docs/decisiones/0006-…`.
- `registerPayment` suma el abono (decisión A). El formulario propone la fecha de hoy y el saldo como monto.
- El detalle muestra «Pagado $X de $Y · falta $Z».
- La tabla muestra «Parcial» como etiqueta calculada.
- Inicio, «Ingreso del mes»: suma todo `montoPagado` con fecha de pago en el mes. La UF se convierte con `getLatestUf` + `toCLP` (`src/lib/currency.ts`) y se incluyen los pagos parciales.
- `/resumen`, ingreso por arriendo: cuenta también los pagos parciales, con la misma regla.
- `toFieldErrors` pasa a importarse de `src/lib/form-helpers.ts` en `cobranza`, `contratos`, `duenos` y `contactos`.

**Pieza 1c: aviso de cobros sin generar y arreglos de cuentas.** Archivos: `schema.prisma` + migración, `alerts.ts`, `domain.ts`, `cuentas/actions.ts` y `bills-tab.tsx`.
- Nuevo tipo de aviso `COBROS_SIN_GENERAR`: hay contratos que cubren el mes actual (`whereCubreMes`) sin cobro de ese mes. Es un solo aviso para toda la cartera, con enlace a `/cobranza?mes=`.
- `markBillPaid` y `removeBill` revalidan la ficha con el `propertyId` de la cuenta, no con el del formulario.
- «Marcar pagada» propone la fecha de hoy.

**Orden:** 1a, después 1b y 1c en paralelo; no tocan los mismos archivos.

**Pendientes que se cierran:** «vencida» desde la tarde anterior (incluye ficha, `noFutura` y `mesesDesde`), `revalidatePath` de cuentas, «Marcar pagada» sin fecha de hoy y `toFieldErrors` copiado.

### Etapa 2 — Contratos que se renuevan solos

**Pieza 2a (va primero): el modelo nuevo.** Archivos: `schema.prisma` + migración, `src/lib/contratos.ts`, `domain.ts`, `docs/decisiones/0007-…`, seed, y cambiar en todos lados el uso de `estado` del contrato.

Cambios en `LeaseContract`:
- **Se agregan:** `renovacionAutomatica` (sí por defecto), `diasAviso` (60 por defecto), `plazoMeses` (largo de cada período), `fechaSalida`, `garantia` (en la moneda del arriendo) y `ultimoReajuste`.
- **Se quita:** `estado` y su enum `ContractStatus`.
- **Avisos nuevos:** `AVISO_NO_RENOVACION`, `REAJUSTE_PENDIENTE` y `CONTRATO_VENCIDO`.

La migración traspasa los datos que existen:
- TERMINADO y RENOVADO pasan a `fechaSalida = fechaTermino`.
- VENCIDO pasa a `renovacionAutomatica = false`.
- `plazoMeses` sale de las fechas.
- Si un contrato tiene reajuste sin frecuencia, se le pone 12.

`src/lib/contratos.ts` suma estas funciones: `estadoContrato(c, hoy)`, `terminoVigente(c, hoy)`, `fechaLimiteAviso(c, hoy)`, `proximoReajuste(c)`, `whereVigenteEn(fecha)` y `whereCubreMes(mes)`, esta última ya con el modelo nuevo.

Dónde se usa hoy `estado` y hay que cambiarlo:
- `alerts.ts` (reglas 1 y 2) y `resumen/page.tsx`;
- `property-metrics.ts` (`rentaMensual`, `rentaAnualCLP`, `diasSinContrato`) y la ficha (`page.tsx`, `lease-tab.tsx`);
- `generateMonthCharges`;
- la tabla, el detalle, el formulario y las acciones de contratos;
- `prisma/seed.ts` y `seed-propiedades.ts`.

**Pieza 2b: las acciones del contrato.** Archivos: `contratos/actions.ts`, nuevo `contratos/ciclo-actions.ts`, `contratos/[id]/*` (con componentes nuevos para las acciones), `contract-form.tsx` y las páginas `nuevo` y `editar`.

En el formulario:
- Campos nuevos: «Se renueva solo», «Días de aviso», «Se renueva por (meses)» (vacío = se calcula de las fechas) y «Garantía».
- La frecuencia de reajuste pasa a ser obligatoria si hay reajuste.
- Los selectores muestran la etiqueta, no el valor interno.

Las acciones:
- **Renovar:** el término pasa a ser el término vigente más el plazo.
- **Terminar:** pide la fecha de salida. Borra los cobros **sin pago** de los meses posteriores a la salida, y el cuadro de confirmación dice cuántos son.
- **Reajustar:** pide el porcentaje y la fecha efectiva (por defecto, la del próximo reajuste) y muestra el monto nuevo antes de guardar. Actualiza los cobros sin pago desde ese mes y guarda `ultimoReajuste`.

El detalle del contrato muestra garantía, renovación («se renueva sola cada 12 meses · avisar antes del 30-01-2027»), próximo reajuste y la lista de sus cobros, que es el historial de la renta.

**Pieza 2c: los avisos de contratos.** Archivo: `alerts.ts`.
- **Aviso de no renovación:** el contrato se renueva solo y su fecha límite de aviso cae dentro de los próximos 30 días. Severidad ALTA si quedan 7 días o menos.
- **Contrato por vencer:** solo para los que no se renuevan solos, a 120 días.
- **Contrato vencido:** cuando el estado calculado es «Vencido».
- **Reajuste pendiente:** el próximo reajuste cae dentro de los próximos 30 días o ya pasó.

**Pieza 2d: la ficha.** Archivos: `lease-tab.tsx`, `situation-card.tsx`, `propiedades/[id]/page.tsx` y `property-metrics.ts`.
- La pestaña Arriendo muestra el estado calculado y el término vigente.
- «Sin contrato desde» usa la fecha real de salida, y `diasSinContrato` entrega también el «desde», así que `page.tsx` ya no lo calcula por su cuenta.

**Orden:** 2a, después 2b, 2c y 2d en paralelo. Después de 2a se recargan los datos de ejemplo en la base del espacio.

**Pendientes que se cierran:** contratos con estado `POR_VENCER`, contrato terminado antes de plazo, y selectores que muestran el valor interno (en `contract-form`).

### Etapa 3 — Pendientes: anticiparse

**Pieza 3a (va primero):** archivo nuevo `src/lib/agenda.ts`, con la función `agenda(orgId, hoy)` envuelta en `cache()` de React para no calcularla dos veces en la misma página. Archivo del ADR: `docs/decisiones/0008-…`.
- Pasa todas las reglas de `alerts.ts` a ítems con: cuándo hay que actuar (atrasado, ≤7 días, ≤30, ≤90), fecha, monto en pesos, propiedad, contrato y acción (texto y enlace).
- Reglas nuevas:
  - papeles y pólizas con vencimiento a 45 días, reutilizando la regla de vigencia de `src/lib/papeles.ts`;
  - «N arriendos vencen esta semana · $X».
- «Desocupada» se mide desde la salida del último contrato, como la ficha, y no desde la última edición.

**Pieza 3b: la página Pendientes rehecha.** Archivos: `pendientes/page.tsx` y componentes nuevos.
- Secciones Atrasado (con el total en $), Esta semana, Este mes y Próximos 3 meses.
- Cada línea lleva su botón:
  - un cobro abre el cobro, con el formulario de pago;
  - un aviso de contrato abre el contrato, en sus acciones;
  - una cuenta se marca pagada ahí mismo, con la fecha de hoy.
- Sin «Resolver».

**Pieza 3c: sacar la tabla de alertas.** Archivos: `layout.tsx` (el contador pasa a ser atrasado + esta semana), Inicio (lo urgente sale de la agenda), `attention-strip.tsx` y la ficha (la agenda filtrada por propiedad), `schema.prisma` + migración (borra `Alert` y sus enums), y `domain.ts`. Se borran `alerts.ts`, `pendientes/actions.ts` y `alert-group.tsx`.

**Orden:** 3a, después 3b y 3c en paralelo.

**Pendientes que se cierran:** alertas que solo se actualizan al abrir Pendientes, «Resolver» que no sirve, botón dentro de otro botón, `syncAlerts` antes de comprobar que la propiedad existe, y desocupada medida desde la última edición.

### Lo que queda fuera (pasa a `PENDIENTES.md` al cerrar)

- Cobranza: deuda acumulada por arrendatario, pagar desde la lista, totales esperado / cobrado / falta, y si se cuadra contra la cartola. Espera las respuestas de Diego.
- Cuentas: quién paga cada una, y que la cuenta pagada pase a gasto (`Movement`). Este último ya estaba en pendientes y espera la misma respuesta.
- Filtro por dueño o sociedad y objetivo en todos los paneles; Inicio como tablero; correo semanal (servicio de correo y tarea programada, regla de código 3); «Posponer» en Pendientes.
- Reajuste calculado solo con el IPC del Banco Central: hoy no hay valores de IPC en la base, así que se ingresa el porcentaje a mano.

### Verificación

**En cada etapa:**
- Pasan `npm run lint` y `npm run build`.
- Se prueba en el navegador en `localhost:4030` (`espacio servidor contratos-cobranza portal`; se apaga al terminar).
- Los números se contrastan con consultas `psql` a `proges_dev_contratos_cobranza`.

**Etapa 1:**
- `npx tsx -e` con `hoyChile(new Date("2026-10-05T01:30:00Z"))` → 2026-10-04.
- Inicio: el ingreso del mes coincide con lo que da SQL (CLP + UF × la última UF).
- Un pago de $400.000 sobre $500.000 queda «Parcial · falta $100.000»; un segundo pago de $100.000 lo deja «Pagado».
- Al borrar un cobro de octubre aparece el aviso «cobros sin generar», y desaparece al generarlos.
- Una cuenta que vence hoy no figura como vencida.

**Etapa 2:**
- La migración se aplica sobre la base del espacio sin perder contratos (mismo total antes y después).
- Crear un contrato que termina en 75 días: aparece el aviso de no renovación.
- «Renovar» lo hace desaparecer y mueve el término un plazo.
- «Terminar» con salida anticipada borra los cobros sin pago posteriores y la ficha dice «Sin contrato desde <salida>».
- Uno de los 14 contratos con reajuste muestra «Reajuste pendiente»; al reajustar un 4%, cambian el monto y los cobros sin pago.

**Etapa 3:**
- Pendientes muestra las cuatro secciones.
- Pagar una cuenta desde Pendientes la saca de la lista y baja el contador del menú sin recargar otra página.
- La ficha muestra solo los ítems de su propiedad.
- Ya no queda ninguna referencia a `db.alert`.

**Al final:**
- `/code-review` sobre la branch: cada hallazgo se arregla o queda anotado en `PENDIENTES.md`.
- `TAREA.md` se borra en el último commit.
- **Al subir:** las migraciones de las etapas 1, 2 y 3 se aplican en Neon a mano, antes del push (`AGENTS.md`). Lo hace Diego cuando pida subir.

**Relevo:** al cerrar cada etapa hay commit en la branch y `TAREA.md` se pone al día con lo hecho y el paso siguiente. Luego viene el aviso «Etapa N lista. Escribe `/clear` y después `sigue`».

## Lo conversado (2026-10-04, antes del plan)

**Hallazgos en el código (plata que se escapa sin aviso):**
- Inicio, «Ingreso del mes», suma solo cobros en CLP (`moneda: "CLP"`): en septiembre de los datos de ejemplo deja fuera 820 UF (~$32 M) de ~$49 M.
- Los reajustes nunca se aplican: `generateMonthCharges` copia `contract.monto`. 14 contratos con reajuste y más de un año cobran el monto original.
- `registerPayment` marca PAGADO aunque `montoPagado < montoEsperado`: el saldo desaparece.
- Si nadie aprieta «Generar cobros del mes», no hay cobros ni alerta que avise.
- Contrato VIGENTE con `fechaTermino` pasada: deja de generar cobros y no levanta alerta (ni «por vencer», que exige `gte: now`, ni «arrendada sin contrato», que solo mira el estado).

**Dirección que le gustó a Diego:**
- Lo más valioso de la app: **anticiparse antes de que venzan las cosas**. Cada cosa avisa con el margen que toma resolverla.
- Pendientes pasa de alarmas por propiedad a una lista por cuándo actuar: Atrasado (con total en $) / Esta semana / Este mes / Próximos 3 meses. Cada línea con su acción y monto; se cierra sola al hacer la acción.
- Cobranza: esperado / cobrado / falta en pesos (UF convertida), deuda acumulada por arrendatario, pago desde la lista, pagos parciales con saldo.
- Contratos: acciones (Renovar, Reajustar, Terminar con fecha real) y estado deducido de las fechas; historial de renta; garantía.
- Cuentas: distinguir quién paga (arrendatario vigila / dueño costo).
- Filtro por dueño o sociedad y objetivo en todos los paneles.
- Inicio como tablero: ¿me pagaron? ¿pagué lo mío? ¿qué se viene? ¿qué me cuesta plata?

**Decidido por Diego:**
- Plazos de anticipación aprobados: aviso de no renovación 30 días antes de su fecha límite; término de contrato 120 días; reajuste 30; pólizas y papeles con vigencia 45; contribuciones 30; cuentas 7.
- Los contratos **se renuevan solos** salvo aviso, con **60 días** de aviso; ese plazo debe ser **ajustable** («una perilla»).

**Abierto:**
- ¿Basta con la pantalla o se quiere un correo semanal? (correo + tarea programada = piezas nuevas, regla de código 3).
- ¿Cómo se entera el dueño de que le pagaron (cartola, aviso de transferencia, comprobante)?
- ¿Cada sociedad cobra en su propia cuenta bancaria?
- Cuentas de una arrendada: ¿quién las paga y quién revisa?
