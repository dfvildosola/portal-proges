# 0013 — El trabajo del equipo: tareas, bitácora y el pedido que abre el proyecto

Fecha: 2026-11-19 · Estado: aceptada (plan v6 de la etapa 1; aprobado por Diego)

## Contexto

Diego lo dijo al ver la primera versión: el portal de Proges «no está enfocado en la gestión ni desarrollo de las actividades o tareas que ellos tienen a partir de los servicios ofrecidos». La versión anterior anotaba **en qué etapa va** cada servicio (un marcador), pero no ayudaba a **hacer el trabajo**.

Así se trabaja hoy: un servicio nuevo lo toma Cecilia o Álvaro y ellos reparten quién hace qué. Las tareas están en la cabeza de cada uno y en WhatsApp. Al terminar, alguien las vacía en un Word. No queda registro, y las jefaturas no pueden seguirlas.

La imagen que ayuda es **la pizarra del taller**: una pizarra grande donde cada trabajo tiene sus tareas pegadas, con el nombre de quien las lleva y para cuándo. Cada mecánico mira lo suyo; el jefe mira toda la pizarra y ve de un vistazo quién va atrasado y qué trabajo no tiene a nadie. Y cuando entra un pedido nuevo por la ventanilla, alguien lo pega en la pizarra al tiro, sin esperar a que el jefe lo copie.

## Decisión

**1. La tarea es lo mínimo.** Una tarea tiene: qué hay que hacer, quién (opcional), para cuándo (opcional) y si ya está hecha. Nada más. Sin estados intermedios («en curso», «bloqueada») ni dependencias entre tareas («esta no parte hasta que termine aquella»). Cualquiera del equipo anota y marca tareas; la jefatura reparte, pero el portal no le bloquea nada a nadie. Una tarea hecha se puede deshacer; solo se borra una sin hacer, porque lo hecho es historia del proyecto.

**2. «Mi trabajo» es el inicio del equipo.** Cada persona entra y ve **lo suyo**: las tareas atrasadas arriba (en rojo), las de esta semana, las de más adelante, y al final lo que terminó en los últimos 7 días. Cada tarea enlaza a su propiedad, su cliente y su proyecto, y tiene el botón «Hecha» a mano. Está pensada para el celular: es la lista que se mira parado en la puerta de la propiedad.

**3. «Trabajo del equipo» es la pizarra completa.** Reemplaza a la pantalla «Operación». Arriba, los proyectos **por revisar** (ver el punto 5). Debajo, las tareas de todos **por persona** (atrasadas y de la semana), con filtro por cliente y por persona, y la lista de las que **no tienen responsable**. Las cifras de antes (servicios por tipo y etapa, visitas de la semana) siguen, pero **plegadas al final**: ya no son lo principal. «Atrasada» y «esta semana» se calculan igual que en Pendientes (de hoy a 7 días).

**3b. Las tareas salen de los espacios que el equipo puede leer.** Una tarea cuelga de un proyecto, y el proyecto del espacio del cliente dueño de la propiedad (ADR 0010). Una tarea de un proyecto ya cancelado o terminado no cuenta como trabajo pendiente.

**4. La bitácora reemplaza el Word final.** Mientras se trabaja, cada uno anota en el proyecto lo que pasa, con fotos, en el momento. Al terminar no hay nada que vaciar: el informe para el dueño se lee de ahí (solo las notas que el equipo marca «la ve el dueño», ADR 0010). La bitácora y sus fotos son de otra pieza (ADR 0015 para las fotos).

**5. El pedido del cliente abre el proyecto solo (d26).** Cuando un cliente pide un servicio desde su portal, en **una sola transacción** (o quedan todas las filas, o ninguna) el portal:

- anota la **Solicitud** (el pedido, tal como el cliente lo escribió);
- si el cliente pidió para una **propiedad nueva**, la crea en su espacio (dirección, comuna y tipo; la región es opcional y queda «Por confirmar» como en la carga inicial);
- abre el **proyecto** en la propiedad, marcado «por revisar», con el primer servicio activo del catálogo de ese tipo y la primera etapa del tipo, y su primer Evento «Pedido por el cliente»;
- deja una **tarea «Revisar y repartir: <lo pedido>»**, sin responsable, para la jefatura.

Después, la jefatura en «Trabajo del equipo» pulsa **Revisar**: confirma el servicio del catálogo, elige quién lo lleva y deja una nota. Eso saca el proyecto de «por revisar», deja la Solicitud como ACEPTADA y marca hecha la tarea de revisión. O pulsa **Rechazar** con un motivo: el proyecto queda cancelado con ese motivo, la Solicitud RECHAZADA y la tarea hecha; el cliente ve el motivo en «Mis servicios». Dos personas que revisen a la vez no se pisan: la primera «reclama» el proyecto y la segunda recibe «Otra persona ya lo revisó». Un doble clic en «Enviar pedido» tampoco abre dos proyectos.

El cliente ve su pedido en «Mis servicios» como **«Por revisar»: Proges lo está revisando**, hasta que la jefatura lo reparte.

**6. El menú parte por el trabajo.** Para el equipo: **Trabajo** (Mi trabajo, Trabajo del equipo con el número de proyectos por revisar) · **Propiedades** (Propiedades, Dueños, Contactos, Resumen) · **Administración de arriendos** (En administración, Contratos, Cobranza, Cuentas, Pendientes) · **Configuración** (Maestros, y para el admin: Equipo y clientes, Etapas). El dueño (cliente) mantiene su menú de siempre.

## Alternativas descartadas

- **Estados de tarea** («por hacer / en curso / bloqueada / lista»). Parece más completo, pero cada estado es algo que alguien tiene que acordarse de mover; justo lo que hoy no ocurre. Con «hecha o no» se usa. Si en dos semanas de uso aparece un caso real que lo pide, se agrega entonces.
- **Dependencias entre tareas.** Sirven en una obra grande con muchos oficios, y Proges hoy no trabaja así. Sería diseñar la etapa siguiente antes de usar esta.
- **Mantener la bandeja de solicitudes de antes.** Era una lista de pedidos **aparte** de los proyectos: al aceptar uno se abría el servicio, y hasta entonces el pedido no existía en el trabajo del equipo. Dos listas que sincronizar y un paso más que alguien olvida. Con el proyecto «por revisar», el pedido ya está en la pizarra desde el primer minuto, y la bandeja pasa a ser solo la lista de lo que está por revisar.
- **Que el cliente elija el servicio del catálogo al pedir.** El catálogo tiene códigos y nombres internos que el cliente no conoce; por eso pide por **tipo** (venta, obra, inspección…) y la jefatura confirma el servicio al revisar.

## Consecuencias

- **El proyecto existe desde el pedido.** Aparece en la ficha de la propiedad del equipo y cuenta en las listas, marcado «por revisar». En «Trabajo del equipo» se separan: los por revisar arriba, y lo ya repartido en las cifras plegadas. El cliente no ve el proyecto «por revisar» entre sus servicios en curso: lo ve como pedido.
- **La tarea «Revisar y repartir» se reconoce por su texto** (empieza con «Revisar y repartir»), porque la tarea no tiene un campo de «tipo». Funciona porque la crea siempre el mismo código y es lo único que lo hace. Si algún día hace falta distinguir más clases de tarea, ahí se agrega un campo.
- **El pedido de antes, sin proyecto, queda fuera.** Las solicitudes NUEVA anteriores a este cambio (que todavía no abrieron un proyecto) no aparecen en «Por revisar»: no hay proyecto que revisar. Esta etapa todavía no está en producción, y las que hay en la base de desarrollo son datos de prueba.
- **El cliente puede crear propiedades al pedir.** Es consecuencia de que el dueño edita su cartera (ADR 0010). Si ya existe una propiedad con esa dirección y comuna en su cartera, el portal le pide elegirla de la lista en vez de duplicarla.
- **Las tareas no avisan por correo ni WhatsApp.** Se ven al entrar. Conectar avisos es otra herramienta y otro costo; queda fuera de la etapa.
