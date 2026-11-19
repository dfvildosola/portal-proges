# 0011 — El servicio en curso como unidad

Fecha: 2026-11-18 · Estado: aceptada (plan v3 de la etapa 1, aprobado por Diego)

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

**Venta y arriendo son servicios con más datos** (tipos VENTA y ARRIENDO): precio vigente con su moneda y su historial, quién lo fijó (el propietario o sugerido por Proges), visitas con evaluación, ofertas con su estado, recomendación al propietario y el enlace del aviso.

**Los indicadores se calculan al mirar** (días publicada, visitas de la semana, visitas por semana, días desde la última rebaja), en `src/lib/servicios.ts`, y los usan la ficha del equipo y el panel del cliente. Un número vive en un solo lugar. No se guardan.

**Nexxos solo publica los avisos.** Toda la gestión (visitas, ofertas, precio) se registra en el portal; del aviso se guarda solo el enlace.

**La carga inicial deduce servicios desde el Drive**, marcados «por confirmar»: el equipo los revisa en «Operación» antes de que el cliente los vea.

## Alternativas descartadas

- **Una etapa por propiedad, en fila** (v2). No calza con cómo trabaja Proges: una propiedad puede estar en venta y en arriendo a la vez, o necesitar solo un servicio.
- **Etapas fijas en el código.** Cada ajuste del equipo habría pedido un cambio de código.
- **Una tabla aparte para la gestión comercial.** Venta y arriendo ya son servicios; separarlos duplicaba el historial y la responsabilidad.

## Lo que queda fuera (y qué lo gatilla)

- **Seguimiento de la obra** (tareas, hitos, avance en %): cuelga del servicio OBRA. Es la tarea siguiente, pedida por Diego el 2026-11-18 (ver `PENDIENTES.md`).
- **DuckDB y dbt:** cuando entre Odoo.
- **Pedir un servicio desde el panel del cliente:** cuando el cliente lo pida.
- **Costos y resultado por propiedad:** cuando la obra y los cobros pasen por el portal.
- **Correo semanal al cliente:** si el panel en vivo no reemplaza al Word.
- **Tipos de servicio creados desde el portal:** si aparece un servicio que no calza en los seis.
