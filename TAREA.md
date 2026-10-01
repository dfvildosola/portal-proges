# TAREA — Cuentas por pagar

Nota de relevo (regla 10). Se borra en el último commit de la branch.

## Objetivo y qué es «listo»

La persona de Proges pidió: control de pagos de gastos comunes y cuentas, alerta de «hay que pagar cuentas» y listado de propiedades con gastos comunes por pagar. Hoy Proges modela lo que el dueño cobra (`RentCharge`) pero no lo que debe pagar.

Listo = se puede anotar una cuenta (gasto común, luz, agua, gas, otro) con vencimiento en una propiedad, marcarla pagada, verla en una lista transversal `/cuentas`, y aparece una alerta si está vencida o por vencer. `npm run lint` y `npm run build` pasan y se probó en el navegador.

Branch: `feat/cuentas-por-pagar` (trabajada en el original: no hay otra tarea en curso, así que sin espacio).
Plan aprobado: `~/.claude/plans/adaptive-stirring-koala.md` (copiado abajo en lo esencial).

## Decisiones tomadas

1. Tabla nueva `PropertyBill`. Las contribuciones (`PropertyTax`) se quedan como están, porque tienen estructura propia (año + cuota 1-4) y ya tienen alertas y pestaña. `/cuentas` puede mostrar ambas leyendo las dos tablas.
2. Tipos: gasto común, luz, agua, gas, otro.
3. Pagar una cuenta NO crea un `Movement` (gasto) automático. Consecuencia: el gasto no aparece en la rentabilidad hasta entonces. Va a `PENDIENTES.md`.
4. Alertas: «cuenta vencida» (ALTA) y «por vencer en ≤7 días» (MEDIA), como reglas nuevas en `syncAlerts` (`src/lib/alerts.ts`).
5. Versión mínima (regla 8): se anota una cuenta con vencimiento y se marca pagada. Sin leer boletas, sin conciliar, sin correos.

## Etapas

- ⏳ **Etapa 1 — Base de datos y acciones.** `prisma/schema.prisma` (enums `BillType`, `BillStatus`, modelo `PropertyBill`, relación en `Property`) + migración; `src/app/(app)/cuentas/actions.ts` (`addBill`, `markBillPaid`, `removeBill`); etiquetas en `src/lib/domain.ts`; ADR en `docs/decisiones/`.
- ◻️ **Etapa 2 — Pantallas.** Primero extraer la pestaña contribuciones de `propiedades/[id]/page.tsx` (804 líneas, sobre el tope; solo mover código). Después pestaña «Cuentas» en la ficha, y página `/cuentas` con filtros + entrada en `src/lib/nav.ts` (grupo «Trabajo diario»).
- ◻️ **Etapa 3 — Alertas.** Dos valores nuevos en `AlertType` (migración), reglas en `syncAlerts`, datos de ejemplo en `prisma/seed.ts`.

## Hallazgos útiles del código

- Molde a copiar: `PropertyTax` (modelo), `addTax`/`markTaxPaid`/`removeTax` en `src/app/(app)/propiedades/actions.ts` (usan zod, `toFieldErrors`, `assertProperty(propertyId, orgId)`, `getOrgId()`, filtran por `organizationId`, cierran con `revalidatePath`). Formularios en `propiedades/[id]/economic-forms.tsx`.
- No crecer `propiedades/actions.ts` (765 líneas): las acciones nuevas van en `cuentas/actions.ts`.
- Migraciones en `prisma/migrations/YYYYMMDDHHMMSS_nombre`. La base local es `proges_dev`.
- Next.js de este repo tiene cambios: leer `node_modules/next/dist/docs/` antes de escribir páginas nuevas.

## Lo que falló / se resolvió

- El espacio `mejoras` fue cerrado en medio de la sesión; no se perdió nada (`main` estaba igual). Se decidió trabajar en el original.

## Paso siguiente exacto

Lanzar un subagente Sonnet para la Etapa 1 (las tres piezas en serie: schema+migración → acciones+domain → ADR). Después revisar `git diff --stat`, correr `npm run lint` y `npm run build`, commit, actualizar este archivo y pedirle a Diego `/clear` + `sigue`.
