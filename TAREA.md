# TAREA — Etapa 1: el portal con dos caras (equipo Proges + cliente)

**Estado: plan v6 (la v5 aprobada con cambios, con las preguntas abiertas ya cerradas) ESPERA el ok final de Diego.** Tamaño: grande (regla 1). Página: https://claude.ai/artifact/1dW6hvZhqjEXQxVoSB1Vgo (v6). Branch: `plan/etapa-1-dos-caras` (sin mezclar; la v4 está construida y cerrada, commits `19ef648` a `92bcc14`; el plano de la v4 queda en git, commit `92bcc14`).

**Paso siguiente exacto:** Diego marca en la página los cuatro supuestos nuevos (t30 a t33) y pega «ok, con workflow». Antes, idealmente, crea la cuenta de servicio de Google con la guía de Claude (ver pieza A). Después, el workflow (molde: `~/.claude/projects/-Users-diegofigueroa-Code/6d01402a-ffd5-4528-a638-dead11bb388b/workflows/scripts/proges-etapa1-v4-wf_8cb15232-5e1.js`), sobre `proges_dev_v4`.

**Respuesta de Diego a la v5 (2026-11-19), tal cual:**

```
ok, con workflow
Plan: etapa 1 de Proges, versión 5

Decisiones:
- En una propiedad administrada, ¿quién recibe la plata del arriendo? El arrendatario le paga directo al dueño; Proges controla que pague y cobra su comisión aparte (distinto de lo propuesto)
- ¿Qué hace el dueño en su portal, ahora que el equipo edita la cartera? También edita, igual que el equipo (distinto de lo propuesto)
- ¿Dónde se guardan las fotos y los PDF? En la carpeta del Drive de la propiedad (distinto de lo propuesto)
- ¿Cómo entra al portal la orden que el dueño aprobó en Odoo? El portal la lee de Odoo por su número
- ¿Quién aprueba el presupuesto del maestro? Cecilia y Álvaro, con una marca «jefatura»
- ¿Qué ve el dueño de la bitácora? Solo las notas que el equipo marca para él
- ¿Cómo se recibe una obra? Partida por partida, conforme u observada con fotos; no se cierra con partidas pendientes

Supuestos que no son así:
- El equipo es el único que carga propiedades, contratos y pagos; el dueño no necesita corregir nada él mismo.
- Los maestros son en general los mismos: basta un listado simple.
- En una propiedad administrada, el arrendatario le paga a Proges y Proges le transfiere al dueño (si d21 a).
- Los costos de los maestros hoy no están en Odoo (467 facturas de proveedor en borrador, ninguna publicada desde septiembre): se registran en el portal.

Supuestos que no sé:
- Cada propiedad tiene un solo cliente.
- El presupuesto del maestro llega en PDF o por WhatsApp; en el portal se marca qué partidas de la orden cubre y su total, sin copiarlo línea por línea.
- Las jefaturas son Cecilia y Álvaro.
- Un cambio de alcance durante la obra es un presupuesto adicional, que se aprueba igual que el original.
```

Y agregó: «el caso de NPL o al cliente que le llevamos las propiedades es específico; una vez que abramos el portal a otros posibles usuarios, ellos nos van a poder solicitar los servicios y eso se nos debería cargar en el sistema de manera automática para que ellos lo gestionen».

Lo que se vio en Odoo al leer la respuesta: los maestros sí entran a Odoo como facturas de proveedor (Sociedad Diseño y Espacios $13,3 M, John Franco Vera $7,6 M, Ingeniería del Mueble $6,9 M, Coyanco, LPF, Jess-Alum), casi todas en borrador y casi ninguna con la propiedad marcada (Diseño y Espacios 0 de 9 líneas; John Franco Vera 1 de 9). Hay una sola orden de compra (P00001, Remodelaciones M y L, $4.010.000, con propiedad). La propiedad ya guarda `driveCarpetaId`, pero el portal no tiene conexión con Google.

## Por qué hay una v5

Al ver la v4, Diego dijo (2026-11-19): «el portal interno para Proges no está enfocado en la gestión ni desarrollo de las actividades o tareas que ellos tienen a partir de los servicios ofrecidos». La v4 registra en qué etapa va cada servicio (un marcador), pero no ayuda a hacer el trabajo (una pizarra).

Cómo se trabaja hoy, según Diego (2026-11-19):
- Un servicio nuevo lo toma Cecilia o Álvaro, y ellos reparten quién hace qué. No hay un curso fijo: puede llegar una toma de posesión de una propiedad que no conocían, o un servicio nuevo para una propiedad donde ya trabajaron.
- Lo más común: tomas de posesión, regularización documental, venta, mostrar propiedades, ir a ver o recepcionar para un cliente, y reparaciones y mantenimiento con maestros.
- Hoy las tareas no se llevan en ningún lado: están en la cabeza de cada uno y en WhatsApp. Al terminar, alguien las vacía en un Word. No queda registro ni las jefaturas pueden seguirlas.
- Lo que más problemas da: **las reparaciones y mantenimientos**, y **el reporte de una propiedad en venta** (visitas, anuncios, historial de precios) para que el dueño decida.
- Reparaciones: los maestros son en general los mismos. El maestro manda un presupuesto que se aprueba: es gran parte del costo de Proges y la base del presupuesto que Proges le presenta al dueño. **Proges le paga al maestro y gestiona el trabajo.** Falta rigurosidad y trazabilidad durante la gestión, en la recepción del trabajo y después al comparar con lo planificado.

Después de ver el mockup (https://claude.ai/artifact/7HVjcQdkz3etLXvdEGkFdB), Diego preguntó si había que rehacer el portal partiendo por el portal interno. Se acordó no rehacerlo de cero sino cambiarle el plano: **el portal es primero del equipo; el del dueño es una ventana a ese trabajo.** Y respondió (2026-11-19): **1. el equipo crea y edita las propiedades; 2. Proges administra arriendos** (los contratos y la cobranza son trabajo del equipo). También pidió el listado de propiedades del equipo: todo servicio queda ligado a una propiedad.

**Se mantiene de la v4:** login, usuarios, un espacio por cliente, propiedades y dueños, servicios, etapas, visitas, ofertas, precios, pedidos de clientes, lo que el dueño no debe ver.
**Cambia:** (1) el equipo trabaja con todos los clientes a la vez: el selector de «cliente activo» desaparece y las listas filtran por cliente; el equipo escribe la cartera (revierte el ajuste «el equipo no edita» de la v4); (2) el menú y el inicio parten por el trabajo: Mi trabajo, Trabajo del equipo, Propiedades, Pedidos; después Administración de arriendos (contratos, cobranza, cuentas, pendientes); (3) entran tareas, bitácora, reparaciones y maestros; (4) el dueño pasa a mirar y pedir (d17).

**Ajuste del modelo (2026-11-19, ADR 0012).** Diego explicó por qué dejaron Odoo Proyectos: «no supimos cómo adecuar nuestros requerimientos al sistema de odoo… siempre la propiedad es lo que manda». Se vio con datos reales en la página https://claude.ai/artifact/9J7VHc187CPiRg1D8UznrN, y la respuesta de Diego, pegada tal cual:

```
Modelo propiedad → proyectos:
d18 a: la propiedad es la unidad con su rol; el edificio solo agrupa
d19 a: proyecto = un encargo con 0 o 1 orden de Odoo; el servicio suelto es un proyecto chico
d20 b: diseñar ahora la condición «en administración»
```

Además dijo: las órdenes repetidas son de unidades distintas («muchas veces son 2 dptos, por ejemplo 13A y 13B»); un proyecto puede abrirse antes de que exista la orden; y hoy no administran ningún arriendo. Por d20 b entran la pieza M, la decisión d21 y los supuestos t24 a t29.

**Respuestas de Diego a las preguntas abiertas (2026-11-19), tal cual:** «1 A / 2 A / 3 Si / 4 A / 5 A». Es decir: d22 a (presupuesto en el portal; facturas y pagos del maestro leídos de Odoo y asignados a su proyecto), d23 a (el maestro es el proveedor de Odoo), d24 sí (cuenta de servicio, subcarpeta «Portal», sin carpeta se pide enlazarla), d25 a (el dueño edita su cartera, no la obra; dueño o equipo marcan el arriendo pagado; la comisión se factura en Odoo) y d26 a (el pedido del cliente abre solo el proyecto «por revisar» con tarea a la jefatura).

## 1. Qué va a existir
- **Menú del equipo:** Trabajo (Mi trabajo, Trabajo del equipo, Pedidos de clientes) · Propiedades · Administración de arriendos (En administración, Contratos, Cobranza, Cuentas, Pendientes) · Configuración (Maestros, Equipo y clientes, Etapas). El inicio del equipo es Mi trabajo.
- **Propiedades (equipo):** todas las de todos los clientes, filtradas por defecto a las que tienen trabajo en curso, con sus proyectos, tareas y última novedad; al elegir una, todo lo que Proges ha hecho ahí. El equipo crea una propiedad (eligiendo el cliente) y la edita.
- **Propiedad y proyectos (ADR 0012):** la propiedad es la unidad (un depto, una casa), con su rol; el edificio es un texto que agrupa. Cada encargo es un proyecto (el `ServicioEnCurso` de hoy, con otro nombre en pantalla), con 0 o 1 orden de Odoo que puede enlazarse después; al enlazarla, la cuenta analítica sugiere la unidad y el equipo confirma. Las líneas de la orden son lo que hay que hacer: por recinto en una reparación, una lista para marcar en un servicio suelto.
- **El pedido del cliente abre el proyecto solo (d26 a):** cuando un cliente pide un servicio desde su portal, se crea el proyecto en su propiedad con estado «por revisar» y una tarea para la jefatura («revisar y repartir»). Si la propiedad no existe, el cliente la crea al pedir. La bandeja de pedidos queda como la lista de lo que está «por revisar». Los clientes siguen entrando por invitación.
- **Administración de arriendos (pieza M, d21 b):** una propiedad se pone «en administración» (desde, hasta, comisión %). El arrendatario le paga directo al dueño; Proges controla que pague: cada mes el arriendo queda pagado o atrasado en la cobranza que ya existe (`RentCharge`), y lo puede marcar el equipo o el dueño. La comisión del mes se calcula al mirar (arriendo × %) y se factura en Odoo, como hoy. No hay liquidación ni transferencia al dueño. El dueño ve el estado de sus arriendos y la comisión.
- **Cecilia o Álvaro (jefatura):** al abrir un proyecto (aunque no haya orden todavía), le anotan las tareas: qué, quién y para cuándo. En «Trabajo del equipo» ven las tareas de todos: atrasadas, de la semana, por persona. Aprueban el presupuesto del maestro.
- **Cada persona del equipo:** en «Mi trabajo» ve sus tareas abiertas y atrasadas. Desde el celular anota en la **bitácora** del proyecto lo que pasa, con fotos, en el momento: «fui, faltaba la llave del medidor». Marca sus tareas hechas.
- **Reparaciones:** el maestro es un **proveedor de Odoo** (d23 a): se busca entre los que ya existen ahí y el portal le agrega la especialidad. Su **presupuesto se lleva en el portal** (qué partidas cubre, total, PDF, plazo) y lo aprueba la jefatura; los adicionales igual. Las **facturas y pagos del maestro se leen de Odoo** (d22 a): el portal muestra las facturas de proveedor de ese maestro que no están asignadas, el equipo asigna cada una a su proyecto, y el pagado sale de Odoo. Además: avance de cada partida, **recepción** partida por partida con fotos (conforme u observada), y al cerrar, **lo planificado contra lo real**: costo, plazo y partidas.
- **Fotos y PDF en el Drive de la propiedad (d12 b, d24):** se guardan en una subcarpeta «Portal» dentro de la carpeta del Drive de cada propiedad, con una cuenta de servicio de Google. Si la propiedad no tiene carpeta, se pide enlazarla antes de subir el primer archivo. En el portal se ven a través del servidor, nunca con un enlace público.
- **El dueño (cliente, d17 b, d25 a):** edita su cartera igual que el equipo (propiedades, contratos, cobranza); no toca tareas, bitácora ni nada de la obra. En su proyecto ve el avance de la obra y las notas y fotos de la bitácora que el equipo marca para él. Pide servicios. Nunca ve el costo del maestro, sus facturas ni sus pagos.
- **Listo:** pasan tipos, lint y build; un proyecto se abre sin orden y la orden se enlaza después, confirmando la unidad; un pedido del cliente abre su proyecto «por revisar» con la tarea para la jefatura; la comisión de una propiedad administrada cuadra con `probar-administracion.ts`; un cliente nunca ve costos, presupuestos, facturas ni pagos de maestros, ni notas no marcadas para él; una obra muestra aprobado, adicionales, facturado y pagado (de Odoo) y saldo, y la comparación plan contra real; no se cierra una obra con partidas sin recibir; una foto subida queda en la carpeta «Portal» de la propiedad; «Mi trabajo» muestra las atrasadas; la bitácora se usa bien a 390 px de ancho; ningún archivo sobre 800 líneas; ADRs y `PENDIENTES.md` al día.

## 2. Flujo de los usuarios
0. El pedido llega: o el cliente lo pide en su portal (se abre solo el proyecto «por revisar», con tarea para jefatura; pieza B), o la jefatura abre el proyecto a mano apenas llega el encargo, aunque no haya orden: estado «por cotizar». Pieza B.
1. Jefatura revisa el proyecto y le anota las tareas (qué, quién, para cuándo). Pieza B.
2. Cada uno ve lo suyo en «Mi trabajo». Pieza B.
3. En terreno, anota en la bitácora con fotos (al Drive de la propiedad). Pieza C.
4. Marca la tarea hecha; la jefatura lo ve en «Trabajo del equipo». Pieza B.
4b. Cuando la orden existe, se enlaza por su número (d13): la cuenta analítica sugiere la unidad y el equipo confirma. Los recintos y sus líneas quedan como partidas (en un servicio suelto, una lista para marcar); los anticipos, como lo facturado al dueño. Pieza O.
5. (Obra) Elige el maestro entre los proveedores de Odoo y carga su presupuesto: qué partidas cubre, su total, el PDF y el plazo. Pieza D.
6. (Obra) Jefatura lo aprueba: queda como el plan de costo y plazo. Pieza D.
7. (Obra) Anota la fecha de inicio. Pieza D.
8. (Obra) Durante el trabajo: avance por partida y adicionales aprobados; las facturas del maestro que llegan a Odoo se asignan al proyecto, y su pago se ve desde Odoo. Pieza E.
9. (Obra) Recepción partida por partida, con fotos: conforme u observada; una observada abre una tarea para corregirla. Pieza E.
10. (Obra) Cierre: lo planificado contra lo real. Pieza F.
11. El dueño ve el avance y las notas marcadas para él. Pieza F.
12. (Administración) El equipo pone la propiedad en administración con su comisión; cada mes el equipo o el dueño marca el arriendo pagado; el equipo ve los atrasados y la comisión del mes para facturarla en Odoo. Pieza M.

## 3. Flujo de datos
- Postgres (nuevo, en el espacio del cliente salvo los maestros):
  - `Tarea` (proyecto, qué, responsable, vence, hecha el, hecha por, creada por).
  - `Nota` (proyecto, autor, texto, fecha, la ve el dueño sí/no, tarea opcional) y `Foto` (nota, id del archivo en Drive, nombre).
  - `Maestro` (en `org_proges`: id del proveedor en Odoo, nombre copiado de Odoo, especialidad, activo). Son proveedores de Proges, no del cliente.
  - `PresupuestoMaestro` (proyecto, maestro, tipo ORIGINAL o ADICIONAL, plazo en días, PDF en Drive, estado RECIBIDO/APROBADO/RECHAZADO, quién y cuándo) que cubre partidas. `OrdenDueno` (número de Odoo, total, facturado) con sus `Partida` (recinto optativo, código, descripción, cantidad, unidad, precio al dueño, línea de Odoo, maestro, avance %, recepción: pendiente/conforme/observada, observación).
  - `FacturaMaestro` (proyecto, maestro, id de la factura de proveedor en Odoo, monto asignado, quién la asignó). Solo la asignación: número, fecha, total, estado y pagado se leen de Odoo al mirar. Una factura puede repartirse entre dos proyectos, y la suma asignada nunca pasa su total.
  - En `Property`: `edificio` (texto optativo) y la cuenta analítica de Odoo (número, puede repetirse). `driveCarpetaId` ya existe.
  - `Administracion` (propiedad, desde, hasta, comisión %). El arriendo del mes es el `RentCharge` de siempre, con su estado pagado o atrasado y quién lo marcó.
  - En `ServicioEnCurso`: estado «por revisar» cuando nace de un pedido, la solicitud de origen, y para la obra el presupuesto al dueño, fecha de inicio y fecha comprometida.
- Odoo, solo lectura (`src/lib/odoo.ts`): órdenes de venta (d13), proveedores (`res.partner` con facturas de proveedor) y facturas de proveedor (`account.move`, tipo `in_invoice`: número, fecha, total, estado y lo pendiente de pago). Nunca escribe.
- Google Drive (`src/lib/archivos.ts`, d24): una cuenta de servicio con su llave en `.env`; sube a la subcarpeta «Portal» de la carpeta de la propiedad (la crea si falta) y entrega el archivo a través de una ruta del servidor que revisa el permiso.
- Espacios: `getOrgId()` deja de ser un solo cliente para el equipo. Nuevo `espaciosQueLee()` (para el cliente, el suyo; para el equipo, todos los clientes activos o el filtro elegido) que usan las listas; las acciones escriben en el espacio del registro que tocan (el de la propiedad), y al crear una propiedad, en el cliente elegido. `orgParaEscribir()` deja pasar a los dos (d17 b): el cliente, en su espacio; el equipo, en el de la propiedad.
- Servidor: `src/lib/administracion.ts` (comisión del mes y atrasos, funciones puras). `src/lib/obra.ts` con las cuentas como funciones puras (aprobado, adicionales, facturado y pagado, saldo, avance ponderado, plan contra real) que usan la pantalla y la prueba; `src/lib/vista-cliente.ts` suma el avance y las notas marcadas, nunca montos del maestro.
- Pantallas: la página del proyecto se reordena (tareas y bitácora arriba, el resto debajo); «Mi trabajo» y «Trabajo del equipo» (reemplaza la parte de cifras de «Operación», que queda con los pedidos por revisar); `/equipo/maestros`; la sección Obra del proyecto.

## 4. Permisos
- EQUIPO: lee y escribe la cartera de todos los clientes (propiedades, contratos, cobranza, cuentas); crea tareas, notas, presupuestos, asignaciones de facturas y recepciones; ve los costos; pone una propiedad en administración.
- Jefatura (marca nueva en el usuario, la pone el admin; d14): aprueba presupuestos de maestros y adicionales, y cierra la obra.
- CLIENTE (d17 b, d25 a): edita su cartera igual que el equipo (propiedades, contratos, cobranza, cuentas) y marca un arriendo pagado; pide servicios, y al pedir puede crear la propiedad; ve el avance de sus obras y las notas marcadas «la ve el dueño», con sus fotos; ve el estado de sus arriendos administrados y la comisión. No toca tareas, bitácora, presupuestos ni nada de la obra. Nada de montos del maestro.
- Cuando el dueño y el equipo editan lo mismo, vale el último que guarda, y queda quién y cuándo cambió (el historial que ya tiene la cartera, o un campo «modificado por»). No hay bloqueo.
- Todo en el servidor: las acciones nuevas exigen EQUIPO (y jefatura donde corresponde) y comprueban cada id contra el espacio; lo del cliente sale solo de `vista-cliente.ts`.

## 5. Decisiones
De Diego (todas cerradas):
- **d12 (b):** fotos y PDF en la carpeta del Drive de la propiedad.
- **d13 (a):** el portal lee la orden de Odoo por su número.
- **d14 (a):** aprueban Cecilia y Álvaro, con una marca «jefatura».
- **d15 (a):** el dueño ve solo las notas que el equipo marca para él.
- **d16 (a):** se recibe partida por partida, conforme u observada con fotos; no se cierra con partidas pendientes.
- **d17 (b):** el dueño también edita, igual que el equipo.
- **d18 (a):** la propiedad es la unidad con su rol; el edificio solo agrupa.
- **d19 (a):** proyecto = un encargo con 0 o 1 orden de Odoo; el servicio suelto es un proyecto chico.
- **d20 (b):** se diseña ahora la condición «en administración».
- **d21 (b):** el arrendatario le paga directo al dueño; Proges controla que pague y cobra su comisión aparte.
- **d22 (a):** el presupuesto del maestro y su aprobación se llevan en el portal; las facturas y pagos del maestro se leen de Odoo, y el equipo asigna cada factura a su proyecto.
- **d23 (a):** el maestro es el proveedor de Odoo; el portal le agrega la especialidad.
- **d24 (sí):** cuenta de servicio de Google; todo en la subcarpeta «Portal» de la carpeta de la propiedad; sin carpeta, se pide enlazarla antes de subir.
- **d25 (a):** el dueño edita su cartera (propiedades, contratos, cobranza), no la obra ni las tareas. Equipo y dueño pueden marcar un arriendo pagado; la comisión se factura en Odoo.
- **d26 (a):** el pedido del cliente abre solo el proyecto «por revisar» con una tarea para la jefatura; el cliente puede crear la propiedad al pedir. El registro abierto queda fuera de esta etapa.

De Claude:
- El edificio es un texto, no una tabla: basta para agrupar y buscar.
- No se renombra `ServicioEnCurso` en la base; en pantalla se llama proyecto. Las etapas quedan optativas.
- Una sola clase de línea (`Partida`, con recinto optativo) para reparaciones y servicios sueltos.
- La orden se enlaza confirmando la unidad: la cuenta analítica sola no basta.
- La comisión se calcula al mirar; no se guarda un total.
- Lo puntual durante un arriendo (ADMP) es un proyecto más.
- El equipo ve todos los clientes juntos, con un filtro por cliente; ya no elige un cliente activo.
- Al editar, el espacio sale del registro que se toca (la propiedad), nunca de lo que manda el navegador.
- Si el dueño y el equipo editan lo mismo, vale el último y queda quién cambió: no se construye un bloqueo para un choque que todavía no pasa.
- Del Odoo solo se guarda la asignación de la factura al proyecto; el monto, el estado y el pago se leen cada vez, para que no haya dos versiones.
- El portal nunca escribe en Odoo; las facturas sin propiedad se ordenan en el portal, no en Odoo.
- Se reutiliza todo lo de la v4 que no contradice esto: no se reescribe de cero.
- La tarea es lo mínimo: qué, quién, para cuándo, hecha. Sin estados intermedios ni dependencias entre tareas.
- La bitácora reemplaza el Word final: el informe para el dueño se lee de ahí.
- Las cuentas de la obra son funciones puras en `src/lib/obra.ts` y se calculan al mirar; no se guardan.
- Los maestros viven en el espacio de Proges y valen para todos los clientes.
- El costo del maestro nunca sale de `vista-cliente.ts`.
- Plata en Decimal con su moneda; el presupuesto del maestro va en pesos.
- Las etapas de la v4 siguen, pero dejan de ser lo principal de la pantalla del equipo.
- WhatsApp no se conecta: se anota en el portal (conectarlo es otra herramienta y otro costo).
- El reporte de venta para el dueño queda para la tarea siguiente: ya hay visitas, ofertas y precios; falta lo de los portales y el resumen.
- Los «no sé» (t12, t15, t17, t19) no frenan: el presupuesto puede ir con una sola partida y su PDF; la marca de jefatura se le pone a quien sea; un adicional es opcional; cada propiedad sigue con un solo cliente, como en la v4.

## 6. Supuestos
Diego los marcó en la v5. Los «no es así» cambiaron el plan (t10 → d23, t18 → d17 b, t23 → d22, t24 → d21 b) y salen de la lista.
- Cierto: t11 (varios maestros por obra), t13 (Proges le paga al maestro fuera del portal), t14 (la cotización al dueño sigue en Odoo), t16 (se anota desde el celular), t20, t21, t22, t25 (comisión % fijo por propiedad), t28, t29 (hoy no hay ninguna administrada).
- No sé: t12 (cómo llega el presupuesto), t15 (las jefaturas son Cecilia y Álvaro), t17 (el cambio de alcance es un adicional), t19 (un solo cliente por propiedad). El diseño aguanta las dos respuestas.
- t26 y t27 (gastos y liquidación mensual) dejan de aplicar con d21 b.

Nuevos en la v6, para marcar en la página:
- t30. Las facturas de los maestros terminan entrando a Odoo como facturas de proveedor, y su pago se registra en Odoo (aunque hoy muchas estén en borrador).
- t31. Los maestros con que se trabaja ya están, o se crean, como proveedores en Odoo.
- t32. Es raro que el dueño y el equipo cambien el mismo dato el mismo día.
- t33. Proges tiene, o puede usar, una carpeta del Drive por propiedad, dentro de una unidad compartida donde se puede dar acceso a la cuenta de servicio.

**Lo que se vio en Odoo (2026-11-19, `scripts/leer-odoo.ts`):** Odoo 19 Enterprise, la API funciona (d13 a). La S00047 trae 14 recintos, 61 líneas, notas por línea y los 3 anticipos con sus facturas. En la app Proyectos intentaron llevar las obras (José de Moraleda: 12 tareas de cotizaciones a maestros, anticipos y saldos; Avenida Portales Oriente: 25 tareas por fase), pero no hay tareas nuevas desde el 2026-08-25. Diego: se dejó porque no supieron acomodar ahí cómo trabajan (ver ADR 0012). Las facturas de maestros están como facturas de proveedor, casi sin propiedad marcada.

## 7. Lo que no debe pasar
- Un dueño ve el costo del maestro, sus facturas, pagos o el presupuesto. Cómo: `scripts/probar-obra.ts` recorre lo que entrega `vista-cliente.ts`.
- Un dueño ve una nota no marcada para él. Cómo: la misma prueba.
- Un dueño escribe una tarea, una nota o algo de la obra. Cómo: la prueba llama esas acciones como cliente y deben rechazarse.
- Un dueño edita la cartera de otro cliente. Cómo: `probar-espacios.ts`.
- Se cierra una obra con partidas sin recibir u observadas. Cómo: prueba de la acción.
- El saldo del maestro está mal, o una factura se asigna por más de su total. Cómo: `probar-obra.ts` con presupuesto, adicional, factura repartida y pago.
- Alguien sin la marca de jefatura aprueba un presupuesto. Cómo: la acción lo rechaza; prueba.
- El portal escribe en Odoo. Cómo: `src/lib/odoo.ts` solo acepta métodos de lectura (como `scripts/leer-odoo.ts`); revisión.
- Una foto queda con enlace público en Drive. Cómo: se sube sin compartir y se entrega por una ruta del servidor que revisa el permiso; revisión.
- La llave de la cuenta de servicio o de Odoo aparece en el código o en un log. Cómo: solo en `.env`; revisión.
- Un cliente ve algo de otro cliente ahora que el equipo lee todos a la vez. Cómo: `probar-espacios.ts` se amplía con `espaciosQueLee()`.
- Una acción del equipo escribe en el cliente equivocado. Cómo: la prueba crea un contrato en una propiedad de A y comprueba que quedó en A.
- Un pedido del cliente crea el proyecto en otro cliente, o dos veces. Cómo: prueba de la acción del pedido.
- La comisión del mes no cuadra. Cómo: `scripts/probar-administracion.ts` con un mes pagado, uno atrasado y uno fuera del período.
- La migración borra datos. Cómo: leer el SQL: solo crea y agrega.
- Un archivo pasa de 800 líneas. Cómo: `wc -l`.

## 8. Piezas y orden
Olas: [A, W] → [B, C, D, O] → [E, P, V, M] → [F, G]. 12 agentes en Sonnet, uno por pieza (un poco sobre los ~10 de la regla 10: se acepta porque M es independiente y no alarga el camino). Verificación común: `npx tsc --noEmit && npm run lint`; build al final de cada ola.
- ◻️ A. Modelo, archivos y cuentas. `prisma/schema.prisma` y una migración nueva (Tarea, Nota, Foto, Maestro con id de Odoo, PresupuestoMaestro, OrdenDueno, Partida, FacturaMaestro, Administracion, campos nuevos en Property y ServicioEnCurso); `src/lib/archivos.ts` (Drive con cuenta de servicio, subcarpeta «Portal», ruta del servidor para ver el archivo; sin llave en `.env`, falla con un mensaje claro); `src/lib/obra.ts` (cuentas, funciones puras); marca de jefatura en `/equipo`; `src/lib/odoo.ts` (solo lectura, parte de `scripts/leer-odoo.ts`: leer una orden, buscar proveedores, listar las facturas de proveedor de un maestro con su estado y lo pagado; verifica que las de Sociedad Diseño y Espacios sumen lo que muestra Odoo). Va en A para que D, O y E lo usen sin tocar el mismo archivo.
- ◻️ W. El equipo y el dueño escriben la cartera. `src/lib/org.ts` y `src/lib/sesion.ts` (`espaciosQueLee()`, escritura del equipo en el espacio de la propiedad, el cliente en el suyo, d17 b); quitar el selector de cliente activo; las ~23 pantallas y ~10 archivos de acciones de la cartera; crear propiedad eligiendo el cliente; quién modificó.
- ◻️ B. Menú, inicio, tareas, Mi trabajo, Trabajo del equipo y el pedido que abre el proyecto (d26: proyecto «por revisar» y tarea a jefatura; el cliente crea la propiedad al pedir). Depende de A y W.
- ◻️ C. Bitácora con fotos al Drive, pensada para el celular. Depende de A.
- ◻️ D. Maestros (buscar proveedores de Odoo y sumarles especialidad) y presupuestos (aprobar con jefatura, adicionales). Depende de A.
- ◻️ O. Traer la orden de Odoo por su número (recintos → partidas, anticipos → facturado; volver a traerla sin perder avance) y enlazarla con la unidad por su cuenta analítica. Verifica: la S00047 cuadra 14 recintos y $22.764.048. Depende de A.
- ◻️ E. Avance (por recinto, y por línea si hace falta), facturas del maestro asignadas al proyecto con su pago desde Odoo, y recepción de la obra. Depende de D y O.
- ◻️ V. La página de la venta: resumen arriba, registrar visita en el celular con oferta y tarea de seguimiento (visitas, ofertas y precio ya existen). Depende de B y C.
- ◻️ P. Propiedades del equipo: listado con trabajo en curso e historial de cada propiedad. Depende de B y C.
- ◻️ M. Administración de arriendos: `src/lib/administracion.ts` (comisión del mes y atrasos, funciones puras); poner y sacar una propiedad de administración (desde, hasta, comisión); marcar el arriendo pagado (equipo o dueño) en la cobranza; vista de atrasados y comisiones del mes para facturar en Odoo; filtro «en administración» en Propiedades; estado y comisión en la vista del dueño. Verifica: un mes pagado y uno atrasado. Depende de A y W.
- ◻️ F. Cierre con plan contra real, vista del dueño y página del proyecto reordenada. Depende de C y E.
- ◻️ G. `scripts/probar-obra.ts`, `scripts/probar-administracion.ts` y `probar-espacios.ts` ampliado (el dueño edita su cartera pero no la obra; el pedido abre el proyecto en su espacio). Depende de W, B, E y M.

**Antes de lanzar (Diego):** crear la cuenta de servicio de Google y dejar su llave en `.env` (Claude lo guía paso a paso). Si no está, el workflow construye igual y la subida real al Drive se prueba cuando esté la llave (se dice en el cierre).

## 9. Riesgos
- R7. El equipo no anota y vuelve a WhatsApp (p 3, i 3; uso). La nota tiene que ser tan rápida como un mensaje: un campo y las fotos, sin formulario largo. Se prueba en el celular.
- R8. El dueño ve un costo (p 1, i 3; plata). Una sola puerta (`vista-cliente.ts`) y prueba.
- R9. Una foto queda pública en Drive (p 2, i 2; datos). Se sube sin compartir y se ve por el servidor; revisión.
- R16. Las fotos se ven lentas porque pasan por Drive (p 2, i 1; uso). Miniaturas de Drive en las listas; el original solo al abrir.
- R17. Las facturas de proveedor siguen en borrador o sin pagar en Odoo, y el saldo del maestro se ve peor de lo que es (p 3, i 2; uso). Se muestra el estado de cada factura (borrador, publicada, pagada) y el pago solo cuenta lo que Odoo marca pagado.
- R18. El dueño y el equipo se pisan un dato (p 1, i 2; datos). Vale el último y queda quién cambió; si pasa seguido, se revisa.
- R12. Al abrir la lectura a todos los clientes, una pantalla del cliente queda leyendo de más (p 2, i 3; datos). `espaciosQueLee()` devuelve siempre un solo espacio para un cliente; prueba y revisor.
- R14. La administración se diseña sin caso real y no calza con el primero (p 3, i 2; uso). Lo mínimo y se revisa con la primera propiedad administrada.
- R13. Al volver a traer la orden se pierde el avance o la recepción (p 2, i 3; datos). Las partidas se reconocen por su línea de Odoo; las nuevas se suman y las borradas se marcan, nunca se borran.
- R11. Las cuentas del saldo fallan (p 1, i 2; plata). Funciones puras con prueba.

## 10. Documentos accesorios y qué queda fuera
- ADR 0012 «La propiedad manda» (revisado en la v6: sin liquidación, d21 b).
- ADR 0013 «El trabajo del equipo: tareas, bitácora y el pedido que abre el proyecto».
- ADR 0014 «Reparaciones: maestros de Odoo, presupuesto, facturas asignadas, recepción y plan contra real».
- ADR 0015 «Fotos y PDF en el Drive de la propiedad».
- ADR 0010: se reescribe otra vez (el equipo lee y escribe todos los clientes; el dueño edita su cartera y pide).
- ADR 0011: la etapa deja de ser lo principal para el equipo.
- `PENDIENTES.md`: la línea «seguimiento de obra» se reemplaza por lo que quede fuera; cambiar la llave de Odoo por un usuario de solo lectura antes de producción.
- Fuera: el reporte de venta para el dueño (tarea siguiente); traer la cotización desde Odoo; escribir en Odoo (crear facturas o marcar la propiedad); conectar WhatsApp; IA que pule la bitácora o arma el informe; plantillas de tareas por tipo de servicio; pagar al maestro desde el portal; que el maestro entre al portal; conectar el banco; registro abierto de clientes nuevos; facturar la comisión desde el portal.

## 11. Qué revisar una vez construido
Diego:
- v8. Entra como equipo: el inicio es Mi trabajo y el menú parte por el trabajo.
- v9. En Propiedades, filtra por NPL, crea una propiedad nueva con su proyecto y edítala.
- v10. Como jefatura, abre un proyecto y anota tres tareas para dos personas: cada una las ve en «Mi trabajo».
- v11. Desde el celular, anota en la bitácora con dos fotos: se ven en el proyecto y quedan en la carpeta «Portal» del Drive de la propiedad.
- v12. Elige un maestro de los proveedores de Odoo, carga su presupuesto con tres partidas y su PDF, y apruébalo.
- v13. Asigna al proyecto una factura de ese maestro desde Odoo y registra un adicional: el saldo calza con tu cuenta y el pagado es el de Odoo.
- v14. Recibe dos partidas conformes y una observada: la obra no se deja cerrar y la observada abrió una tarea.
- v15. Cierra la obra: ves lo planificado contra lo real.
- v16. Como dueño, abre la obra: ves el avance y la nota marcada para ti, y ningún monto del maestro.
- v17. Abre un proyecto de toma de posesión sin orden y después enlaza la S00045: la orden se suma con su línea para marcar.
- v18. Enlaza la S00023 de Monjitas 550: el portal pide elegir a cuál de los dos deptos va.
- v19. Pon una propiedad en administración con 8% de comisión; como dueño marca el arriendo pagado: el equipo lo ve pagado y la comisión del mes calza.
- v20. Como dueño, edita un contrato de tu propiedad; como equipo, ves el cambio y quién lo hizo.
- v21. Como dueño, pide un servicio para una propiedad nueva: el equipo ve el proyecto «por revisar» y la jefatura su tarea.
Claude: tipos, lint y build; `npx tsx scripts/probar-obra.ts`; `npx tsx scripts/probar-espacios.ts`; `npx tsx scripts/probar-administracion.ts`; SQL leído; `wc -l`.

## Historia
- v1 y v2: commits `8feafed` a `2a0b1e9`. v3 aprobada y construida el 2026-11-18: commits `740d374` a `a478988`.
- v4 aprobada el 2026-11-18 («ok, con workflow»: d8 a, d9 b todos administran, d10 a, d11 a; el equipo ve la cartera sin editarla; NPL con su propio usuario, a cargo de Proges al principio). Construida, revisada y cerrada: commits `9107728` a `92bcc14`; su cierre es la versión 6 de la página.
- Lo que ya cerró Diego y sigue en pie: Nexxos solo publica; cobrar según cada contrato en espera; DuckDB y dbt con Odoo; el cliente ve las visitas sin los datos del interesado (d2 b); carga inicial de las 42 sin las 20 posiblemente vendidas (d3 b); el cliente ve en vivo (d4 a); etapas propias por tipo de servicio, editables (d5 b); revisión enfocada y completa antes de abrirle el portal al cliente real (d7 a); ningún archivo sobre 800 líneas.
- v5 aprobada con cambios el 2026-11-19 (commit `e2b5edf`); sus preguntas abiertas se cerraron en la v6.
