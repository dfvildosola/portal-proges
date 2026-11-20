# TAREA — Etapa 1 de Proges: portal nuevo sobre una API propia (v7)

**Estado (2026-11-19): plan v7 APROBADO con workflow.** Etapa 1 ✅ (3afe066). Etapa 2 ✅ (b46a26c, ae54fc4). Etapa 3 ✅ (758dd2f, 60b79b3, 0d81781). Revisión de código ✅ (9ffa3db, 8410ea5, e01f4ce). Cierre publicado; espera la revisión de Diego. Página del plan: https://claude.ai/artifact/Q5hLn7T56rPapBoimRFsEt. Maqueta aprobada: https://claude.ai/artifact/6oufJsWJ57469Ttg2X2RS8. Tamaño: grande, en tres etapas (un workflow por etapa). Branch: `plan/etapa-1-dos-caras`.

**Revisión de Diego en local (2026-11-20).** Pidió borrar los datos de `proges_dev` y cargar los reales: hecho (la base anterior quedó como `proges_dev_respaldo_20261120`; ahora hay NPL con 42 propiedades y 32 servicios «por confirmar», y su usuario admin). Encontró confuso el portal a 1440 px; se recorrió contra la maqueta y aprobó cinco arreglos («dale, haz los cinco»), como tarea mediana con subagentes, en esta misma branch:
1. ✅ «Nuevo» = por revisar, por confirmar o sin responsable, igual en Inicio, Servicios y Repartir; la tarjeta dice «Por confirmar».
2. ✅ Tarjeta del tablero como la maqueta: próximo paso con fecha, iniciales del responsable, días esperando.
3. ✅ Propiedades: fuera la columna «Estado» (Disponible); en su lugar, el estado del servicio, como la maqueta.
4. ✅ Ficha de la propiedad: los documentos que faltan en una sola alerta; las cifras del Resumen en una fila.
5. ✅ Ficha del servicio: un solo aviso arriba; las partes vacías de la obra como una línea cada una.
Hechos (a928805 y el commit siguiente): `npm run verificar` pasa (311 pruebas), recorrido a 1440 y 390 px. Fuera de los cinco: la misma regla de «Nuevo» en Propiedades y la ficha (si no, decían «Nos toca»). El `revisor` encontró cinco puntos y se arreglaron todos: lo nuevo que espera sigue en «Trabado» (como dice el ADR 0017), «Nuevo» no tapa la espera en Propiedades, la alerta agrupada usa la gravedad de la API, `serviciosNuevos` es solo del equipo y un solo tope (6) para los nuevos del Inicio. Falta: que Diego mire las pantallas y dé el ok para mezclar.

**Paso siguiente exacto (antes de los cinco arreglos):** Diego revisa el cierre en la página del plan (ya publicada en estado de cierre, con los hallazgos de la revisión), marca su lista y pega el resumen. Con su ok: «Mezcla» = actualizar la fila de portal-proges en `~/Code/CLAUDE.md` (repo code-raiz, en su branch), borrar este `TAREA.md` en el último commit de la branch y mezclar a `main` local. Subir y publicar son los pasos de la sección 0 de `PENDIENTES.md`, solo cuando Diego lo pida. La revisión de código ya se hizo y sus arreglos están commiteados (9ffa3db, 8410ea5, e01f4ce): 304 pruebas pasan.

**Respuesta de Diego a la revisión (2026-11-19):** «dale, avísame cuando termine». Se toma como sí a las tres propuestas: Maestros abierto a todo el equipo; un servicio sin tareas va a «Nos toca» y «Por entregar» es solo con tareas y todas hechas; el margen solo se muestra con costo de maestro aprobado. Los cuatro detalles de la etapa 1 quedan como están construidos (margen = orden al dueño menos lo facturado; el comentario de la visita lo ve el dueño; el dueño no ve las fotos de recepción; el IVA del presupuesto sigue abierto) y se le vuelven a mostrar en el cierre.

**Lo que dejó la etapa 3** (Q0, T, S, Q, R y Z hechas; T, Q0 y Z fuera del plan):
- Recorrido en el navegador como NPL y como dueño autónomo (cliente Demo), a 1280 y 390 px, con el usuario de Diego pasado a cliente en proges_dev y devuelto después. Probado: oferta registrada y mostrada por el equipo → contraoferta del dueño → tarea al corredor en Hoy; pedido del dueño → Repartir; marcar un cobro pagado; Configuración sin ser administrador (solo Maestros).
- Arreglado en el recorrido: el menú del dueño se caía al abrir (íconos pasados del servidor al navegador); no había cómo confirmar los servicios de la carga inicial (los 32 de NPL quedaban invisibles para el dueño): POST /v1/servicios/{id}/confirmar y botón en la ficha; montos de la tarea del corredor en formato chileno; «Él le comunica» → neutro.
- Cambió respecto del plan: la ficha del dueño arma su propio Resumen e Historial y no lleva «Arriendo y venta» (los enlaces de la ficha compartida van a rutas del equipo); Vencimientos y Cartera mandan al cliente atendido a su inicio (contradice el supuesto s8).
- Sin probar: subir fotos y PDF (faltan credenciales de Drive en el Mac), agregar propiedad, contratos y gastos del autónomo en el navegador, un teléfono real.
- Anotado en PENDIENTES.md: fecha de inicio corrida un día después de las 21:00; PDF de más de 4,5 MB desde la web publicada.

**Lo que dejó la etapa 2** (I, I2, J a P y Z hechas; `npm run verificar` pasa: 254 pruebas, build de la web con 15 rutas; legado/ borrado):
- Recorrido en el navegador con la sesión real de Diego (Clerk → API, primera vez de punta a punta): Inicio, Servicios, Propiedades y ficha, obra S00047 (Agustinas 715 of 706), venta, Repartir, Resultados y Configuración a 1280 px; Hoy, Anotar y Servicios a 390 px. Escritura probada: crear una tarea en la ficha, verla en Hoy, marcarla hecha. Sin errores en la consola.
- Arreglado en el recorrido: el panel de la obra y el de la venta iban apretados en la tercera columna de la ficha del servicio; ahora van a todo el ancho.
- Sin probar: subir fotos y PDF (en el Mac no están las credenciales de Drive; las fotos salen rotas por lo mismo), el teléfono real, y que en Vercel el cuerpo de una server action tiene tope de 4,5 MB (un PDF más grande fallaría: la subida tendría que ir directo a la API).
- La pieza Z se agregó al plan (no estaba): cerró los huecos de la API que pidieron las pantallas (GET /v1/clientes/activos, fotos de partidas, cliente en resultados) y borró legado/.

**Para la revisión de Diego:**
- ¿Quién agrega maestros? La API deja a todo el equipo, pero Configuración es solo del administrador: François, Leo y Cecilia no pueden. Propuesta: abrir la pestaña Maestros a todo el equipo.
- El tablero pone en «Por entregar» todo servicio abierto sin tareas pendientes ni espera: con los datos cargados son 37 de 41. Propuesta: un servicio sin ninguna tarea va a «Nos toca», y «Por entregar» es solo cuando tuvo tareas y todas están hechas.
- El margen de reparaciones se calcula aunque no haya presupuesto de maestro aprobado (sale 96 % o 100 %). Propuesta: mostrar el margen solo cuando hay costo aprobado.
- Las cuatro de la etapa 1: margen = orden al dueño menos lo facturado por maestros; el comentario de una visita lo ve el dueño; el dueño ve las fotos de recepción; IVA del presupuesto del maestro.
- Decisiones de las piezas: «/» abre Hoy en el celular e Inicio en el computador; Configuración solo el administrador y Resultados jefatura y administrador; aprobar un presupuesto pide confirmar.
- Para después (no frena): renombrar Document.blobKey a driveFileId (migración), corregir o borrar visitas, ofertas y anuncios desde la pantalla, el gráfico del precio en el tiempo y arrastrar en Repartir.

**Lo que dejó la etapa 1** (A a H hechas; `npm run verificar` pasa: 234 pruebas; /openapi.json lista 124 operaciones, todas con descripción):
- Incidente: el coordinador le mandó un mensaje al agente de B mientras corría y eso levantó una copia que editó los mismos archivos ~5 min. Se detuvo; B se quedó con las versiones equivalentes. No se le responde por mensaje a un agente de workflow.
- Archivos fuera de la lista de su encargo, por el tope de 800 líneas: rutas/cartera-cobros.ts y cartera-cuentas.ts (G), test/cartera-calculos.test.ts (G), test/propiedades-reglas.test.ts (C), test/obra-orden.test.ts (E).
- Convenciones que quedaron: un Evento ESPERA guarda en `nuevo`/`anterior` el valor de EsperandoA, o NOS_TOCA cuando no se espera a nadie (la columna no admite vacío); el detalle va en `motivo`. Un dueño solo ve las ofertas ya mostradas y no ve servicios por revisar, por confirmar ni cancelados. El margen solo se calcula con órdenes en pesos (con UF es null). Los formularios con archivos son multipart y sus números van como texto.
- La web llama a la API solo desde el servidor (Server Components y server actions, con el token de Clerk): sin CORS y la dirección de la API no llega al navegador.
- Le falta a la API para la web (van en la pieza I): GET /v1/equipo (personas activas, para elegir responsable); poder fijar la carpeta de Drive de una propiedad (`driveCarpetaId`) en el PATCH de propiedades; `leerProveedor(id)` en la integración de Odoo para que crear un maestro no pida `buscado`; declarar `@proges/contrato` en apps/api/package.json.
- Los PDF (documentos y presupuestos de maestros) todavía responden 503. **Diego eligió el 2026-11-19: van al Drive de la propiedad, como las fotos** (ADR 0017); se conectan en la pieza I2.
- Por confirmar con Diego (no frenan): margen de obra = orden al dueño menos lo facturado por maestros; el comentario de una visita lo ve el dueño; si el dueño ve las fotos de recepción (ADR 0015 lo permite); IVA del presupuesto del maestro (ADR 0014, abierto).
- Sin probar: el ingreso con una sesión real de Clerk (se prueba con la web, en la etapa 2).

**Respuesta de Diego (2026-11-19), tal cual:**

```
ok, con workflow
Plan: portal nuevo de Proges sobre API propia, versión 7

Decisiones:
- ¿Quién habla con la base de datos? Solo la API; la web le pide todo a la API (como en RASA)
- ¿Con qué se construye la API? Hono, en TypeScript
- ¿Dónde corre la API? Railway, como rasa-api (distinto de lo propuesto)
- ¿Qué pueden hacer los sistemas de afuera con su llave? Solo leer lo de su cliente
- ¿El dueño autónomo entra en esta tarea? Sí, por invitación: sus pantallas y su cartera; sin registro abierto ni plan gratuito
- ¿Cómo se llama lo que Proges hace en una propiedad? Servicio
- ¿Cómo entran las cifras de Nexxos (vistas y consultas por anuncio)? A mano, una vez por semana, en la ficha de venta
- ¿Cómo responde el dueño una oferta? En el portal: acepta, contraoferta o rechaza, y le llega una tarea al corredor
- ¿Cuándo miras lo construido? Al terminar el portal del equipo (etapas 1 y 2 seguidas) y al final

Supuestos que no son así:
- ninguno marcado

Supuestos que no sé:
- La cuenta de Vercel admite un segundo proyecto (la API) sin cambiar de plan.
- NPL u otro cliente grande va a querer consultar la API desde su sistema.
- La lista «conservador, notaría, municipalidad, maestro, dueño, banco, otro» cubre a quién se espera.
- Un cliente grande y un dueño autónomo pueden hacer lo mismo con su cartera; solo cambia la pantalla de inicio.
```

**Lo que cambió en el plano por la respuesta:** d3 b (Railway): la API corre en Railway y la web en Vercel; las migraciones corren en Railway antes de publicar la API (cambia ADR 0009); los PDF suben por la API (no hay límite de 4,5 MB); R5 pasa a ser «Railway tiene un solo ambiente»; el supuesto s1 de Vercel deja de aplicar y queda «Proges puede tener su propio proyecto en Railway». Los «no sé» no frenan: la lista de «esperando a» lleva «otro» con texto, y cartera igual para los dos tipos de dueño se puede separar después con el modo del cliente.

## Cómo se llegó a la v7

- La v6 está construida (`679c99b` a `685a630`), sin mezclar ni publicar. A Diego no le gustó cómo se ve («quedó muy confuso entre lo que había antes y lo que hay ahora») y pidió rediseñar el frente desde cero. El detalle de la v5 y la v6 está en git: `git show 664b5e6:TAREA.md`. Sus decisiones d12 a d26 siguen valiendo para el back (ADR 0012 a 0015).
- **El día de cada uno (Diego, 2026-11-19):** en la mañana lo fundamental es organizar las tareas y ver qué entró nuevo. Álvaro es gerencial: mira resultados y decide plata. Cecilia reparte a la par de los demás y también decide gastos. El equipo vive en terreno (conservadores, notarías, propiedades, home center): celular primero. Los dueños preguntan por avances de reparaciones, venta, administración y trámites (¿el conservador puso reparo?).
- **Tres miradas que conviven:** no son caminos para elegir sino formas de mirar lo mismo; el computador importa para la gestión de oficina y la analítica, y Diego mira desde el computador.
- **La ficha de la propiedad es una ficha clínica:** datos, ubicación, documentos, cada reparación con su costo y qué se hizo, todo el historial.
- **Corretaje:** todo se publica en Nexxos (Diego cree que de ahí salen las visitas, sin certeza; el 2026-11-18 quedó que Nexxos solo publica avisos: por confirmar). Proges le hace llegar las ofertas al dueño: el módulo va en el portal. Administración y arriendos recién empiezan: se diseñan con casos reales.
- **La lógica comercial:** NPL es un cliente grande al que se le hacen todos los servicios (vendrán 2 o 3 más). Lo que Proges hace es difícil de vender solo: se vende el portal. Los dueños llevan gratis el control de sus propiedades y desde ahí le piden servicios a Proges. El alcance del plan gratuito se decide después.
- **Al pedir el plan (2026-11-19):** «no quiero nada del front anterior; modifica lo que sea necesario del back; es fundamental tener nuestra propia API; quiero que sea monorepo». Y: «todos los datos que hay son ficticios».

## 1. Qué va a existir
- **Equipo en terreno (François, Leo):** Abre el celular en «Hoy»: sus tareas atrasadas, de hoy y de mañana; Marca una tarea hecha con un toque y anota con foto en dos; Marca a quién se espera en cada servicio (conservador, notaría, maestro, dueño…); Lleva la obra (avance, recepción) y la venta (visitas, ofertas, precio, cifras de Nexxos).
- **Jefatura (Cecilia, Álvaro):** Abre el computador en «Inicio»: lo nuevo, lo trabado y la carga del equipo; Reparte el trabajo en «Repartir»; Aprueba presupuestos de maestros y cierra obras; Mira «Resultados»: tiempos, esperas, márgenes y tareas a tiempo.
- **Cliente grande (NPL y los que vengan):** Ve sus propiedades con su ficha clínica, sin costos internos ni notas privadas; Sigue cada servicio paso a paso y lee el reporte de venta; Responde las ofertas en el portal; Pide servicios nuevos.
- **Dueño autónomo (por invitación):** Registra sus propiedades y lleva arriendos, gastos, contribuciones y documentos; Ve sus vencimientos, cada uno con «que Proges lo haga»; Pide servicios desde cualquier aviso.
- **Sistema de un cliente:** Consulta con su llave las propiedades y servicios de su cliente, desde su propia plataforma.
- **Diego (administrador):** Crea clientes, usuarios y llaves de la API; Mira todo lo que ve la jefatura.

**Listo cuando:**
- El repositorio es un monorepo con apps/api, apps/web y packages/db y packages/contrato, y no queda nada del frente anterior
- `npm run verificar` pasa en la raíz: tipos, lint, pruebas de la API y build de la web
- La web no toca la base: todo lo pide a la API (apps/web no depende de packages/db)
- La documentación de la API está en /docs y lista todos los endpoints
- Las pruebas de la API comprueban que un dueño o una llave nunca reciben costos, notas internas ni datos de otro cliente
- Cada pantalla de la maqueta existe y se recorrió en el navegador, en computador (1280 px) y en celular (390 px)
- ADR 0016 y 0017, docs/api.md, AGENTS.md, espacio.json y PENDIENTES.md al día; nada publicado en producción

## 2. Flujo de los usuarios
1. **Dueño · Pide un servicio.** Desde la ficha de su propiedad, desde un vencimiento («que Proges lo haga») o desde «Pedir a Proges». Puede crear la propiedad al pedir. Dónde: Portal del dueño: ficha, vencimientos o /pedir. Queda: Pedido nuevo; abre el servicio «por revisar» con una tarea para la jefatura. Aviso: Aparece en «Entró nuevo» del Inicio de la jefatura. Permiso: Cliente o dueño autónomo, solo en sus propiedades. Pieza D, Q, R.
2. **Jefatura · Revisa y reparte.** Abre lo nuevo, le pone responsable y anota las tareas: qué, quién y para cuándo. También puede abrir un servicio a mano. Dónde: Inicio → Repartir (computador). Queda: Servicio abierto, «nos toca». Aviso: Las tareas aparecen en «Hoy» de cada persona. Permiso: Equipo. Pieza D, K.
3. **Equipo en terreno · Ve su día.** En el celular, sus tareas atrasadas, de hoy y de mañana, con la propiedad de cada una. Dónde: Hoy (celular). Permiso: Equipo. Pieza D, J.
4. **Equipo en terreno · Anota con foto.** Saca la foto, escribe o dicta, y la nota se guarda en el servicio sugerido. Marca si la ve el dueño. La foto se achica en el teléfono y se guarda en el Drive de la propiedad. Dónde: Botón «Anotar» (celular). Queda: Nota en la bitácora. Aviso: Si es para el dueño, aparece en sus novedades. Permiso: Equipo. Pieza D, J.
5. **Equipo en terreno · Marca a quién se espera.** Elige conservador, notaría, municipalidad, maestro, dueño, banco u otro. Queda la fecha desde cuándo. Dónde: Ficha del servicio (celular o computador). Queda: «Esperando a otro»; cada cambio queda en el historial. Aviso: Pasados 10 días aparece en «Trabado» del Inicio. Permiso: Equipo. Pieza D, L.
6. **Jefatura · Aprueba lo de la obra.** Enlaza la orden de Odoo, revisa el presupuesto del maestro y lo aprueba; al final cierra la obra con todas las partidas recibidas. Dónde: Ficha del servicio, panel Obra. Queda: Presupuesto aprobado; obra cerrada. Permiso: Jefatura. Pieza E, M.
7. **Equipo en terreno · Lleva la venta.** Anota visitas con su interés y comentario, ofertas, cambios de precio y, cada lunes, las vistas y consultas de cada anuncio que muestra Nexxos. Dónde: Ficha del servicio de venta. Permiso: Equipo. Pieza F, N.
8. **Equipo en terreno · Le muestra la oferta al dueño.** Con un botón, la oferta queda visible para el dueño con la recomendación de Proges. Dónde: Ficha del servicio de venta. Queda: Oferta «esperando al dueño». Aviso: El dueño la ve destacada en su inicio. Permiso: Equipo. Pieza F, N.
9. **Dueño · Responde la oferta.** Acepta, contraoferta (con monto) o rechaza. Dónde: Reporte de venta (portal del dueño). Queda: Oferta aceptada, contraofertada o rechazada. Aviso: Tarea para el corredor: «comunicar la respuesta». Permiso: Cliente, solo en su propiedad. Pieza F, Q.
10. **Dueño · Mira su ficha y sus reportes.** La ficha clínica de cada propiedad (historial, reparaciones con lo que pagó, documentos, datos), el seguimiento de cada servicio y el reporte de venta. Dónde: Portal del dueño. Permiso: Cliente. Pieza C, O, Q.
11. **Dueño · Lleva su cartera (autónomo).** Anota arriendos pagados, gastos, contribuciones y documentos; ve sus vencimientos. Dónde: Portal del dueño autónomo. Permiso: Dueño autónomo, solo lo suyo. Pieza G, R.
12. **Jefatura · Mira resultados.** Servicios que entran y salen, días por tipo (trabajando o esperando a otros), obras plan contra real, tareas a tiempo. Dónde: Resultados (computador). Permiso: Jefatura o administrador. Pieza H, P.
13. **Sistema del cliente · Consulta por la API.** El sistema del cliente pide sus propiedades y servicios con su llave, y recibe lo mismo que ve el dueño en el portal. Dónde: https://…/v1 con la llave en el encabezado. Permiso: Llave de solo lectura de ese cliente. Pieza B, H, S.

## 3. Flujo de datos
- **Fuentes** (Donde el dato nace):
  - **Odoo**: Órdenes de venta, proveedores (maestros) y facturas de proveedor. Solo se lee. Dónde: apps/api/src/integraciones/odoo.ts (hoy src/lib/odoo.ts).
  - 🆕 **Nexxos** (pieza F): Vistas y consultas de cada anuncio, copiadas a mano una vez por semana (si d7 a). Dónde: Formulario de cifras en la ficha de venta.
  - 🆕 **El celular** (pieza J): Fotos y notas en terreno. La foto se achica en el teléfono antes de subir. Dónde: apps/web, botón Anotar.
- **API** (La ventanilla única: recibe, revisa permisos y guarda):
  - 🆕 **Acceso y permisos** (pieza B): Recibe la sesión de Clerk (web) o una llave (sistemas de afuera), encuentra a la persona o al cliente y decide qué puede leer y escribir. Es el portero único. Dónde: apps/api/src/acceso/.
  - 🆕 **Endpoints /v1** (pieza C–H): Propiedades y ficha, servicios y tareas, obra, venta, cartera, configuración y resultados. Cada uno valida con el contrato y recorta lo que un dueño no debe ver. Dónde: apps/api/src/rutas/*.ts y dominio/.
  - 🆕 **Documentación /docs** (pieza B): Se arma sola desde el contrato: lista cada endpoint, qué recibe y qué entrega. Dónde: apps/api, /openapi.json y /docs.
  - 🆕 **packages/contrato** (pieza B): La lista de lo que la API recibe y entrega, escrita una vez. La API valida con ella y la web saca de ella sus tipos. Dónde: packages/contrato/src/.
- **Postgres (Neon)** (Donde queda guardado lo que la gente hace):
  - **Tablas de hoy**: Propiedades, cartera (contratos, cobros, gastos, contribuciones), servicios en curso, tareas, notas, fotos, obra, visitas, ofertas, pedidos, usuarios y clientes. Dónde: packages/db/prisma/ (hoy prisma/schema.prisma).
  - 🆕 **Lo nuevo en la base** (pieza A): A quién se espera y desde cuándo; anuncios y sus cifras semanales; respuesta del dueño a la oferta; llaves de la API; modo del cliente (atendido o autónomo); quién anotó cada documento, gasto y contribución; enlace del usuario con Clerk. Dónde: Una migración nueva (pieza A).
- **Archivos** (Fotos y PDF, fuera de la base):
  - **Google Drive**: Fotos de la bitácora, en la subcarpeta «Portal» de cada propiedad. Se entregan por la API, nunca con enlace público. Dónde: apps/api/src/integraciones/drive.ts (hoy src/lib/archivos.ts).
  - **Vercel Blob**: Los PDF de documentos. Suben por la API, que los guarda y los entrega revisando el permiso. Dónde: apps/api/src/integraciones/blob.ts.
- **Web** (Lo que corre en el navegador; pide todo a la API):
  - 🆕 **Portal del equipo** (pieza I–P): Computador: Inicio, Servicios, Propiedades, Repartir, Resultados, Configuración. Celular: Hoy, Anotar, Servicios, Propiedades. Dónde: apps/web/src/app/(equipo)/.
  - 🆕 **Portal del dueño** (pieza Q–R): Cliente grande: mis propiedades, seguimiento, reporte de venta, pedir. Autónomo: además, cartera y vencimientos. Dónde: apps/web/src/app/(dueno)/.
- **Afuera** (Sistemas de los clientes):
  - 🆕 **Sistema de NPL** (pieza S): Consulta con su llave de solo lectura. Dónde: Fuera de Proges.

## 4. Permisos
- **Llave de la API:** De un cliente, solo lectura (si d4 a); se crea y se revoca en Configuración.
- **Modo del cliente:** Atendido o autónomo: cambia la pantalla de inicio del dueño, no lo que puede hacer.

| Qué | Equipo | Jefatura | Administrador | Cliente grande | Dueño autónomo | Sistema externo | Se exige |
|---|---|---|---|---|---|---|---|
| Ver propiedades y servicios | sí (De todos los clientes) | sí (De todos) | sí (De todos) | sí (Solo las suyas) | sí (Solo las suyas) | sí (Solo las de su cliente) | En la API: cada consulta filtra por cliente |
| Ver costo del maestro, presupuestos, facturas y margen | sí | sí | sí | no (Ve lo que se le cobró) | no | no | En la API: el recorte para dueños los saca |
| Ver notas de la bitácora | sí (Todas) | sí (Todas) | sí (Todas) | sí (Solo las marcadas para el dueño) | sí (Solo las marcadas) | sí (Solo las marcadas) | En la API |
| Crear tareas, notas, «esperando a», visitas y ofertas | sí | sí | sí | no | no | no | En la API |
| Aprobar presupuesto del maestro y cerrar una obra | no | sí | no (Salvo que también sea jefatura) | no | no | no | En la API |
| Editar la cartera (propiedades, contratos, cobros, gastos, documentos) | sí (De todos) | sí (De todos) | sí (De todos) | sí (Solo la suya) | sí (Solo la suya) | no | En la API; queda quién y cuándo |
| Pedir un servicio | sí (Abre el servicio a mano) | sí | sí | sí | sí | no (Si d4 a) | En la API |
| Responder una oferta | no (Registra la oferta) | no | no | sí (Solo de su propiedad) | sí (Solo de su propiedad) | no | En la API |
| Ver Resultados | no | sí | sí | no | no | no | En la API |
| Crear clientes, usuarios y llaves | no | no | sí | no | no | no | En la API |

El administrador marca jefatura y modo en Configuración → Equipo y clientes, y crea las llaves en Configuración → API. Crear la llave de NPL es un paso para después de publicar, y va a PENDIENTES.md.

## 5. Decisiones
De Diego (por marcar en la página; ⭐ = recomendada):
- **d1. ¿Quién habla con la base de datos?**
  - ⭐ a) Solo la API; la web le pide todo a la API (como en RASA). Pantalla: Igual para el usuario. Datos: Una sola puerta con las reglas: lo que la web puede hacer, la API ya lo sabe hacer y está probado. Riesgo: Cada pantalla hace un viaje más; más trabajo hoy.
  - b) La web y la API usan el mismo paquete de reglas, cada una directo a la base. Pantalla: Igual. Datos: Dos puertas a la base con las mismas reglas. Riesgo: La API puede quedar atrás de la web sin que nadie lo note.
- **d2. ¿Con qué se construye la API?**
  - ⭐ a) Hono, en TypeScript. Pantalla: Documentación automática en /docs. Datos: Se reutiliza tal cual el back de hoy, que ya es TypeScript. Librerías nuevas: hono, @hono/zod-openapi, @hono/node-server, @clerk/backend, @scalar/hono-api-reference. Riesgo: Una herramienta más que aprender.
  - b) Rutas de Next.js en una app aparte. Pantalla: Documentación escrita a mano. Datos: Sin librerías nuevas de servidor. Riesgo: Más pesado para una API y la documentación se desactualiza.
  - c) FastAPI en Python, como rasa-api. Pantalla: Documentación automática. Datos: El mismo idioma que RASA. Riesgo: Hay que traducir a Python todo el back de hoy: el doble de trabajo.
- **d3. ¿Dónde corre la API?**
  - ⭐ a) Vercel, como un segundo proyecto del mismo repo. Pantalla: Una dirección propia (por ejemplo api.proges.cl). Datos: Las migraciones corren al publicar la API, como hoy. Riesgo: Límite de 4,5 MB por envío: las fotos se achican antes.
  - b) Railway, como rasa-api. Pantalla: Igual. Datos: Un servidor siempre prendido. Riesgo: Otra plataforma que pagar y mirar.
- **d4. ¿Qué pueden hacer los sistemas de afuera con su llave?**
  - ⭐ a) Solo leer lo de su cliente. Pantalla: Configuración → API: crear y revocar llaves. Datos: La llave no puede escribir nada. Riesgo: Si NPL quiere pedir servicios desde su sistema, es otro paso.
  - b) Leer y pedir servicios. Pantalla: Igual. Datos: La llave puede crear pedidos. Riesgo: Más superficie: una llave filtrada podría llenar la bandeja.
- **d5. ¿El dueño autónomo entra en esta tarea?**
  - ⭐ a) Sí, por invitación: sus pantallas y su cartera; sin registro abierto ni plan gratuito. Pantalla: Inicio del autónomo, Vencimientos y cartera editable. Datos: El modo del cliente decide su inicio. Riesgo: Una etapa más (la 3) antes de terminar.
  - b) Después: esta tarea hace solo el cliente grande. Pantalla: Solo el portal del cliente grande. Datos: Igual en la base. Riesgo: La puerta comercial espera otra tarea.
- **d6. ¿Cómo se llama lo que Proges hace en una propiedad?**
  - ⭐ a) Servicio. Pantalla: «Servicios» en todo el portal y en la API. Datos: En la base sigue ServicioEnCurso.
  - b) Proyecto. Pantalla: «Proyectos». Datos: Igual. Riesgo: Suena raro para un trámite.
  - c) Encargo. Pantalla: «Encargos». Datos: Igual. Riesgo: Nadie lo dice hoy.
- **d7. ¿Cómo entran las cifras de Nexxos (vistas y consultas por anuncio)?**
  - ⭐ a) A mano, una vez por semana, en la ficha de venta. Pantalla: Un formulario de cifras por anuncio. Datos: Tabla de anuncios y sus cifras semanales. Riesgo: Si nadie las anota, el gráfico queda vacío (el reporte sigue con visitas y ofertas).
  - b) Se deja fuera la sección de anuncios hasta saber si Nexxos se conecta. Pantalla: El reporte sin anuncios. Datos: Nada nuevo. Riesgo: El dueño no ve dónde está publicado ni cómo rinde.
- **d8. ¿Cómo responde el dueño una oferta?**
  - ⭐ a) En el portal: acepta, contraoferta o rechaza, y le llega una tarea al corredor. Pantalla: Botones en el reporte de venta del dueño. Datos: La oferta guarda cuándo se le mostró y su respuesta. Riesgo: Lo formal (promesa, firma) sigue fuera del portal.
  - b) Proges anota lo que el dueño dijo por teléfono. Pantalla: Solo el equipo cambia el estado. Datos: Igual que hoy. Riesgo: Sigue el ida y vuelta por WhatsApp.
- **d9. ¿Cuándo miras lo construido?**
  - ⭐ a) Al terminar el portal del equipo (etapas 1 y 2 seguidas) y al final. Pantalla: Una revisión a mitad de camino y otra al cierre. Riesgo: La API no se ve hasta que la usa la web.
  - b) Al terminar cada una de las tres etapas. Pantalla: Tres revisiones. Riesgo: La etapa 1 casi no tiene nada que mirar.
  - c) Solo al final. Pantalla: Una revisión. Riesgo: Un error de rumbo se ve tarde.

De Claude:
- **Un monorepo con npm workspaces, sin Turborepo.** Workspaces ya viene con npm. Son cuatro carpetas; un orquestador de builds se justifica cuando el build tarde.
- **packages/contrato con zod.** Lo que la API recibe y entrega se escribe una vez: la API valida con él, la web saca sus tipos y la documentación se genera de ahí.
- **La API se versiona: /v1.** Así un cambio futuro no rompe el sistema de NPL: lo nuevo va a /v2 y el /v1 sigue.
- **Además de recursos, resúmenes por pantalla.** Inicio, ficha clínica, reporte de venta y resultados vienen en una sola llamada cada uno. Si no, cada pantalla haría diez viajes.
- **Una sola migración, hecha al principio (pieza A).** Así las piezas que corren a la vez nunca tocan el esquema. Si una necesita un campo más, lo devuelve como duda.
- **El esquema se parte en archivos por tema.** Pasaba de 800 líneas (1.016). Prisma permite una carpeta de esquemas.
- **Pruebas con node:test y tsx, contra una base proges_test.** Sin librería nueva. Los scripts probar-*.ts de hoy pasan a ser pruebas de la API.
- **El código de hoy se mueve a legado/ y se borra al cerrar la etapa 1.** Los agentes de la API lo leen para trasladar las reglas; ninguna pantalla vieja llega a la web nueva.
- **Se quitan de la base las etapas de la v4.** «Esperando a…» y las tareas las reemplazan, y todos los datos son ficticios (lo confirmaste el 2026-11-19): no hay nada que cuidar. Las propiedades reales se cargan después de publicar.
- **Las fotos se achican en el teléfono antes de subir.** En terreno ahorra datos móviles y tiempo. Con la API en Railway no hay límite de 4,5 MB, así que los PDF suben por la API.
- **La API corre en Railway y la web en Vercel.** Lo elegiste (d3 b). Las migraciones pasan a correr en Railway antes de publicar la API, ya no en el build de Vercel: cambia el ADR 0009.
- **La respuesta del dueño a una oferta crea una tarea para el corredor.** Así nadie tiene que estar mirando la oferta para enterarse.
- **Resultados se calcula al mirar.** Hay pocos datos: una tabla de resumen sería otra cosa que mantener al día.
- **La identidad visual parte de la maqueta.** Colores pizarra de Proges y Plus Jakarta Sans; las pantallas se hacen desde cero, sin copiar ninguna de hoy.
- **Se sigue en la branch plan/etapa-1-dos-caras.** Nunca se mezcló y ya tiene el back de la v6 que se reutiliza.

## 6. Supuestos (por marcar: cierto, no es así, no sé)
- s1. Proges puede tener su propio proyecto en Railway (en la cuenta de RASA o en una nueva).
- s2. NPL u otro cliente grande va a querer consultar la API desde su sistema.
- s3. El equipo en terreno usa celulares con cámara y datos móviles.
- s4. Clerk sigue siendo el login, para el equipo y para los dueños.
- s5. La lista «conservador, notaría, municipalidad, maestro, dueño, banco, otro» cubre a quién se espera.
- s6. Las vistas y consultas de cada anuncio se pueden ver en Nexxos y copiar una vez por semana.
- s7. El dueño puede responder una oferta en el portal sin firma; lo formal sigue por correo o promesa.
- s8. Un cliente grande y un dueño autónomo pueden hacer lo mismo con su cartera; solo cambia la pantalla de inicio.
- s9. Cecilia, como jefatura, puede ver Resultados, incluidos los márgenes de las obras.
- s10. El equipo es Cecilia y Álvaro (jefatura), François y Leo.

## 7. Lo que no debe pasar
- Un dueño o una llave externa recibe el costo del maestro, presupuestos, facturas o margen. Cómo se comprueba: Pruebas de la API que piden cada recurso como cliente y como llave y buscan esos campos en la respuesta.
- Un cliente, o su llave, recibe algo de otro cliente. Cómo se comprueba: Prueba con dos clientes (la de probar-espacios.ts, trasladada) sobre cada endpoint de lectura.
- Un dueño ve una nota no marcada para él. Cómo se comprueba: Prueba de la bitácora, el historial y las novedades como cliente.
- Una llave externa escribe algo. Cómo se comprueba: Prueba: cada POST, PATCH y DELETE con llave responde 403.
- La web lee o escribe la base sin pasar por la API. Cómo se comprueba: apps/web no depende de packages/db ni de prisma (revisión de package.json y búsqueda en apps/web).
- Se pierde o se reescribe una migración ya aplicada. Cómo se comprueba: El diff de packages/db/prisma/migrations solo agrega la nueva; `prisma migrate status` al día en proges_dev.
- La migración quita algo que sí se usa. Cómo se comprueba: Leer el SQL: solo crea y agrega, y quita únicamente las etapas de la v4.
- El portal escribe en Odoo. Cómo se comprueba: integraciones/odoo.ts solo acepta métodos de lectura; revisión.
- Una llave de la API se guarda legible o aparece en un log. Cómo se comprueba: Se guarda solo su huella (hash); la llave completa se muestra una vez al crearla; revisión.
- Una foto o un PDF queda con enlace público. Cómo se comprueba: Se entregan por la API revisando el permiso; revisión.
- Queda algo del frente anterior. Cómo se comprueba: legado/ borrado al cerrar la etapa 1; apps/web nace vacía.
- Un archivo pasa de 800 líneas. Cómo se comprueba: Un chequeo en `npm run verificar`.
- Se publica algo en producción. Cómo se comprueba: Nada se sube a main sin que Diego lo pida; publicar va como pasos en PENDIENTES.md.

## 8. Piezas y orden
Tandas: 1) A · 2) B · 3) C D E F G H · 4) I · 5) J K L M N O P · 6) Q R S. Etapa 1 = A–H, etapa 2 = I–P, etapa 3 = Q–S (un workflow por etapa).

- ✅ **A. Etapa 1 · Monorepo y base** (Sonnet). Archivos: package.json raíz con workspaces; legado/ (el código de hoy, solo para consultar); packages/db: prisma/schema/*.prisma, migrations intactas, cliente, scripts de carga y migrar-produccion.mjs; una migración nueva: agrega lo de la v7 y quita las etapas de la v4. Verificación: npm install; npx prisma migrate dev en proges_dev aplica sin pérdida; prisma migrate status al día.
- ✅ **B. Etapa 1 · Esqueleto de la API y acceso** (Opus), espera a A. Archivos: apps/api/src/app.ts, acceso/ (Clerk y llaves), permisos.ts, errores.ts; apps/api/src/rutas/*.ts vacías, ya registradas; packages/contrato/; apps/api/test/ con la base proges_test; /openapi.json y /docs; apps/api/railway.json (build, arranque y migraciones antes de publicar); espacio.json y script raíz verificar. Verificación: npm run verificar; curl /v1/salud; pruebas: sin sesión 401, cliente A no lee a B, llave no escribe.
- ✅ **C. Etapa 1 · API de propiedades y ficha clínica** (Sonnet), espera a B. Archivos: apps/api/src/rutas/propiedades.ts; apps/api/src/dominio/ficha/ (historial, reparaciones, alertas y vencimientos); packages/contrato/src/propiedades.ts; apps/api/test/propiedades.test.ts. Verificación: npm run verificar -w apps/api.
- ✅ **D. Etapa 1 · API de servicios, tareas, bitácora y pedidos** (Sonnet), espera a B. Archivos: apps/api/src/rutas/{servicios,tareas,notas,pedidos,inicio}.ts; apps/api/src/dominio/trabajo/; apps/api/src/integraciones/drive.ts; packages/contrato/src/trabajo.ts; apps/api/test/trabajo.test.ts. Verificación: npm run verificar -w apps/api.
- ✅ **E. Etapa 1 · API de la obra** (Sonnet), espera a B. Archivos: apps/api/src/rutas/{obra,maestros}.ts; apps/api/src/dominio/obra/; apps/api/src/integraciones/odoo.ts; packages/contrato/src/obra.ts; apps/api/test/obra.test.ts (ex probar-obra.ts). Verificación: npm run verificar -w apps/api.
- ✅ **F. Etapa 1 · API del corretaje** (Sonnet), espera a B. Archivos: apps/api/src/rutas/venta.ts; apps/api/src/dominio/venta/ (visitas, ofertas y respuesta del dueño, precios, anuncios y cifras, reporte); packages/contrato/src/venta.ts; apps/api/test/venta.test.ts. Verificación: npm run verificar -w apps/api.
- ✅ **G. Etapa 1 · API de la cartera del dueño** (Sonnet), espera a B. Archivos: apps/api/src/rutas/{cartera,administracion}.ts; apps/api/src/dominio/cartera/ (contratos, cobros, gastos, contribuciones, movimientos, resumen del mes); packages/contrato/src/cartera.ts; apps/api/test/cartera.test.ts (ex probar-administracion.ts). Verificación: npm run verificar -w apps/api.
- ✅ **H. Etapa 1 · API de configuración, llaves y resultados** (Sonnet), espera a B. Archivos: apps/api/src/rutas/{config,llaves,resultados}.ts; apps/api/src/dominio/resultados/; packages/contrato/src/config.ts; apps/api/test/config.test.ts. Verificación: npm run verificar -w apps/api.
- ✅ **I. Etapa 2 · Base de la web** (Sonnet), espera a C, D, E, F, G, H. Archivos: apps/web/ nueva (Next 16, Clerk); apps/web/src/lib/api.ts (cliente tipado desde el contrato); menú del computador y barra del celular, identidad visual, componentes base; rutas vacías de cada pantalla; borrar legado/. Verificación: npm run verificar; entrar y ver el menú a 1280 y 390 px.
- ✅ **J. Etapa 2 · Hoy y Anotar (celular)** (Sonnet), espera a I. Archivos: apps/web/src/app/(equipo)/hoy/; apps/web/src/app/(equipo)/anotar/; apps/web/src/componentes/tareas/ y foto-achicada.ts. Verificación: npm run verificar -w apps/web y recorrer a 390 px.
- ✅ **K. Etapa 2 · Inicio y Repartir (computador)** (Sonnet), espera a I. Archivos: apps/web/src/app/(equipo)/inicio/; apps/web/src/app/(equipo)/repartir/. Verificación: npm run verificar -w apps/web y recorrer a 1280 px.
- ✅ **L. Etapa 2 · Tablero y ficha del servicio** (Sonnet), espera a I. Archivos: apps/web/src/app/(equipo)/servicios/; apps/web/src/componentes/servicio/ (tareas, bitácora, esperando a). Verificación: npm run verificar -w apps/web y recorrer en los dos tamaños.
- ✅ **M. Etapa 2 · Panel de la obra** (Sonnet), espera a I. Archivos: apps/web/src/componentes/obra/ (orden, partidas, presupuestos, facturas, recepción, cierre). Verificación: npm run verificar -w apps/web y recorrer con la orden S00047.
- ✅ **N. Etapa 2 · Corretaje** (Sonnet), espera a I. Archivos: apps/web/src/componentes/venta/ (precio y ofertas, consultas por semana, anuncios, visitas, ofertas; con modo dueño). Verificación: npm run verificar -w apps/web y recorrer.
- ✅ **O. Etapa 2 · Propiedades y ficha clínica** (Sonnet), espera a I. Archivos: apps/web/src/app/(equipo)/propiedades/; apps/web/src/componentes/ficha/ (seis pestañas; con modo dueño). Verificación: npm run verificar -w apps/web y recorrer.
- ✅ **P. Etapa 2 · Resultados y Configuración** (Sonnet), espera a I. Archivos: apps/web/src/app/(equipo)/resultados/; apps/web/src/app/(equipo)/configuracion/ (equipo, clientes, maestros, llaves). Verificación: npm run verificar -w apps/web y recorrer.
- ✅ **Q. Etapa 3 · Portal del cliente grande** (Sonnet), espera a J, K, L, M, N, O, P. Archivos: apps/web/src/app/(dueno)/ inicio atendido, propiedades/[id], servicios/[id], venta (responder ofertas), pedir. Verificación: npm run verificar y recorrer como NPL.
- ✅ **R. Etapa 3 · Portal del dueño autónomo** (Sonnet), espera a J, K, L, M, N, O, P. Archivos: apps/web/src/app/(dueno)/ inicio autónomo, vencimientos, cartera (contratos, cobros, gastos, contribuciones, documentos). Verificación: npm run verificar y recorrer como dueño autónomo.
- ✅ **S. Etapa 3 · La API para terceros** (Sonnet), espera a J, K, L, M, N, O, P. Archivos: /docs con ejemplos; docs/api.md (cómo pedir una llave y consultar); prueba de punta a punta con curl y una llave de prueba. Verificación: npm run verificar y la prueba con curl.

## 9. Riesgos (probabilidad × impacto, de 1 a 3)
- **R1** (3×2) Rehacer todo el frente y mover el back es mucho trabajo y se alarga. Tres etapas; cada una deja el repo funcionando y en un commit. Nada se publica hasta el final.
- **R2** (2×3, toca datos, plata) Al trasladar una regla, un dueño termina viendo un costo o una nota interna. Las pruebas de hoy pasan a ser pruebas de la API antes de borrar legado/, y cada pieza agrega las suyas como cliente y como llave.
- **R3** (2×2, toca producción) La web no logra entrar a la API, o al publicar falta una variable. La pieza B prueba la sesión de punta a punta en local. Publicar es una lista paso a paso en PENDIENTES.md, contigo.
- **R4** (2×1, toca producción) Las pantallas se sienten lentas por el viaje extra web → API → base. La API en Railway en la misma región que Neon, y una llamada por pantalla con los resúmenes.
- **R5** (2×2, toca producción, datos) Railway tiene un solo ambiente: una vista previa de la web podría escribir en la API de producción. Las vistas previas de Vercel no reciben la dirección de la API de producción; se prueba en local con los dos servicios (espacio.json). Un segundo ambiente en Railway sería otra decisión.
- **R6** (1×3, toca datos, producción) La migración nueva falla o borra algo en producción. Todos los datos son ficticios. Si falla, el build se detiene y queda la versión anterior (ADR 0009).
- **R7** (1×3, toca datos, producción) Al mover prisma/ se pierde el historial de migraciones. La carpeta se mueve intacta con git mv; prisma migrate status lo comprueba en proges_dev.
- **R8** (3×1) Las cifras de Nexxos no se anotan y el reporte queda a medias. El reporte funciona con visitas, ofertas y precio aunque falten las cifras.
- **R9** (1×3, toca datos) Una llave filtrada expone los datos de un cliente. Solo lectura, de un cliente, guardada como huella, revocable y con fecha de último uso.
- **R10** (2×1) Next 16 trae cambios y un agente escribe código de una versión vieja. Cada encargo exige leer la guía de node_modules/next/dist/docs; el build lo detecta.

## 10. Documentos accesorios y qué queda fuera
- **ADR 0016:** Monorepo y API propia: d1 a d4 (Hono en Railway), el contrato, las llaves y el /v1. Reemplaza el ADR 0009 en dónde corren las migraciones. Nuevo.
- **ADR 0017:** El frente nuevo: tres miradas, ficha clínica, «esperando a…», corretaje y ofertas, dos tipos de dueño. Dice qué partes de los ADR 0010, 0011 y 0013 quedan reemplazadas. Nuevo.
- **docs/api.md:** Cómo se pide una llave y cómo se consulta, con ejemplos. Nuevo.
- **AGENTS.md:** La estructura del monorepo, los comandos y «Antes de decir listo».
- **espacio.json:** Dos servicios (web y api) con sus puertos, y las rutas nuevas.
- **PENDIENTES.md:** Los pasos de la v4 se reemplazan por los de publicar la v7: la web en Vercel (raíz apps/web) y la API en Railway, variables, dominio de la API, cargar las propiedades reales, crear la llave de NPL.
- **~/Code/CLAUDE.md:** La fila de portal-proges en la tabla: monorepo con web y API (repo code-raiz, commit aparte).
- **TAREA.md:** El plano de esta tarea. Se borra en el último commit.

**Fuera:** Registro abierto y plan gratuito; Conexión automática con Nexxos; Pedir servicios con la llave (si d4 a); Escribir en Odoo; Avisos por correo o WhatsApp; Una app nativa de celular (se usa la web); Pasos fijos por tipo de servicio; Administración de arriendos más allá de lo que ya existe; Pagos en línea; IA que pule la bitácora o arma informes; Publicar en producción: queda como pasos en PENDIENTES.md.

## 11. Qué revisar una vez construido
Diego:
- v1. Entra en el computador como Cecilia y mira el Inicio. Debe pasar: Ves lo que entró nuevo, lo trabado (con los días) y la carga de cada persona.
- v2. Reparte un pedido nuevo con dos tareas para François. Debe pasar: El pedido deja «Entró nuevo» y las tareas aparecen en el Hoy de François.
- v3. En el celular como François: marca una tarea hecha y anota con una foto. Debe pasar: La tarea se marca con un toque; la nota queda en la bitácora con la foto, en dos toques.
- v4. Marca «esperando al conservador» en un servicio. Debe pasar: En el tablero pasa a «Esperando a otro» y cuenta los días.
- v5. Abre la ficha de Agustinas 715. Debe pasar: Historial completo, reparaciones con costo y margen, documentos con lo que falta, datos y ubicación.
- v6. Entra como NPL y abre la misma ficha. Debe pasar: Lo mismo, sin costo del maestro, sin margen y sin notas internas.
- v7. En una venta, registra una oferta y muéstrasela al dueño; como NPL, contraoferta. Debe pasar: Al corredor le llega una tarea con la contraoferta.
- v8. Como dueño autónomo, agrega una propiedad, anota un arriendo pagado y pide algo desde un vencimiento. Debe pasar: El pedido aparece en «Entró nuevo» de Cecilia.
- v9. Abre /docs de la API y consulta con la llave de prueba de NPL. Debe pasar: Solo salen las propiedades de NPL, sin costos internos.
- v10. Mira Resultados como administrador. Debe pasar: Servicios por semana, días trabajando y esperando por tipo, obras plan contra real y tareas a tiempo.

Claude:
- Pruebas de la API: npm test -w apps/api.
- Tipos, lint y build de todo el monorepo: npm run verificar.
- Ningún archivo pasa de 800 líneas: el chequeo dentro de verificar.
- Migraciones al día y sin pérdida: npx prisma migrate status en proges_dev y lectura del SQL nuevo.
- Cada pantalla en el navegador: recorrido a 1280 y 390 px como equipo, jefatura, NPL y dueño autónomo.
- La llave externa: curl con una llave de prueba: lee lo suyo, no lee otro cliente, no escribe.
