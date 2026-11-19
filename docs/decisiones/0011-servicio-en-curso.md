# 0011 — El servicio en curso como unidad

Fecha: 2026-11-18 · Estado: aceptada (plan v3 de la etapa 1; la solicitud se suma en la v4, aprobada por Diego el mismo día)

> **Nota de la v6 (2026-11-19).** Para el **equipo**, la etapa deja de ser lo principal de la página del proyecto: lo que manda ahora son las **tareas** y la **bitácora** (ADR 0013), y en una obra, la orden, los presupuestos y la recepción (ADR 0014). La etapa y el historial siguen existiendo, pero van al final de la pantalla. Y el proyecto puede **nacer «por revisar»**: cuando un cliente pide un servicio, se abre solo, con una tarea para la jefatura, y la «bandeja de solicitudes» descrita más abajo pasa a ser la lista de proyectos por revisar. En pantalla, el servicio en curso se llama «proyecto» (ADR 0012).

## Contexto

Proges no hace un recorrido fijo con cada propiedad. Una propiedad usa solo los servicios que necesita: a veces solo papeles, a veces solo la toma de posesión, a veces venta, arriendo, o las dos a la vez. La v2 del plan suponía una sola etapa por propiedad que avanzaba en fila (evaluación → reparación → venta); Diego lo corrigió: no hay etapas consecutivas.

Lo que sí se repite es el **servicio**: el equipo vende uno del catálogo (el mismo de la Sheet y de Odoo: ET, IRP, NV, RR, ADMP, SC) y lo lleva de principio a fin.

## Decisión

**La unidad es el servicio en curso (`ServicioEnCurso`).** Una propiedad tiene varios abiertos a la vez, y cada uno avanza por las etapas de su tipo sin depender de los otros. Al abrirlo se elige el tipo, el código del catálogo y el responsable.

**Seis tipos fijos en el código, etapas editables en el portal** (decisión d5 b):
- Los tipos (Evaluación, Inspección y toma de posesión, Venta, Arriendo, Obra, Administración) están en `src/lib/servicios.ts`, con las familias del catálogo que ofrece cada uno. Un tipo nuevo cambia pantallas e indicadores, así que pasa por código.
- Las etapas son filas de la tabla `Etapa`, que el admin edita en `/equipo/etapas`: agregar, renombrar, reordenar, desactivar. Claude propuso las iniciales; el equipo las ajusta con el uso.
- Cada etapa lleva dos marcas: **cierra el servicio** y **propiedad publicada**. Los indicadores leen las marcas, nunca el nombre: renombrar «Publicada» no rompe los días publicada.
- Una etapa con servicios o historial no se borra: se desactiva.

**El historial son eventos (`Evento`).** Cada cambio de etapa y de precio es una fila con fecha, autor, valor anterior y nuevo. El nombre de la etapa se guarda como texto tal como era ese día: renombrarla después no cambia el pasado. Es como un libro de actas: no se corrige lo escrito, se agrega una línea.

**Cancelar es una salida, no una etapa.** Cualquier servicio se puede cancelar con un motivo obligatorio. Llegar a una etapa marcada «cierra el servicio» lo deja terminado.

**La etapa la mueve una persona.** El portal no la cambia solo, ni siquiera cuando se acepta una oferta.

**El servicio nace de una solicitud del cliente** (v4). Hoy un dueño no le pide servicios a Proges por ningún canal; la idea es que empiece a pasar por el portal. El cliente pide desde la ficha de una propiedad suya: el tipo y qué necesita, en sus palabras, sin precio (se cotiza después, fuera del portal). La solicitud queda **nueva** en la bandeja de «Operación», y el menú del equipo muestra cuántas hay (decisión d8 a: sin correo ni IA por ahora). Es como el buzón de pedidos de un taller: el pedido no se pierde, espera ahí hasta que alguien lo toma. El equipo la **acepta** eligiendo el código del catálogo y el responsable, y en ese momento se abre el servicio en su primera etapa, enlazado a la solicitud. O la **rechaza** con un motivo que el cliente lee. Dos personas no pueden resolver la misma solicitud: la segunda recibe «Otra persona ya la resolvió». El equipo también puede abrir un servicio directo, sin solicitud (por ejemplo, lo que NPL pide en una reunión).

**Catálogo y etapas son de Proges**: viven en el espacio `org_proges` y valen para todos los clientes. Los servicios en curso, en cambio, viven en el espacio del cliente dueño de la propiedad (ADR 0010).

**Venta y arriendo son servicios con más datos** (tipos VENTA y ARRIENDO): precio vigente con su moneda y su historial, quién lo fijó (el propietario o sugerido por Proges), visitas con evaluación, ofertas con su estado, recomendación al propietario y el enlace del aviso.

**Los indicadores se calculan al mirar** (días publicada, visitas de la semana, visitas por semana, días desde la última rebaja), en `src/lib/servicios.ts`, y los usan la vista del equipo y la del cliente de cada servicio. Un número vive en un solo lugar. No se guardan.

**Nexxos solo publica los avisos.** Toda la gestión (visitas, ofertas, precio) se registra en el portal; del aviso se guarda solo el enlace.

**La carga inicial deduce servicios desde el Drive**, marcados «por confirmar»: el equipo los revisa en «Operación» antes de que el cliente los vea.

## Alternativas descartadas

- **Una etapa por propiedad, en fila** (v2). No calza con cómo trabaja Proges: una propiedad puede estar en venta y en arriendo a la vez, o necesitar solo un servicio.
- **Etapas fijas en el código.** Cada ajuste del equipo habría pedido un cambio de código.
- **Una tabla aparte para la gestión comercial.** Venta y arriendo ya son servicios; separarlos duplicaba el historial y la responsabilidad.

## Lo que queda fuera (y qué lo gatilla)

- **Seguimiento de la obra** (tareas, hitos, avance en %): cuelga del servicio OBRA. Es la tarea siguiente, pedida por Diego el 2026-11-18 (ver `PENDIENTES.md`).
- **DuckDB y dbt:** cuando entre Odoo.
- **IA que dimensiona un pedido** (hace preguntas de vuelta según el tipo): cuando haya solicitudes reales de donde aprender qué información falta.
- **Correo a Cecilia y Leo por cada solicitud:** si la bandeja no basta y los pedidos esperan.
- **Pedir un servicio para una propiedad que todavía no está cargada:** por ahora el cliente primero la crea.
- **Costos y resultado por propiedad:** cuando la obra y los cobros pasen por el portal.
- **Correo semanal al cliente:** si el panel en vivo no reemplaza al Word.
- **Tipos de servicio creados desde el portal:** si aparece un servicio que no calza en los seis.
