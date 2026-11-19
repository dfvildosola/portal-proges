# TAREA — Etapa 1: el portal con dos caras (equipo Proges + cliente)

**Estado: plan v5 (rehecho: «el portal interno primero») APROBADO con cambios por Diego (2026-11-19); faltan cerrar las preguntas que abrieron sus respuestas.** Tamaño: grande (regla 1). Página: https://claude.ai/artifact/1dW6hvZhqjEXQxVoSB1Vgo (v5). Branch: `plan/etapa-1-dos-caras` (sin mezclar; la v4 está construida y cerrada, commits `19ef648` a `92bcc14`; el plano de la v4 queda en git, commit `92bcc14`).

**Paso siguiente exacto:** Diego respondió «ok, con workflow» (2026-11-19, abajo), pero con cuatro decisiones distintas de lo propuesto y cuatro supuestos «no es así» que cambian piezas A, C, D, E, M y W. Antes de lanzar: cerrar con él las preguntas abiertas (costos y pagos de maestros en Odoo, qué falta del listado de maestros, la cuenta de servicio del Drive, hasta dónde edita el dueño, y la solicitud que entra sola), ajustar este plano y la página, y pedir su ok final. Después, el workflow (molde: `~/.claude/projects/-Users-diegofigueroa-Code/6d01402a-ffd5-4528-a638-dead11bb388b/workflows/scripts/proges-etapa1-v4-wf_8cb15232-5e1.js`), sobre `proges_dev_v4`.

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

## 1. Qué va a existir
- **Menú del equipo:** Trabajo (Mi trabajo, Trabajo del equipo, Pedidos de clientes) · Propiedades · Administración de arriendos (En administración, Contratos, Cobranza, Liquidaciones, Cuentas, Pendientes) · Configuración (Maestros, Equipo y clientes, Etapas). El inicio del equipo es Mi trabajo.
- **Propiedades (equipo):** todas las de todos los clientes, filtradas por defecto a las que tienen trabajo en curso, con sus servicios, tareas y última novedad; al elegir una, todo lo que Proges ha hecho ahí. El equipo crea una propiedad (eligiendo el cliente) y la edita.
- **Propiedad y proyectos (ADR 0012):** la propiedad es la unidad (un depto, una casa), con su rol; el edificio es un texto que agrupa. Cada encargo es un proyecto (el `ServicioEnCurso` de hoy, con otro nombre en pantalla), con 0 o 1 orden de Odoo que puede enlazarse después; al enlazarla, la cuenta analítica sugiere la unidad y el equipo confirma. Las líneas de la orden son lo que hay que hacer: por recinto en una reparación, una lista para marcar en un servicio suelto.
- **Administración de arriendos (pieza M):** una propiedad se pone «en administración» (desde, comisión, quién recibe el arriendo según d21). Cada mes, la liquidación: arriendo cobrado menos comisión menos gastos pagados por Proges = lo que se transfiere al dueño; se calcula al mirar y solo se guarda la transferencia. El dueño ve su liquidación.
- **Cecilia o Álvaro (jefatura):** al abrir un proyecto (aunque no haya orden todavía), le anotan las tareas: qué, quién y para cuándo. En «Trabajo del equipo» ven las tareas de todos: atrasadas, de la semana, por persona. Aprueban el presupuesto del maestro.
- **Cada persona del equipo:** en «Mi trabajo» ve sus tareas abiertas y atrasadas. Desde el celular anota en la **bitácora** del servicio lo que pasa, con fotos, en el momento: «fui, faltaba la llave del medidor». Marca sus tareas hechas.
- **Reparaciones** (servicios de tipo Obra): se cargan los maestros; el presupuesto de cada maestro, por partidas, con su PDF; se aprueba; se registran los adicionales y los pagos al maestro; el avance de cada partida; la **recepción** partida por partida, con fotos, conforme u observada; y al cerrar, **lo planificado contra lo real**: costo, plazo y partidas.
- **El dueño (cliente):** en su servicio ve el avance de la obra y las notas y fotos de la bitácora que el equipo marca para él. Nunca ve el costo del maestro ni sus pagos.
- **Listo:** pasan tipos, lint y build; un proyecto se abre sin orden y la orden se enlaza después, confirmando la unidad; la liquidación de una propiedad administrada cuadra con `probar-administracion.ts`; un cliente nunca ve costos, presupuestos ni pagos de maestros, ni notas no marcadas para él; una obra muestra aprobado, adicionales, pagado y saldo, y la comparación plan contra real; no se cierra una obra con partidas sin recibir; «Mi trabajo» muestra las atrasadas; la bitácora se usa bien a 390 px de ancho; ningún archivo sobre 800 líneas; ADRs y `PENDIENTES.md` al día.

## 2. Flujo de los usuarios
1. Jefatura abre o acepta el servicio y le anota las tareas (qué, quién, para cuándo). Pieza B.
2. Cada uno ve lo suyo en «Mi trabajo». Pieza B.
3. En terreno, anota en la bitácora con fotos. Pieza C.
4. Marca la tarea hecha; la jefatura lo ve en «Trabajo del equipo». Pieza B.
5. (Obra) Carga el presupuesto del maestro: qué partidas de la orden cubre, su total, el PDF y el plazo. Pieza D.
6. (Obra) Jefatura lo aprueba: queda como el plan de costo y plazo. Pieza D.
0. Jefatura abre el proyecto apenas llega el encargo, aunque no haya orden: estado «por cotizar». Pieza B.
4b. Cuando la orden existe, se enlaza por su número (d13): la cuenta analítica sugiere la unidad y el equipo confirma. Los recintos y sus líneas quedan como partidas (en un servicio suelto, una lista para marcar); los anticipos, como lo facturado al dueño. Pieza O.
7. (Obra) Anota la fecha de inicio. Pieza D.
8. (Obra) Durante el trabajo: avance por partida, adicionales aprobados, pagos al maestro, todo con su nota. Pieza E.
9. (Obra) Recepción partida por partida, con fotos: conforme u observada; una observada abre una tarea para corregirla. Pieza E.
10. (Obra) Cierre: lo planificado contra lo real. Pieza F.
11. El dueño ve el avance y las notas marcadas para él. Pieza F.
12. (Administración) El equipo pone la propiedad en administración; cada mes revisa la liquidación y anota la transferencia; el dueño la ve. Pieza M.

## 3. Flujo de datos
- Postgres (nuevo, en el espacio del cliente salvo los maestros):
  - `Tarea` (servicio en curso, qué, responsable, vence, hecha el, hecha por, creada por).
  - `Nota` (servicio en curso, autor, texto, fecha, la ve el dueño sí/no, tarea opcional) y `Foto` (nota, archivo, nombre).
  - `Maestro` (en `org_proges`: nombre, especialidad, teléfono, RUT, activo). Son proveedores de Proges, no del cliente.
  - `PresupuestoMaestro` (servicio OBRA, maestro, tipo ORIGINAL o ADICIONAL, plazo en días, PDF, estado RECIBIDO/APROBADO/RECHAZADO, quién y cuándo) que cubre partidas. `OrdenDueno` (número de Odoo, total, facturado) con sus `Partida` (recinto, código, descripción, cantidad, unidad, precio al dueño, línea de Odoo, maestro, avance %, recepción: pendiente/conforme/observada, observación).
  - `PagoMaestro` (presupuesto, monto, fecha, concepto, comprobante opcional).
  - En `Property`: `edificio` (texto optativo) y la cuenta analítica de Odoo (número, puede repetirse). `Partida` con recinto optativo, para que un servicio suelto use la misma línea.
  - `Administracion` (propiedad, desde, hasta, comisión %, quién recibe el arriendo según d21) y `Liquidacion` (administración, período, transferido, fecha, nota). Los gastos son `Movement` de la propiedad marcados para descontar, con su comprobante.
  - En `ServicioEnCurso` (obra): presupuesto al dueño (monto y moneda, número de Odoo), fecha de inicio y fecha comprometida.
- Fotos y PDF: según d12.
- Espacios para el equipo: `getOrgId()` deja de ser un solo cliente para el equipo. Nuevo `espaciosQueLee()` (para el cliente, el suyo; para el equipo, todos los clientes activos o el filtro elegido) que usan las listas; las acciones escriben en el espacio del registro que tocan (el de la propiedad), y al crear una propiedad, en el cliente elegido. `orgParaEscribir()` pasa a exigir EQUIPO (d17 a).
- Servidor: `src/lib/administracion.ts` (liquidación, funciones puras). `src/lib/obra.ts` con las cuentas como funciones puras (aprobado, adicionales, pagado, saldo, avance ponderado, plan contra real) que usan la pantalla y la prueba; `src/lib/vista-cliente.ts` suma el avance y las notas marcadas, nunca montos del maestro.
- Pantallas: la página del servicio se reordena (tareas y bitácora arriba, el resto debajo); «Mi trabajo» y «Trabajo del equipo» (reemplaza la parte de cifras de «Operación», que queda con la bandeja de solicitudes); `/equipo/maestros`; la sección Obra del servicio.

## 4. Permisos
- EQUIPO: crea tareas, notas, presupuestos, pagos y recepciones en el cliente activo; ve los costos.
- Jefatura (marca nueva en el usuario, la pone el admin; d14): aprueba presupuestos de maestros y adicionales, y cierra la obra.
- EQUIPO: además lee y escribe la cartera de todos los clientes (propiedades, contratos, cobranza, cuentas).
- EQUIPO: pone una propiedad en administración y liquida el mes.
- CLIENTE: ve la liquidación de su propiedad administrada; mira su cartera y pide servicios (d17 a); ve el avance de sus obras y las notas marcadas «la ve el dueño», con sus fotos. Nada de montos del maestro, pagos ni presupuestos.
- Todo en el servidor: las acciones nuevas exigen EQUIPO (y jefatura donde corresponde) y comprueban cada id contra el espacio; lo del cliente sale solo de `vista-cliente.ts`.

## 5. Decisiones
De Diego:
- **d12. Dónde se guardan las fotos y los PDF:** (a) un almacén privado nuevo en Vercel Blob, solo para el portal [rec.]; (b) en la carpeta del Drive de la propiedad.
- **d13. Cómo entra la orden del dueño (Odoo):** (a) el portal la lee de Odoo por su número [rec., si el Odoo de Proges permite conectarse]; (b) se sube el PDF y el portal lo lee; (c) solo el total y el número. Cambió el 2026-11-19 al ver la orden S00047 (14 recintos, 61 líneas, $22.764.048 neto, 3 anticipos).
- **d14. Quién aprueba el presupuesto del maestro:** (a) Cecilia y Álvaro, con una marca «jefatura» [rec.]; (b) cualquiera del equipo; (c) solo el admin.
- **d15. Qué ve el dueño de la bitácora:** (a) solo las notas que el equipo marca para él [rec.]; (b) todas, menos los montos; (c) nada, solo el avance.
- **d17. Qué hace el dueño en su portal ahora que el equipo edita:** (a) mira su cartera y sus servicios, y pide servicios; no edita [rec.]; (b) también edita, igual que el equipo.
- **d16. Cómo se recibe una obra:** (a) partida por partida, conforme u observada con fotos; no se cierra con partidas sin recibir [rec.]; (b) un acta general con fotos.

- **d18 (cerrada por Diego, a):** la propiedad es la unidad con su rol; el edificio solo agrupa.
- **d19 (cerrada por Diego, a):** proyecto = un encargo con 0 o 1 orden de Odoo; el servicio suelto es un proyecto chico.
- **d20 (cerrada por Diego, b):** se diseña ahora la condición «en administración» (Claude recomendaba esperar al primer caso; ver R14).
- **d21. En una propiedad administrada, ¿quién recibe la plata del arriendo?** (a) Proges la recibe y transfiere al dueño lo que queda, con liquidación mensual [rec.]; (b) el arrendatario paga directo al dueño, Proges controla y cobra su comisión aparte.

De Claude:
- El edificio es un texto, no una tabla: basta para agrupar y buscar.
- No se renombra `ServicioEnCurso` en la base; en pantalla se llama proyecto. Las etapas quedan optativas.
- Una sola clase de línea (`Partida`, con recinto optativo) para reparaciones y servicios sueltos.
- La orden se enlaza confirmando la unidad: la cuenta analítica sola no basta.
- La liquidación se calcula al mirar; solo se guarda lo transferido.
- Lo puntual durante un arriendo (ADMP) es un proyecto más.
- El equipo ve todos los clientes juntos, con un filtro por cliente; ya no elige un cliente activo.
- Al editar, el espacio sale del registro que se toca (la propiedad), nunca de lo que manda el navegador.
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

## 6. Supuestos
- t10. Los maestros son en general los mismos: basta un listado simple.
- t11. Una obra puede tener varios maestros, cada uno con su presupuesto.
- t12. El presupuesto del maestro llega en PDF o por WhatsApp, y alguien del equipo lo copia al portal por partidas.
- t13. Proges le paga al maestro fuera del portal (transferencia); el portal solo registra el pago.
- t14. La cotización al dueño se sigue haciendo en Odoo.
- t15. Las jefaturas son Cecilia y Álvaro.
- t16. El equipo anota desde el celular en terreno.
- t18. El equipo es el único que carga propiedades, contratos y pagos; el dueño no necesita corregir nada él mismo (si d17 a).
- t19. Cada propiedad tiene un solo cliente.
- t20. Toda reparación termina teniendo su orden en Odoo, ordenada por recintos como la S00047, aunque puede llegar después de abrir el proyecto.
- t21. Las líneas «Anticipo» son lo ya facturado al dueño, no trabajo.
- t22. La cuenta analítica (su código es el rol; hay 100, con duplicados como «Jose de Moraleda» y «José de Moraleda 4551») sugiere la propiedad de cada orden, pero puede cubrir varias unidades (Monjitas 550, Valenzuela Puelma): el equipo confirma la unidad al enlazar.
- t24. En una propiedad administrada, el arrendatario le paga a Proges y Proges transfiere al dueño (si d21 a).
- t25. La comisión de administración es un % del arriendo cobrado, fijo por propiedad.
- t26. De la liquidación se descuentan los gastos que Proges pagó por la propiedad ese mes, cada uno con su comprobante.
- t27. Se liquida una vez al mes y el dueño quiere ver el detalle en el portal.
- t28. Lo puntual durante el arriendo se cobra aparte con su orden ADMP.
- t29. Hoy no hay ninguna propiedad administrada: la primera se carga a mano y se revisa con ese caso.
- t23. Los costos de los maestros hoy no están en Odoo (467 facturas de proveedor en borrador, ninguna publicada desde septiembre; la cuenta analítica de José de Moraleda tiene $0 de costo): se registran en el portal.

**Lo que se vio en Odoo (2026-11-19, `scripts/leer-odoo.ts`):** Odoo 19 Enterprise, la API funciona (d13 a). La S00047 trae 14 recintos, 61 líneas, notas por línea y los 3 anticipos con sus facturas. En la app Proyectos intentaron llevar las obras (José de Moraleda: 12 tareas de cotizaciones a maestros, anticipos y saldos; Avenida Portales Oriente: 25 tareas por fase), pero no hay tareas nuevas desde el 2026-08-25. Diego: se dejó porque no supieron acomodar ahí cómo trabajan (ver ADR 0012).
- t17. Un cambio de alcance durante la obra se maneja como presupuesto adicional que se aprueba igual que el original.

## 7. Lo que no debe pasar
- Un dueño ve el costo del maestro, sus pagos o el presupuesto. Cómo: `scripts/probar-obra.ts` recorre lo que entrega `vista-cliente.ts`.
- Un dueño ve una nota no marcada para él. Cómo: la misma prueba.
- Se cierra una obra con partidas sin recibir u observadas. Cómo: prueba de la acción.
- El saldo del maestro está mal. Cómo: `probar-obra.ts` con casos de anticipo, adicional y pago final.
- Alguien sin la marca de jefatura aprueba un presupuesto. Cómo: la acción lo rechaza; prueba.
- Las fotos quedan en una dirección pública. Cómo: revisar cómo se guardan (d12).
- Un cliente ve algo de otro cliente ahora que el equipo lee todos a la vez. Cómo: `probar-espacios.ts` se amplía con `espaciosQueLee()`.
- Una acción del equipo escribe en el cliente equivocado. Cómo: la prueba crea un contrato en una propiedad de A y comprueba que quedó en A.
- Una liquidación no cuadra, o un gasto se descuenta dos veces. Cómo: `scripts/probar-administracion.ts`.
- La migración borra datos. Cómo: leer el SQL: solo crea y agrega.
- Un archivo pasa de 800 líneas. Cómo: `wc -l`.

## 8. Piezas y orden
Olas: [A, W] → [B, C, D, O] → [E, P, V, M] → [F, G]. 12 agentes en Sonnet, uno por pieza (un poco sobre los ~10 de la regla 10: se acepta porque M es independiente y no alarga el camino). Verificación común: `npx tsc --noEmit && npm run lint`; build al final de cada ola.
- ◻️ A. Modelo, archivos y cuentas. `prisma/schema.prisma` y una migración nueva; `src/lib/archivos.ts` (según d12); `src/lib/obra.ts` (cuentas, funciones puras); marca de jefatura en `/equipo`.
- ◻️ W. El equipo en todos los clientes. `src/lib/org.ts` y `src/lib/sesion.ts` (`espaciosQueLee()`, escritura del equipo, el cliente solo mira según d17); quitar el selector de cliente activo; las ~23 pantallas y ~10 archivos de acciones de la cartera; crear propiedad eligiendo el cliente.
- ◻️ B. Menú, inicio, tareas, Mi trabajo y Trabajo del equipo. Depende de A y W.
- ◻️ C. Bitácora con fotos, pensada para el celular. Depende de A.
- ◻️ D. Maestros y presupuestos. Depende de A.
- ◻️ O. Traer la orden de Odoo (`src/lib/odoo.ts`, según d13; parte de `scripts/leer-odoo.ts`): enlazar propiedades con su cuenta analítica; recintos → partidas, anticipos → facturado; volver a traerla sin perder avance. Verifica: la S00047 cuadra 14 recintos y $22.764.048. Depende de A.
- ◻️ E. Avance (por recinto, y por línea si hace falta), pagos y recepción de la obra. Depende de D y O.
- ◻️ V. La página de la venta: resumen arriba, registrar visita en el celular con oferta y tarea de seguimiento (visitas, ofertas y precio ya existen). Depende de B y C.
- ◻️ P. Propiedades del equipo: listado con trabajo en curso e historial de cada propiedad. Depende de B y C.
- ◻️ M. Administración de arriendos: `src/lib/administracion.ts` (liquidación, funciones puras); poner y sacar una propiedad de administración (d21); Liquidaciones del mes con gastos y transferencia; filtro «en administración» en Propiedades; liquidación en la vista del dueño. Verifica: liquidar un mes con un gasto. Depende de A y W.
- ◻️ F. Cierre con plan contra real, vista del dueño y página del servicio reordenada. Depende de C y E.
- ◻️ G. `scripts/probar-obra.ts`, `scripts/probar-administracion.ts` y `probar-espacios.ts` ampliado. Depende de W, E y M.

## 9. Riesgos
- R7. El equipo no anota y vuelve a WhatsApp (p 3, i 3; uso). La nota tiene que ser tan rápida como un mensaje: un campo y las fotos, sin formulario largo. Se prueba en el celular.
- R8. El dueño ve un costo (p 1, i 3; plata). Una sola puerta (`vista-cliente.ts`) y prueba.
- R9. Las fotos quedan públicas (p 2, i 2; datos). d12 y revisión.
- R10. Copiar el presupuesto del maestro por partidas da flojera y se salta (p 2, i 2; uso). Se puede cargar con una sola partida y el PDF; partir en más es opcional.
- R12. Al abrir la lectura a todos los clientes, una pantalla del cliente queda leyendo de más (p 2, i 3; datos). `espaciosQueLee()` devuelve siempre un solo espacio para un cliente; prueba y revisor.
- R14. La administración se diseña sin caso real y no calza con el primero (p 3, i 2; uso). Lo mínimo, supuestos t24–t29 marcados por Diego, y se revisa con la primera propiedad administrada.
- R15. Una liquidación transfiere de más o de menos (p 1, i 3; plata). Función pura con prueba; el portal solo registra la transferencia.
- R11. Las cuentas del saldo fallan (p 1, i 2; plata). Funciones puras con prueba.

## 10. Documentos accesorios y qué queda fuera
- ADR 0012 «La propiedad manda: la unidad, sus proyectos y la administración» (escrito antes de aprobar).
- ADR 0013 «El trabajo del equipo: tareas y bitácora».
- ADR 0014 «Reparaciones: presupuesto del maestro, recepción y plan contra real».
- ADR 0010: se reescribe otra vez (el equipo lee y escribe todos los clientes; el dueño mira y pide).
- ADR 0011: la etapa deja de ser lo principal para el equipo.
- `PENDIENTES.md`: la línea «seguimiento de obra» se reemplaza por lo que quede fuera.
- Fuera: el reporte de venta para el dueño (tarea siguiente); traer la cotización desde Odoo; conectar WhatsApp; IA que pule la bitácora o arma el informe; plantillas de tareas por tipo de servicio (cuando se vea qué se repite); pagar al maestro desde el portal; que el maestro entre al portal; hacer la transferencia al dueño desde el portal; conectar el banco.

## 11. Qué revisar una vez construido
Diego:
- v8. Entra como equipo: el inicio es Mi trabajo y el menú parte por el trabajo.
- v9. En Propiedades, filtra por NPL, crea una propiedad nueva con su servicio y edítala.
- v10. Como jefatura, abre un servicio y anota tres tareas para dos personas: cada una las ve en «Mi trabajo».
- v11. Desde el celular, anota en la bitácora con dos fotos: se ven en el servicio.
- v12. Carga un presupuesto de maestro con tres partidas y su PDF, y apruébalo.
- v13. Registra un adicional y dos pagos: el saldo calza con tu cuenta.
- v14. Recibe dos partidas conformes y una observada: la obra no se deja cerrar y la observada abrió una tarea.
- v15. Cierra la obra: ves lo planificado contra lo real.
- v16. Como dueño, abre la obra: ves el avance y la nota marcada para ti, y ningún monto del maestro.
- v17. Abre un proyecto de toma de posesión sin orden y después enlaza la S00045: la orden se suma con su línea para marcar.
- v18. Enlaza la S00023 de Monjitas 550: el portal pide elegir a cuál de los dos deptos va.
- v19. Pon una propiedad en administración con 8% de comisión, registra el arriendo pagado y un gasto de $50.000: la liquidación cuadra y anotas la transferencia.
- v20. Como dueño, abre esa propiedad: ves la liquidación del mes.
Claude: tipos, lint y build; `npx tsx scripts/probar-obra.ts`; `npx tsx scripts/probar-espacios.ts`; `npx tsx scripts/probar-administracion.ts`; SQL leído; `wc -l`.

## Historia
- v1 y v2: commits `8feafed` a `2a0b1e9`. v3 aprobada y construida el 2026-11-18: commits `740d374` a `a478988`.
- v4 aprobada el 2026-11-18 («ok, con workflow»: d8 a, d9 b todos administran, d10 a, d11 a; el equipo ve la cartera sin editarla; NPL con su propio usuario, a cargo de Proges al principio). Construida, revisada y cerrada: commits `9107728` a `92bcc14`; su cierre es la versión 6 de la página.
- Lo que ya cerró Diego y sigue en pie: Nexxos solo publica; cobrar según cada contrato en espera; DuckDB y dbt con Odoo; el cliente ve las visitas sin los datos del interesado (d2 b); carga inicial de las 42 sin las 20 posiblemente vendidas (d3 b); el cliente ve en vivo (d4 a); etapas propias por tipo de servicio, editables (d5 b); revisión enfocada y completa antes de abrirle el portal al cliente real (d7 a); ningún archivo sobre 800 líneas.
