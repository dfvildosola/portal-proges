# TAREA — Ficha de propiedad directa (branch `feat/ficha-propiedad`)

Nota de relevo (regla 10 de `~/Code/CLAUDE.md`). Está escrita para alguien que no vio la conversación. Se borra en el último commit de la branch, y lo que quede sin hacer pasa a `PENDIENTES.md`.

## Objetivo

Que la ficha de cada propiedad (`/propiedades/[id]`) sirva para **revisar**, al dueño que pregunta «¿cómo va?, ¿hay algo raro?», y para **gestionar**, a quien administra y pregunta «¿qué hago o qué completo?». Al abrirla, en 5 segundos se tiene que saber si algo requiere atención, cómo le va a la propiedad y qué datos faltan o están viejos.

Contexto que dio Diego (2026-10-01):
- Las carteras son de 20 a 200 propiedades, con objetivos distintos.
- La ven el dueño y las personas que le ayudan a administrar.
- Hoy los datos están dispersos (Excel y otros) y el portal viene a juntarlos, por ejemplo el valor comercial y las contribuciones que vienen.
- Sobre los papeles: proponer «lo más común» y que más adelante cada usuario arme lo suyo.

**«Listo» para cada etapa:**
- `npm run lint` sin errores y `npm run build` pasan;
- la ficha se probó en el navegador con las 4 situaciones: arrendada con pagos atrasados, disponible, uso propio y en venta;
- `/code-review` antes de mezclar.

## Plan aprobado

El plan completo, aprobado por Diego el 2026-10-01, está en `~/.claude/plans/parallel-juggling-lagoon.md`. Lo esencial:

### Decisiones cerradas

1. **La dirección es el título.** Debajo va tipo · comuna · m² · ROL, y a la derecha el estado (editable) y el objetivo.
2. **Franja «Requiere atención» arriba.** Reemplaza la pestaña Alertas y muestra las alertas activas con su botón «Resolver», o «Todo en orden» si no hay. La página llama a `syncAlerts(orgId)` al cargar, igual que `/pendientes`.
3. **Cuatro cifras:**
   - **Valor comercial.**
   - **Renta mensual**, la del contrato `VIGENTE`.
   - **Rentabilidad neta**, con la bruta en chico.
     - Bruta = renta anual ÷ valor comercial, la misma fórmula de `/resumen`: suma de contratos VIGENTE × 12 en CLP ÷ valor comercial en CLP × 100. Solo si hay contrato y el valor es mayor que 0.
     - Neta = (renta anual − costo anual) ÷ valor comercial.
   - **Costo anual**, en CLP:
     - entra: las cuotas de `PropertyTax` con `fechaVencimiento` en los últimos 12 meses (con monto), más los `Movement` de tipo GASTO de los últimos 12 meses, **sin** la categoría `IMPUESTO`, para no contar dos veces las contribuciones;
     - no entra: `PropertyBill`, porque pagar una cuenta no crea un `Movement` (pendiente aparte).
4. **Bloque «Situación», que cambia según el estado:**
   - **ARRENDADA:** arrendatario, días para el término del contrato, reajuste y tira de pagos de 12 meses.
   - **DISPONIBLE o DESOCUPADA:** días sin contrato, desde la `fechaTermino` del último contrato, y costo en ese tiempo.
   - **USO_PROPIO:** costo anual desglosado.
   - **EN_VENTA:** solo el valor. No se diseña el proceso de venta (regla 8).
5. **Bloque «Datos al día»:**
   - ¿hay avalúo del año en curso?
   - ¿están las 4 cuotas de contribuciones del año, y con monto?
   - ¿hay documentos vencidos?
   - El valor comercial aparece «sin fecha»; la fecha llega en la etapa 2.
6. **Mapa:** un iframe de Google Maps sin clave (`https://www.google.com/maps?q=<dirección, comuna, Chile>&output=embed`, con `loading="lazy"`) más un enlace «Abrir en Google Maps». Si esa URL no oficial deja de funcionar, se cambia por la Maps Embed API con clave gratuita.
7. **Cuatro pestañas:** Resumen · Arriendo · Finanzas · Documentos. Finanzas junta contribuciones, cuentas y movimientos.
8. **Ver separado de editar.** Agregar dueño, etiqueta, avalúo y anexo pasa a cuadros (`Dialog`), con el mismo patrón que `UploadDocumentDialog` en `documents-forms.tsx`.
9. **Ancho completo:** dos columnas en el computador, una en el celular.
10. **Arreglar `status-quick-edit.tsx`**, que muestra `ARRENDADA` en vez de la etiqueta. Hoy `<SelectValue />` muestra el valor interno.

Las decisiones 3 y 6 se documentan en el ADR `docs/decisiones/0002-ficha-cifras-y-mapa.md`, que escribe el coordinador en la etapa 1.

### Etapas

- ✅ **Etapa 1: ficha nueva con los datos que ya existen** (no tocó la base). Commits en la branch:
  - ✅ **A. Cálculos:** `src/lib/property-metrics.ts`.
  - ✅ **B. Pestañas y cuadros:**
    - `lease-tab.tsx`, `finance-tab.tsx` y `documents-tab.tsx`;
    - los cuadros `AddOwnerDialog`, `AddTagDialog`, `AddUnitDialog` y `AddAssessmentDialog`;
    - el selector de estado, arreglado con `items={propertyStatusLabels}`.
  - ✅ **C. Resumen y armado:**
    - `property-header`, `attention-strip`, `key-figures`, `situation-card`, `data-freshness`, `property-map`, `facts-card` y `facts-parts`;
    - `page.tsx` en 206 líneas, con 4 pestañas;
    - la pestaña Alertas se eliminó.
  - ✅ **Coordinador:**
    - ADR 0002 escrito;
    - `PENDIENTES.md` al día;
    - probado en el navegador;
    - revisión del `revisor` hecha, con sus hallazgos arreglados o anotados.
- ⏳ **Etapa 2: valores con fecha y fuente, compra y deuda** (con migración). Plan de piezas aprobado el 2026-10-01: `~/.claude/plans/glowing-mixing-biscuit.md`. Decisiones (van al ADR 0003):
  1. Fuente del valor comercial: tasación, corredor o estimación propia (enum `ValorFuente`). «Estimación automática» cuando exista el piloto.
  2. Compra: fecha, precio y moneda, sin gastos de compra.
  3. Deuda: saldo, moneda (por defecto UF) y fecha del saldo, más banco, dividendo mensual (en la moneda del saldo) y fecha del último dividendo.
  4. `exentaContribuciones` (sí/no).
  5. Todo como campos de `Property`, sin tabla de créditos (un crédito por propiedad).
  6. Fechas opcionales; ninguna futura salvo la del último dividendo.
  7. Plusvalía = valor − precio de compra, comparados en la moneda de la compra. Si la compra fue en CLP, aviso «en pesos de la fecha de compra: incluye la inflación».
  8. Valor neto = valor − saldo, en la moneda del valor (con `toCLP` si no coinciden).
  9. El dividendo se muestra, pero no entra al costo anual (mezcla capital e intereses).
  10. Valor comercial desactualizado pasados 12 meses.
  11. Sin saldo = sin deuda («Sin deuda registrada»).
  - Piezas en serie: ✅ (a) partir `propiedades/actions.ts` · ✅ (b) migración, formulario y seed · ◻️ (c) ficha · ◻️ (d) partir `/resumen` y patrimonio neto · ◻️ coordinador (ADR 0003, pendientes, memoria, navegador, revisor, commit).
- ◻️ **Etapa 3: papeles en regla.**
  - Tipos de documento nuevos (migración): dominio vigente, hipotecas y gravámenes, certificado de avalúo, recepción final, reglamento de copropiedad, permiso de edificación, plano, derechos de agua y subdivisión SAG.
  - Lista por defecto según tipo de propiedad, escrita en `src/lib/papeles.ts`, y una tarjeta «Papeles» con ✓/✗ y fecha de emisión.
  - ADR 0004: se parte con la lista en el código y se personaliza por empresa cuando un cliente lo pida.

### Para `PENDIENTES.md` (✅ ya agregados en la etapa 1)

1. **UF e IPC automáticos** desde la API del Banco Central (BDE), que es oficial y gratis. Diego tiene que crear la cuenta y el token dura un año. La CMF queda de respaldo. Hoy la última UF en la base es del 2026-06-01.
2. **Leer con IA** el certificado de avalúo y la escritura, para llenar los datos de la ficha.
3. **Tasación y arriendo de mercado:** piloto de un mes con un proveedor con API (Data Inmobiliaria o HousePricing) y 5 a 10 propiedades. Preguntar por escrito si se pueden guardar y mostrar los valores. Guardarlos como «estimación», con fuente, fecha y rango. Sin scraping de portales.
4. **Avalúo desde el SII:** sin scraping. Pedir un canal oficial o autorización, y revisar a mano la descarga pública de transferencias (F2890) en la página de transparencia del SII.
5. **Reavalúo no agrícola:** confirmar si entra el 1-ene-2027 y preparar la carga de los avalúos nuevos.
6. **Ficha, para después:**
   - anterior/siguiente al recorrer la lista filtrada;
   - bitácora de notas;
   - flujo de venta (primero preguntar cómo se hace hoy);
   - mapa de toda la cartera, que requiere guardar coordenadas;
   - papeles personalizables por empresa;
   - `rolSII` único por comuna y organización;
   - foto de fachada.

## Lo que se sabe del código y de los datos (para los encargos)

- **Next 16 con cambios:** leer la guía en `node_modules/next/dist/docs/` antes de escribir. Los componentes de `src/components/ui` son de base-ui: usan la prop `render` y `nativeButton={false}` en los botones que hacen de link, y `DialogTrigger render={<Button/>}`.
- **Utilidades que ya existen:**
  - `toCLP` y `getLatestUf` (`src/lib/currency.ts`);
  - `formatMoney`, `formatDate`, `formatM2` y `formatPeriodo` (`src/lib/format.ts`);
  - las etiquetas de enums (`src/lib/domain.ts`);
  - `syncAlerts` (`src/lib/alerts.ts`).
- **Fechas:** las del dominio se guardan a medianoche UTC; hay que leerlas y compararlas en UTC.
- **Cobros atrasados:** un cobro es atrasado si `estado = ATRASADO`, o si está `PENDIENTE` con `fechaVencimiento < now`. Es la misma regla de `alerts.ts`.
- **Ficha de hoy:** `src/app/(app)/propiedades/[id]/page.tsx` tiene 706 líneas y 7 pestañas. Ya existen `taxes-tab.tsx`, `bills-tab.tsx`, `economic-forms.tsx`, `owners-tags-forms.tsx` (formularios en línea), `documents-forms.tsx` (cuadro), `status-quick-edit.tsx` y `delete-button.tsx`.
- **Datos de ejemplo en `proges_dev`:**
  - 50 propiedades: 38 arrendadas, 7 disponibles, 3 desocupadas, 1 en venta y 1 de uso propio.
  - `RentCharge` de 2026-01 a 2026-06 (181 pagados, 18 atrasados, 29 pendientes).
  - `Movement`: solo GASTO (246 de gasto común, 44 de reparación, 27 de seguro).
  - 200 cuotas de contribuciones, 4 cuentas, 50 avalúos y 0 documentos.
- **Servidor de desarrollo:** `npm run dev` en `localhost:3000`, desde esta carpeta.

## Resumen de las investigaciones (2026-10-01)

### Qué debe tener una propiedad en Chile

- **Datos imprescindibles:**
  - **Identificación:** alias, tipo, dirección con la unidad por separado, comuna, región, ROL SII (único dentro de la comuna), dueños con su %, objetivo y estado.
  - **Legales:** inscripción en el CBR (Conservador, fojas, número, año), y fecha y tipo de adquisición.
  - **Físicos:** m² de terreno y construidos, y año de construcción.
  - **Económicos:** avalúo vigente, contribuciones, valor comercial con fecha y fuente, precio y fecha de compra, arriendo y gasto común.
- **Datos útiles:**
  - dormitorios y baños, y m² útiles;
  - DFL-2 o exención;
  - condominio y administrador;
  - seguro (aseguradora, póliza, término);
  - hipoteca (banco, saldo, dividendo);
  - números de cliente de los servicios;
  - fotos.
- **Papeles por defecto:**
  - **Todas:** escritura, dominio vigente (CBR), hipotecas y gravámenes (CBR), y certificado de avalúo y deuda de contribuciones (SII).
  - **Lo construido:** recepción final (DOM) y póliza de incendio y sismo.
  - **Casa y local:** permiso de edificación y certificado de número.
  - **Edificio o condominio:** reglamento de copropiedad.
  - **Arrendada:** contrato de arriendo.
  - **Terreno y parcela:** plano y CIP.
  - **Parcela o predio rústico:** subdivisión SAG.
  - **Agrícola y parcela:** derechos de agua (CBR y DGA).

### Qué se desactualiza

| Dato o documento | Cada cuánto cambia |
|---|---|
| Avalúo fiscal | Reajuste por IPC cada semestre (1-ene y 1-jul). El reavalúo general no agrícola sería el **1-ene-2027** (Ley 21.806, por confirmar); el agrícola, el 1-ene-2029. |
| Contribuciones | 4 cuotas: 30-abr, 30-jun, 30-sep y 30-nov. |
| Valor comercial | Sin norma. Se sugiere revisarlo cada 12 meses (los bancos piden tasaciones de menos de ~6 meses). |
| Dominio vigente e hipotecas y gravámenes | No vencen por ley, pero en la práctica se piden con menos de 30 días. |
| Seguro | Según la póliza. |
| Reajuste de arriendo | Según el contrato. |
| UF | Diaria. |
| IPC | Mensual (el INE lo publica el día 8). |

### Qué se puede traer automáticamente

- **UF e IPC: sí.** Solo hay API oficial para esto: Banco Central (BDE) o CMF.
- **SII:**
  - el visor Mapas SII es público, pero sin API, y sus términos dicen «uso personal y no comercial» y exigen autorización para reproducir;
  - el certificado oficial pide la clave del dueño;
  - hay terceros como SimpleAPI, que no son oficiales.
- **TGR:** el certificado de deuda por rol es público, pero no hay API.
- **Portal Inmobiliario, Mercado Libre y TocToc:** sus condiciones prohíben extraer datos. La API de Mercado Libre pide OAuth y sirve para avisos propios.
- **Proveedores pagados con API:** Data Inmobiliaria ($99.990 al mes con 600 llamadas) y HousePricing (venta y arriendo; API en plan Empresa, a cotizar). Tinsa y Databam tienen cobertura limitada.

## Lo que hay en `property-metrics.ts` (pieza A)

Funciones puras, sin acceso a la base. La página les pasa lo que carga.

- `rentaMensual(contratos)` → `{ monto, moneda }` del primer VIGENTE, o null. Sirve para mostrar el monto en su moneda.
- `rentaAnualCLP(contratos, uf)` → suma de **todos** los VIGENTE × 12 en CLP, igual que `/resumen`. Devuelve null si no hay vigente o si falta la UF para convertir (`/resumen` en ese caso descarta en silencio).
- `costoEnPeriodo({ taxes, movements, uf, desde, hasta })` y `costoAnual({ taxes, movements, uf, now })` → `Costo = { contribuciones, gastosPorCategoria[], total, sinConvertir }`. `sinConvertir` cuenta los gastos en UF que no se pudieron convertir; si es mayor que 0, el total queda corto y conviene avisarlo.
- `rentabilidad({ rentaAnualCLP, costoAnualCLP, valorCLP })` → `{ bruta, neta }` en %, o null.
- `diasSinContrato(contratos, now)` → días desde la `fechaTermino` más reciente; null si nunca tuvo contrato o si hay uno VIGENTE.
- `tiraDePagos(charges, now, meses = 12)` → `[{ periodo: "YYYY-MM", estado }]`, con estado PAGADO, ATRASADO, PENDIENTE o SIN_COBRO. Si en un mes hay varios cobros, manda el peor.
- `datosAlDia({ assessments, taxes, documents, now })` → 3 chequeos `{ clave, texto, estado: ok|falta|vencido }`.

Decisiones tomadas en el camino:
- Solo `VIGENTE` cuenta como contrato vigente, igual que `/resumen` y las alertas. `POR_VENCER` lo crean solo los datos de ejemplo, y quedó en `PENDIENTES.md`.
- Para «costo desde que quedó libre» (DISPONIBLE/DESOCUPADA), la página llama a `costoEnPeriodo` con `desde` = `fechaTermino` del último contrato.
- **Datos de ejemplo:** ninguna propiedad tiene contratos terminados, así que `diasSinContrato` da null en las 50. Para probar el caso «disponible» en el navegador, crear a mano un contrato TERMINADO en una propiedad disponible. Todas tienen avalúo solo de 2025, así que el chequeo de avalúo da «falta».

## Lo que falló y cómo se resolvió

- **«Resolver» no hacía nada en la ficha.** La ficha llama a `syncAlerts` al cargar, y una alerta resuelta a mano vuelve al instante si la causa sigue. Diego eligió quitar el botón de la franja (ADR 0002, decisión 3). `/pendientes` tiene el mismo problema desde antes: quedó en `PENDIENTES.md`.
- **La ventana de «últimos 12 meses» tenía un día de más** (sumaba 5 cuotas o 13 gastos comunes el día del vencimiento). `costoAnual` ahora parte al día siguiente de «hoy hace un año».
- **Plural «contribuciónes»** en `alerts.ts`: corregido. El mensaje guardado se actualiza solo al recalcular.
- **No se pudo achicar la ventana de Chrome** (está en pantalla completa). La vista de celular se revisó en el código (`grid-cols-2 lg:grid-cols-4` y `lg:grid-cols-2`), pero **no en pantalla**: la tiene que mirar Diego.
- **El cuadro «Agregar dueño» no marca el error del porcentaje en el campo.** Ya pasaba en `main`; quedó en `PENDIENTES.md` para arreglarlo al partir `actions.ts`.

## Paso siguiente exacto

**Etapa 2, pieza (c): la ficha**, con un subagente Sonnet. El encargo está en el plan `~/.claude/plans/glowing-mixing-biscuit.md`, sección «(c) La ficha». Después viene (d) y luego el cierre del coordinador. Las piezas van en serie, y después de cada una el coordinador corre `npm run lint && npm run build` y revisa el diff.

**Qué dejaron (a) y (b)**, para los encargos:
- **Acciones:** viven en `src/app/(app)/propiedades/{actions,facts-actions,finance-actions,documents-actions}.ts`. Los helpers de validación están en `src/lib/form-helpers.ts`, incluido `optionalDateField({ noFutura })`.
- **Campos nuevos de `Property`** (migración `20261002012815_ficha_valor_compra_deuda`):
  - `valorComercialFecha`, `valorComercialFuente` (enum `ValorFuente`; etiquetas en `valorFuenteLabels` de `src/lib/domain.ts`);
  - `compraFecha`, `compraPrecio`, `compraMoneda`;
  - `deudaSaldo`, `deudaMoneda`, `deudaFecha`, `deudaBanco`, `deudaDividendo`, `deudaTermino`;
  - `exentaContribuciones`.
- **Formulario:** `property-form.tsx` (301 líneas), más los grupos nuevos en `property-form-economic.tsx` (259). El checkbox manda "true"/"false" (`value`/`uncheckedValue`). Todos los `<Select>` del formulario muestran la etiqueta, así que en `PENDIENTES.md` se saca `property-form.tsx` de la línea de selectores.
- **Probado solo con curl** (crear, editar, vaciar, fechas futuras e inválidas). Falta probar el formulario con clics en el navegador al cerrar la etapa.
- **Ojo:** el `next dev` que estaba corriendo en `:3000` tiene el cliente de Prisma viejo en memoria. Hay que reiniciarlo antes de probar en el navegador.
- **Datos de ejemplo:** el seed sigue usando `Math.random` para tipos y montos; volver a sembrar cambia todos los ids.

Al cerrar la etapa 3, y antes de mezclar: `/code-review` sobre la branch, borrar `TAREA.md` y el contrato de prueba (ver abajo).

**Datos de prueba para el navegador** (seed del 2026-10-01, etapa 2):
- **Contrato terminado:** `LeaseContract` con id `prueba-ficha-terminado`, TERMINADO, del 2025-03-01 al 2026-07-31, en la propiedad DISPONIBLE «Av. Marathon 556» (`cmuqaempw0046vkuvg3oind4k`, una casa con valor, compra y deuda). Se borra al cerrar la tarea con `delete from "LeaseContract" where id='prueba-ficha-terminado';`. Para `psql`, quítale a `DATABASE_URL` el `?schema=…`.
- **Arrendada con deuda y compra en UF**, con valor de hace más de 12 meses (local): `cmuqaemnx001hvkuvwcu7qhh2`. Otra, una oficina con valor reciente: `cmuqaemoi0023vkuvq5mowqav`.
- **Arrendada con compra en CLP**, sin deuda: `cmuqaemp0002rvkuvur31yu4o`.
- **Uso propio:** `cmuqaemq2004fvkuvdhkpftuu`.
- **En venta:** `cmuqaemqi0053vkuvyou4rr0k`.
- **Disponible sin datos nuevos:** `cmuqaempk003ovkuvg65dofnq`.
- **Bodega exenta:** `cmuqaemoa001rvkuvk2dshnr4`.
- **Valor de hace más de 12 meses** (corredor): `cmuqaemo5001lvkuvjeats2of`.
- **Conteos:** 35 con fecha de valor (8 de más de 12 meses), 25 con compra (13 en UF y 12 en CLP, 3 con plusvalía negativa), 15 con deuda en UF y 14 bodegas exentas, sin cuotas.
- La arrendada con atraso para probar se elige en `/cobranza`.
