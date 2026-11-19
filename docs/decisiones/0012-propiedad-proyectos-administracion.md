# 0012 — La propiedad manda: la unidad, sus proyectos y la administración

Fecha: 2026-11-19 · Estado: aceptada por Diego (d18 a, d19 a, d20 b, en la página https://claude.ai/artifact/9J7VHc187CPiRg1D8UznrN). Entra al plan v5 de la etapa 1, que todavía espera su aprobación. La d21 y los supuestos t24 a t29 se cierran en esa aprobación.

## Contexto

Proges dejó de usar la app Proyectos de Odoo porque no supo acomodar ahí su forma de trabajar. Diego lo explicó así (2026-11-19): la propiedad es lo que manda, y de ella cuelgan distintos proyectos o servicios. Un proyecto es un conjunto de cosas por hacer, como una reparación o un saneamiento documental, pero también pueden pedir solo un par de servicios sueltos. Y las propiedades cuyo arriendo administra Proges quizás debían clasificarse de otra forma.

Lo que muestran las 67 órdenes confirmadas en Odoo (leídas con `scripts/leer-odoo.ts`):

- **45 propiedades**, muchas con 2 a 4 órdenes en el tiempo. El recorrido típico es una toma de posesión y, al mes siguiente, la reparación: José de Moraleda (S00045 → S00047) y Calle 5 Oriente en Talca (S00036 → S00038).
- **37 órdenes tienen una sola línea** (toma de posesión, acercamiento comercial, comisión de corretaje). Las 3 reparaciones grandes suman $34,4 millones, un tercio del total.
- La propiedad está en la **cuenta analítica** de la orden, y su código es el rol del SII. Pero **una cuenta puede cubrir varias unidades**. Monjitas 550 tiene la S00023 y la S00024, iguales, para dos deptos. Valenzuela Puelma tiene dos órdenes de dos dueños distintos bajo la misma cuenta. Toesca 2576, en cambio, tiene una cuenta por depto, con duplicados.
- El trabajo durante un arriendo (desalojo, renovación de contrato, reparación correctiva: familia ADMP) se vende en **órdenes sueltas**. No hay suscripciones.
- Hoy Proges no administra el arriendo de ninguna propiedad (Diego, 2026-11-19).

## Decisión

Para pensarlo sirve una clínica. La propiedad es el paciente: tiene su ficha y su historia. Cada proyecto es un tratamiento, que empieza y termina. Un servicio suelto es una consulta. La administración de un arriendo es un control crónico: todos los meses, sin fecha de término.

**1. La propiedad es la unidad, con su rol (d18 a).** Un depto, una casa o una oficina, con su dueño. El edificio no es una tabla: es un texto en la propiedad que agrupa las unidades para buscarlas juntas. La propiedad guarda el número de su cuenta analítica de Odoo, que puede repetirse en varias unidades.

**2. Un proyecto es un encargo, con 0 o 1 orden de Odoo (d19 a).** Es el `ServicioEnCurso` de hoy: la tabla no se renombra, pero en pantalla se llama proyecto. Su tipo sigue saliendo del catálogo y las etapas quedan como optativas.
- **Puede abrirse antes de que exista la orden** (Diego, 2026-11-19): llega el pedido, se va a ver y recién después se cotiza. El proyecto parte «por cotizar» y la orden se enlaza cuando existe.
- **Al enlazar, la cuenta analítica sugiere la unidad y el equipo la confirma**, porque una cuenta puede cubrir dos deptos.
- **Las líneas de la orden son lo que hay que hacer.** En una reparación se agrupan por recinto, con maestro, avance y recepción. En un servicio suelto son una o dos casillas para marcar. Las dos son la misma clase de línea (con recinto o sin él), así que hay una sola pantalla. El avance del proyecto sale de las líneas hechas.
- **La venta o el arriendo por corretaje** es un proyecto que además lleva visitas, ofertas y precio, como ya existe.

**3. La administración de un arriendo es una condición de la propiedad, no un proyecto (d20 b: se diseña ahora).** Guarda desde cuándo, la comisión y quién recibe la plata del arriendo (d21). De ella cuelgan el contrato y la cobranza, que ya existen. Cada mes hay una **liquidación**: el arriendo cobrado, menos la comisión, menos los gastos que Proges pagó por la propiedad, es lo que se transfiere al dueño. La liquidación se calcula al mirar (`src/lib/administracion.ts`, función pura con prueba). Solo se guardan la transferencia y su fecha, para que ningún total se descuadre. El dueño ve su liquidación. Lo puntual durante el arriendo, como un desalojo o una reparación correctiva, es un proyecto más, con su orden ADMP.

## Alternativas descartadas

- **El edificio como propiedad, con las unidades dentro (d18 b).** Calza con algunas cuentas de Odoo, pero el dueño cambia por unidad (Valenzuela Puelma) y la historia de un depto no es la del otro.
- **Un proyecto que junta varias órdenes (d19 b).** Es más flexible, pero cuesta saber cuándo termina, y la toma de posesión y la reparación ya llegan como órdenes separadas.
- **El arriendo administrado como un proyecto.** Un proyecto termina y este no.
- **Esperar al primer caso real para diseñar la administración**, como pide la regla 8. Claude lo recomendaba; Diego eligió diseñarla ahora. Para que el riesgo sea chico, se construye lo mínimo, se dejan escritos los supuestos t24 a t29 para que él los marque, y se revisa con la primera propiedad administrada antes de sumarle nada (riesgo R14 del plan).
- **Renombrar `ServicioEnCurso` en la base.** Tocaba todo lo que ya funciona sin cambiar lo que hace.

## Lo que queda fuera (y qué lo gatilla)

- **Hacer la transferencia al dueño desde el portal:** el portal solo la registra. Se revisa cuando las transferencias a mano tomen varias horas al mes.
- **Conectar el banco para ver los pagos del arrendatario:** cuando haya varias propiedades administradas y anotar los pagos a mano canse.
- **Una tabla de edificios** (con datos propios, como administración o gastos comunes): cuando un dato sea del edificio y no de cada unidad.
- **Ordenar las cuentas analíticas en Odoo** (duplicados de Toesca 2576, de José de Moraleda y de Canto General): es trabajo en Odoo, no del portal. Se le dijo a Diego.
