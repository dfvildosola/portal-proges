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
1. Preguntarle a Diego qué le molesta hoy al usar estos tres paneles (regla 8: qué busca y no encuentra, qué hace fuera del portal, qué número no le cuadra).
2. Leer los tres paneles y armar el plan en plan mode (tamaño, etapas, decisiones a cerrar — la de `POR_VENCER` y la de cuentas pagadas → `Movement` probablemente piden ADR en `docs/decisiones/`).
3. Sin el ok de Diego no se escribe código.

## Etapas
◻️ Por definir en el plan.

## Bitácora
- 2026-10-04: espacio abierto; Diego confirmó que los pendientes entran en la tarea.
