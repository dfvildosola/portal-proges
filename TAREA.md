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

- ⏳ **Etapa 1: ficha nueva con los datos que ya existen** (no toca la base). Piezas en serie, cada una con un subagente Sonnet:
  - ◻️ **A. Cálculos:** `src/lib/property-metrics.ts`.
  - ◻️ **B. Pestañas y cuadros.**
  - ◻️ **C. Resumen y armado de `page.tsx`.**
  - ◻️ **Coordinador:**
    - escribe el ADR 0002;
    - actualiza `PENDIENTES.md` (lista de abajo) y saca de ahí la línea del selector de estado;
    - prueba en el navegador;
    - hace commit y pausa.
- ◻️ **Etapa 2: valores con fecha y fuente, compra y deuda** (con migración).
  - Primero partir `propiedades/actions.ts` (765 líneas).
  - Campos nuevos en `Property`:
    - fecha y fuente del valor comercial;
    - fecha y precio de compra, con su moneda;
    - saldo de la deuda, con su moneda y fecha.
  - En la ficha: valor neto, plusvalía y «valor comercial hace N meses» (desactualizado pasados los 12).
  - Patrimonio neto en `/resumen`. Primero partir `resumen/page.tsx` (773 líneas).
  - ADR 0003. El detalle se confirma con Diego al empezar.
- ◻️ **Etapa 3: papeles en regla.**
  - Tipos de documento nuevos (migración): dominio vigente, hipotecas y gravámenes, certificado de avalúo, recepción final, reglamento de copropiedad, permiso de edificación, plano, derechos de agua y subdivisión SAG.
  - Lista por defecto según tipo de propiedad, escrita en `src/lib/papeles.ts`, y una tarjeta «Papeles» con ✓/✗ y fecha de emisión.
  - ADR 0004: se parte con la lista en el código y se personaliza por empresa cuando un cliente lo pida.

### Para `PENDIENTES.md` (el coordinador los agrega en la etapa 1)

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

## Lo que falló y cómo se resolvió

Nada todavía.

## Paso siguiente exacto

**Pieza A.** Lanzar un subagente con `model: sonnet` y este encargo:

> **Objetivo:** crear `src/lib/property-metrics.ts`, con funciones puras (sin acceso a la base, sin JSX) que calculen las cifras de la ficha. Lee primero `TAREA.md` (decisiones 3, 4 y 5, y «Lo que se sabe del código»).
>
> **Funciones** (los nombres y tipos exactos los decide el subagente; cada una con un comentario en español):
> - `rentaMensual(contratos)`: monto y moneda del contrato VIGENTE, o null.
> - `costoAnual({ taxes, movements, uf, now })`: desglose en CLP (contribuciones, gastos por categoría, total), con la regla de la decisión 3.
> - `rentabilidad({ rentaAnualCLP, costoAnualCLP, valorCLP })`: bruta y neta en %, o null si no hay contrato o el valor es 0.
> - `diasSinContrato(contratos, now)`.
> - `tiraDePagos(charges, now, meses = 12)`: un punto por mes, del más antiguo al más reciente, con estado PAGADO, ATRASADO, PENDIENTE o SIN_COBRO.
> - `datosAlDia({ assessments, taxes, documents, now })`: lista de chequeos, cada uno con texto y estado ok/falta/vencido.
>
> Usa `toCLP` de `src/lib/currency.ts` y compara las fechas en UTC.
>
> **No tocar:** ningún otro archivo.
>
> **Para darlo por hecho:** `npm run lint` sin errores nuevos y `npm run build` pasan.
>
> **Devolver:** un informe corto (qué funciones, sus firmas, dudas), no el código.

Después vienen la **pieza B** y la **pieza C**, como se describen en el plan.
