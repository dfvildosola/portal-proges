# 0014 — Reparaciones: maestros de Odoo, presupuesto, facturas asignadas, recepción y plan contra real

Fecha: 2026-11-19 · Estado: aceptada (plan v6 de la etapa 1; aprobado por Diego)

## Contexto

Las reparaciones y el mantenimiento son lo que más problemas le da a Proges (Diego, 2026-11-19). Funciona así: el dueño aprueba una cotización en Odoo; Proges contrata **maestros** (casi siempre los mismos) que mandan un presupuesto; ese presupuesto se aprueba y es gran parte del costo de Proges; **Proges le paga al maestro y gestiona el trabajo**. Lo que falta es rigurosidad y trazabilidad: durante la gestión, al recibir el trabajo, y después, cuando hay que comparar lo que pasó con lo que se planificó.

Dos cosas del mundo real pesaron en el diseño:

- Odoo ya tiene a los maestros: son **proveedores** (res.partner), y sus cobros entran como **facturas de proveedor**. Hoy casi todas están en borrador y casi ninguna trae la propiedad marcada. En la app Proyectos de Odoo ya se intentó llevar las obras y se abandonó, porque ahí «siempre la propiedad es lo que manda» y Odoo no sabía acomodarse a eso (ADR 0012).
- Diego marcó «no sé» a si las facturas de los maestros terminan entrando a Odoo con su pago registrado (supuesto t30). El diseño tiene que aguantar las dos respuestas.

La imagen que ayuda es **la carpeta de una obra en una constructora**: adentro va el contrato con el cliente (la orden), cada presupuesto de subcontratista firmado, las facturas que llegan, y una hoja de recepción donde el jefe de obra firma partida por partida. El contador sigue llevando los libros (Odoo); la carpeta no los reemplaza, los cruza con la obra.

## Decisión

**1. El maestro es el proveedor de Odoo (d23 a).** Para agregar un maestro se busca entre los proveedores que ya existen en Odoo; el portal guarda su id de Odoo y le suma lo que Odoo no tiene: la **especialidad** (y un teléfono, si hace falta). El nombre se copia de Odoo y se puede refrescar desde ahí. Los maestros viven en el espacio de Proges y valen para todos los clientes. No hay una segunda lista de maestros que mantener.

**2. El presupuesto del maestro se lleva en el portal y lo aprueba la jefatura (d22 a, d14 a).** El equipo carga el presupuesto tal como llega (por PDF o WhatsApp): qué maestro, cuánto cobra, en cuántos días, el PDF, y qué partidas de la orden cubre. No se copia línea por línea. Queda **recibido**; Cecilia o Álvaro (la marca «jefatura» del usuario) lo **aprueban** o lo **rechazan** con un motivo. Un presupuesto aprobado es el plan de costo y de plazo. Un cambio de alcance durante la obra es un presupuesto **adicional**, y se aprueba igual. Un rechazado no se reabre: si el maestro manda uno corregido, se carga uno nuevo.

**3. Las facturas y los pagos se leen de Odoo y se asignan al proyecto (d22 a).** El portal **nunca escribe en Odoo**. Muestra las facturas de proveedor de cada maestro y el equipo **asigna** cada una a un proyecto, indicando cuánto de la factura es de ese proyecto (una factura se puede repartir entre dos obras; la suma asignada **nunca pasa su total**, aunque dos personas asignen a la vez). De lo asignado el portal guarda solo eso, la asignación. El número, la fecha, el total, el estado (borrador, publicada, anulada) y lo pendiente de pago **se leen de Odoo cada vez que se mira**, para que nunca haya dos versiones de lo mismo. El pagado solo cuenta lo que Odoo marca pagado: una factura en borrador no cuenta como pagada, aunque Odoo muestre un saldo.

**4. Las facturas «fuera de Odoo» (t30, «no sé»).** Si una factura o un pago del maestro no está en Odoo, el equipo la anota a mano en el portal: maestro, número (optativo), fecha, monto y si está pagada. La pantalla la marca «Fuera de Odoo» para que no se confunda con una leída de Odoo. Las cuentas de la obra suman las dos clases igual. Es la salida para el caso que Diego no sabe: si todas terminan en Odoo, esta puerta simplemente no se usa.

**5. La recepción es partida por partida, con fotos (d16 a).** Cada línea de la orden (partida) se recibe **conforme** u **observada**. Una observada pide su observación y puede llevar fotos; abre sola una tarea «Corregir: …» para quien deba arreglarla, y vuelve a conforme cuando se corrige. **Una obra no se cierra con partidas pendientes ni observadas**: esto se comprueba en el servidor, no solo en el botón. Cierra la jefatura. Las partidas que Odoo ya no trae (la orden se corrigió) no cuentan.

**6. Las cuentas son funciones puras y se calculan al mirar (`src/lib/obra.ts`).** Aprobado, adicionales, facturado, pagado, saldo, avance ponderado y plan contra real salen de funciones sin base de datos ni Odoo, que reciben datos simples. La pantalla de cuentas, la del cierre y las pruebas usan **la misma** cuenta: un número vive en un solo lugar, y no se guarda un total que se pueda desactualizar.

**7. El cierre muestra lo planificado contra lo real.** Costo (lo aprobado más los adicionales, contra lo facturado por los maestros), plazo (el plazo del presupuesto aprobado, contra los días desde el inicio de la obra hasta hoy o hasta el cierre) y partidas (cuántas quedaron conformes). Un cierre ya hecho se puede volver a mirar en solo lectura.

**8. El dueño ve el avance, no el costo.** En su proyecto ve el avance de la obra por recinto, la recepción de cada partida (recibida, con observaciones, por recibir) y las notas de la bitácora que el equipo marcó «la ve el dueño», con sus fotos. **Nunca** ve presupuestos, facturas, pagos ni nombres de maestros, ni las notas sin marcar, ni las tareas. Todo eso sale de una sola puerta, `src/lib/vista-cliente.ts`, con una lista explícita de columnas: si alguien agrega una columna nueva a la base, no llega al cliente sin que alguien lo decida ahí. El precio de cada partida se usa para ponderar el avance (terminar una partida grande pesa más que una chica), pero no se entrega.

## Alternativas descartadas

- **Todo en el portal** (maestros, facturas y pagos propios). Habría dos contabilidades: la de Odoo, que el contador mantiene igual, y la del portal. Tarde o temprano dirían números distintos. Se descartó para lo que Odoo ya tiene; solo quedan en el portal las facturas que Odoo no tiene (punto 4).
- **Todo en Odoo Proyectos.** Ya se intentó y se dejó: la propiedad no es la unidad de Odoo, y la obra es de la propiedad. Además el equipo trabaja desde el celular en terreno y con fotos.
- **Que el portal escriba en Odoo** (crear facturas, marcar la propiedad en las facturas de los maestros). Más poder, más riesgo, y una llave con permisos de escritura. Por ahora el portal solo lee; las facturas sin propiedad se ordenan en el portal.
- **Copiar el presupuesto del maestro línea por línea.** Es trabajo doble: el maestro ya manda su PDF. Bastan el total, el plazo, el PDF y qué partidas cubre.

## Lo que queda abierto

- **IVA.** Las facturas de Odoo traen el total **con IVA**; el presupuesto del maestro lo escribe una persona, y puede ir con o sin IVA. Si se cargan distinto, el saldo queda desfasado. Hay que decidir con Diego una sola regla y ponerla en el campo «Total».
- **Quién cerró.** El cierre guarda la fecha y la nota, pero no quién lo hizo (no hay campo para eso).
- **Cerrar por otro camino.** Mover el proyecto a una etapa «que cierra el servicio» lo deja terminado sin pasar por la regla de las partidas. Conviene que, en una obra, la etapa de cierre pase por este mismo cierre.

## Lo que queda fuera (y qué lo gatilla)

- **Escribir en Odoo** (crear la factura o marcar la propiedad): cuando se cambie la llave de Odoo por un usuario de solo lectura y se decida qué se escribiría.
- **Pagar al maestro desde el portal** y **que el maestro entre al portal**: cuando el proceso actual (Proges paga fuera del portal) deje de alcanzar.
- **Plantillas de tareas por tipo de obra:** cuando se vea qué tareas se repiten en las primeras obras.
- **Reporte de obra para el dueño armado solo** (resumen o IA): hoy el dueño lee las notas marcadas y el avance.
