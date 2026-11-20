# 0017 — El portal v7: lo que ve y hace cada uno

Fecha: 2026-11-19 · Estado: aceptada (plan v7, d5 a d9; aprobado por Diego). Amplía los ADR 0010 (quién ve qué), 0011 (servicio en curso), 0013 (trabajo del equipo) y 0015 (fotos en Drive).

## Contexto

Diego lo dijo así el 2026-11-19: los servicios de Proges son difíciles de vender solos; lo que se vende es **el portal**. Hay dos tipos de dueño:

- **El cliente grande atendido** (NPL, y dos o tres más que vienen): Proges le lleva todo y él sigue el avance.
- **El dueño autónomo**: registra sus propiedades, lleva su cartera y le pide servicios a Proges cuando los necesita.

El equipo, mientras tanto, trabaja casi todo en terreno: abre el celular, ve su día y anota con foto. La jefatura mira desde el computador.

## Decisión

**Un portal, tres miradas** (la maqueta aprobada es `docs/maqueta-v7.html`):

- **«Hoy» y «Anotar» en el celular**, para el equipo en terreno.
- **El tablero de servicios, el Inicio y Repartir en el computador**, para la jefatura.
- **La ficha de la propiedad como ficha clínica**: datos, historial, reparaciones con lo que se pagó, documentos y vencimientos.

**Lo que Proges hace en una propiedad se llama «servicio» (d6 a).** En la base sigue siendo `ServicioEnCurso`.

**«Esperando a…» reemplaza a las etapas.** Las etapas de la v4 decían en qué paso iba cada servicio, y el equipo no las mantenía al día. Lo que de verdad importa es **quién tiene la pelota**: nosotros, o alguien de afuera (conservador, notaría, municipalidad, maestro, dueño, banco u otro). Cada servicio abierto cae en una de cuatro columnas:

- nuevo, por revisar;
- nos toca;
- esperando a otro;
- por entregar.

Cada cambio de espera deja un evento `ESPERA`, que guarda a quién se esperaba antes y a quién ahora; cuando ya no se espera a nadie, guarda `NOS_TOCA`. Con esos eventos, Resultados calcula cuántos días se trabajó y cuántos se esperó a otros. Pasados 10 días de espera, el servicio aparece en «Trabado» del Inicio.

**El dueño autónomo entra en esta tarea, por invitación (d5 a).** Tiene sus pantallas y su cartera: arriendos, gastos, contribuciones, documentos y vencimientos. Cada vencimiento trae un botón «que Proges lo haga». No hay registro abierto ni plan gratuito: esos alcances quedan para después. El cliente se marca con su modo (`ATENDIDO` o `AUTONOMO`), y por ahora los dos pueden hacer lo mismo con su cartera; solo cambia la pantalla de inicio.

**Las cifras de Nexxos se anotan a mano, una vez por semana (d7 a).** Nexxos es donde se publican los avisos, y no tiene una conexión que el portal pueda usar. Cada lunes, el corredor anota en la ficha de venta las vistas y consultas de cada anuncio; la semana se identifica por su lunes. Con eso el dueño ve cómo va su venta sin pedir un informe.

**El dueño responde las ofertas en el portal (d8 a).** El corredor le muestra una oferta con la recomendación de Proges. El dueño acepta, contraoferta (con monto) o rechaza, y al corredor le llega una tarea: «comunicar la respuesta del dueño al oferente». Una oferta que no se le ha mostrado no se puede responder, y el dueño solo ve las que ya se le mostraron.

**Lo que sale hacia un dueño o una llave va siempre recortado.** Nunca lleva:

- costos del maestro, presupuestos, facturas ni márgenes;
- notas que no estén marcadas «la ve el dueño»;
- nombres ni contacto de los interesados;
- datos de otro cliente.

El recorte se arma campo por campo, en una función del dominio de cada área, y las pruebas lo comprueban con dos clientes y una llave.

**Los PDF van al Drive de la propiedad, igual que las fotos** (decisión de Diego del 2026-11-19, que extiende el ADR 0015). Hasta la v6, los documentos de la propiedad iban a Vercel Blob. Ahora van a la misma subcarpeta «Portal» del Drive de cada propiedad, sin enlaces públicos, y la API los entrega revisando el permiso. Así hay un solo lugar para los archivos y no se agrega ninguna librería. Si la propiedad no tiene su carpeta enlazada, primero se enlaza.

**Diego revisa al terminar el portal del equipo, y otra vez al final (d9 a).** Las etapas 1 (la API) y 2 (el portal del equipo) se construyen seguidas; la 3 es el portal del dueño y la API para terceros.

## Alternativas descartadas

- **Mantener las etapas por tipo de servicio.** Decían el paso, pero no quién frenaba ni desde cuándo, que es lo que la jefatura pregunta cada mañana.
- **«Proyecto» o «encargo» en vez de «servicio» (d6 b, c).** «Proyecto» suena raro para un trámite; «encargo» es claro, pero nadie lo usa hoy.
- **Dejar los anuncios fuera (d7 b).** El dueño perdería la parte del reporte de venta que más pregunta.
- **Que Proges anote la respuesta del dueño (d8 b).** Funciona, pero el dueño no ve sus ofertas ni queda registro de que respondió él.
- **Los documentos en Vercel Blob.** Habría sido una bodega aparte, con enlaces públicos aunque imposibles de adivinar, y el plan pide que ningún archivo tenga enlace público.
