# 0002 — Ficha de propiedad: cómo se calculan las cifras y cómo se muestra el mapa

Fecha: 2026-10-01 · Estado: aceptada

## Contexto

La ficha de cada propiedad (`/propiedades/[id]`) la abren el dueño, para saber cómo le va a la propiedad, y quienes le administran la cartera, para saber qué hacer. Hasta ahora no mostraba ni un número que respondiera «¿cómo va?». Se agregan cuatro cifras arriba (valor comercial, renta mensual, rentabilidad y costo anual) y un mapa de la ubicación. Las dos cosas obligan a elegir: qué cuenta como costo, y con qué servicio se dibuja el mapa.

## Decisión 1: las cifras

- **Renta mensual:** la del contrato vigente, en su moneda.
- **Costo anual (en pesos):** las cuotas de contribuciones que vencieron en los últimos 12 meses, más los gastos registrados (`Movement` de tipo gasto) de los últimos 12 meses, **sin** los de categoría «Impuesto». Se sacan porque las contribuciones ya se suman desde su propia tabla: si alguien además las anotó como gasto, se contarían dos veces.
- **Rentabilidad bruta:** renta del año dividida por el valor comercial. Es exactamente la misma fórmula de `/resumen`, para que las dos pantallas nunca digan números distintos de la misma propiedad.
- **Rentabilidad neta:** (renta del año − costo anual) dividido por el valor comercial. Es la que va en grande, porque responde mejor «¿cuánto me deja?». La bruta queda en chico al lado.

Piensa en la bruta como el sueldo antes de descuentos y en la neta como el líquido: la bruta sirve para comparar con el mercado, la neta es lo que de verdad queda.

Los cálculos viven en un solo archivo sin pantalla, `src/lib/property-metrics.ts`, para poder revisarlos y reutilizarlos sin abrir la página.

### Lo que todavía no entra

Las **cuentas** (luz, agua, gasto común en `PropertyBill`) no se suman al costo, porque marcarlas pagadas no crea un gasto (ver ADR 0001). Si se sumaran desde las dos tablas, el gasto común anotado también como movimiento se contaría dos veces. Queda en `PENDIENTES.md`. Mientras tanto, la rentabilidad neta puede salir un poco mejor de lo real en las propiedades donde las cuentas se pagan sin registrar el gasto.

Tampoco hay todavía **fecha del valor comercial**: la ficha lo muestra como «sin fecha» hasta la etapa 2.

## Decisión 2: el mapa

Se usa el Google Maps incrustado **sin clave**: un recuadro (`iframe`) que carga `https://www.google.com/maps?q=<dirección, comuna, Chile>&output=embed`, con carga diferida (solo se pide cuando el usuario baja hasta él), más un enlace «Abrir en Google Maps».

Es como pegar en la ficha la ventana de Google Maps con la dirección ya buscada: no hay que instalar nada, ni crear cuenta, ni guardar coordenadas.

## Alternativas descartadas

- **Maps Embed API con clave:** es la versión oficial y también gratis, pero pide crear un proyecto en Google Cloud y guardar una clave. Hoy no hace falta. Queda como plan B.
- **Una librería de mapas (Leaflet, Mapbox):** obliga a guardar coordenadas de cada propiedad y a sumar una dependencia. Tiene sentido recién para un mapa de toda la cartera, que está en `PENDIENTES.md`.
- **Sumar las cuentas al costo ahora:** descartado por el riesgo de contar dos veces, explicado arriba.

## Consecuencias

- La dirección `output=embed` sin clave **no es oficial**: Google puede cambiarla sin aviso. Si un día el mapa sale en blanco, se cambia por la Maps Embed API con clave (un cambio de una línea más la clave en `.env`).
- Al cargar el mapa, el navegador del usuario le manda la dirección a Google, igual que si la buscara en Maps.
- El costo anual y la rentabilidad neta dependen de que los gastos se registren como movimientos: si nadie los anota, la neta se parece a la bruta.
