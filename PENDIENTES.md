# Pendientes — Proges

- **Producción es pública: falta el login.** Desde el 2026-10-02, `proges.vercel.app` funciona con su base (ADR 0005), pero no hay login: no hay middleware ni Clerk en el código, y `getOrgId()` (`src/lib/org.ts`) devuelve siempre `org_proges`. Cualquiera con la dirección puede ver, crear y borrar datos. **No cargar datos reales en producción hasta tener login.** Las llaves de Clerk ya están en Vercel. Mientras tanto, una opción rápida es activar la protección de Vercel (Deployment Protection) también para producción. 2026-10-02.
- **Tema:** decidir si montos, ROL y fechas pasan a JetBrains Mono, como pide el sistema de diseño. Quedó fuera del cambio de tema.
- **Subir documentos no funciona en local: `BLOB_READ_WRITE_TOKEN` está vacío en `.env`.** Toda subida responde «Error al subir el archivo…» antes de llegar a Vercel; en la etapa 3 de la ficha (papeles) el flujo se probó hasta ese paso, pero no la escritura del documento. Decidir antes de cargar el token:
  - un almacén de Vercel Blob aparte para desarrollo, para que ni `npm run dev` ni los espacios (que copian el `.env` del original) escriban en el de producción;
  - si los documentos pasan a almacenamiento **privado**: hoy se suben con `access: "public"`, así que una escritura o un certificado quedan en una URL pública, difícil de adivinar pero sin protección. Vercel Blob ya ofrece almacenamiento privado.
  2026-10-01.
- **Migraciones de producción a mano.** Subir a `main` publica en Vercel, pero las migraciones se aplican aparte (`AGENTS.md`, ADR 0005). Si alguien sube sin migrar, producción falla hasta que se migre. Decidir si el build de Vercel corre `prisma migrate deploy` solo, para lo que necesita la dirección directa de Neon como variable aparte. 2026-10-02.
- **Borrar el contenedor viejo de Docker** (`proges-db-prueba` y su volumen `proges_proges-pgdata`) y el respaldo `.env.respaldo-docker` cuando la base `proges_dev` del Mac lleve un tiempo funcionando bien. Hoy el contenedor está apagado, no borrado. 2026-10-01.
- **Cuentas pagadas no llegan a la rentabilidad.** Marcar pagada una `PropertyBill` no crea un `Movement` (gasto), así que ese gasto no aparece en la rentabilidad de la propiedad. Resolver cuando el flujo lleve un tiempo en uso real. 2026-10-01.
- **Cuentas: quién paga cada una.** En una propiedad arrendada, unas cuentas las paga el arrendatario (el dueño solo vigila que estén al día) y otras el dueño (son costo). Hoy todas se tratan igual. Primero preguntarle a Diego cómo se hace hoy (regla 8): quién las paga y quién revisa. Va antes que la línea anterior, porque solo las que paga el dueño deberían pasar a gasto. 2026-10-04.
- **Cobranza, lo que sigue.** Salió de la revisión del 2026-10-04 y espera respuestas de Diego (¿cómo se entera el dueño de que le pagaron: cartola, aviso de transferencia, comprobante? ¿cada sociedad cobra en su propia cuenta bancaria?):
  - deuda acumulada por arrendatario;
  - registrar el pago desde la lista, sin abrir cada cobro;
  - totales del mes: esperado, cobrado y falta, en pesos (la UF convertida);
  - cuadrar contra la cartola del banco.
  2026-10-04.
- **Abonos que cruzan de mes se cuentan dos veces en el ingreso.** Un cobro guarda un solo total pagado y la fecha del último abono, así que si se abona una parte en septiembre y el resto en octubre, Inicio y el Resumen cuentan lo de septiembre otra vez en octubre (ADR 0006, consecuencias). Si pasa seguido, pasar a una tabla de abonos (un pago por fila, con su fecha). 2026-10-05.
- **La agenda se calcula entera en cada página.** El menú muestra el contador de Pendientes, así que cada página (incluidas Contratos y Cuentas) calcula la agenda de toda la cartera: unas 8 consultas que traen todas las propiedades con sus contratos y documentos. La ficha también la calcula entera para mostrar solo sus ítems. Con 80 propiedades no se nota. Si la app se pone lenta con carteras grandes, darle al contador una consulta más liviana y filtrar la agenda por propiedad en la base. De paso: Inicio pide la última UF dos veces (la agenda ya la trae) y la agenda carga los contratos dos veces. 2026-10-05.
- **Filtro por dueño o sociedad, y por objetivo, en todos los paneles.** Un inversionista con varias sociedades u objetivos distintos (renta, plusvalía) quiere mirar cada grupo por separado. 2026-10-04.
- **Inicio como tablero.** Que responda de un vistazo cuatro preguntas: ¿me pagaron?, ¿pagué lo mío?, ¿qué se viene?, ¿qué me cuesta plata? Hoy Inicio ya muestra lo urgente de la agenda (ADR 0008). 2026-10-04.
- **Correo semanal con los pendientes.** Pregunta abierta para Diego: ¿basta con la pantalla o quiere el correo? Necesita un servicio de correo y una tarea programada, piezas nuevas que se deciden antes (regla de código 3). 2026-10-04.
- **`Field` copiado 6 veces.** El envoltorio etiqueta + campo + error está repetido en `property-form.tsx`, `property-form-economic.tsx`, `[id]/economic-forms.tsx`, `pay-form`, `tenant-form` y `contract-form`. Sacarlo a `src/components/` y que todos lo importen (regla de tres). 2026-10-01.
- **`catch` que esconden la causa.** `addTax` (`finance-actions.ts`) y `addAssessment` (`facts-actions.ts`) responden «Ya existe…» ante cualquier error, aunque sea otro. `deleteDocument` (`documents-actions.ts`) ignora en silencio si falla el borrado del archivo en Vercel Blob. Revisar el código del error (`P2002` para duplicado) y avisar el resto (regla de código 5). 2026-10-01.
- **Los cuadros de agregar se vacían cuando hay un error.** React 19 limpia el formulario cada vez que corre la acción, haya salido bien o no, así que tras «Revisa los campos.» hay que volver a escribir todo. Ya pasaba con los formularios en línea. En **editar propiedad** (`property-form.tsx`) duele más: una fecha mal puesta borra lo escrito en compra y deuda, y los campos vuelven a los valores guardados. Arreglarlo devolviendo lo escrito en el estado y usándolo como `defaultValue`. 2026-10-01.
- **Selectores que muestran el valor interno** (`PERSONA`, `GASTO_COMUN`…) en vez de la etiqueta: les falta `items={…Labels}` en el `<Select>`, como ya se hizo en la ficha. Quedan `propiedades/[id]/economic-forms.tsx` y `duenos/forms.tsx`. 2026-10-01.
- **Contribuciones: «Marcar pagada» no propone la fecha de hoy** (pestaña Finanzas de la ficha), como ya hacen cuentas y cobros. 2026-10-04.
- **Al terminar un contrato, la propiedad sigue «Arrendada».** «Terminar» guarda la fecha de salida, pero no cambia el estado de la propiedad: la ficha avisa «Arrendada sin contrato» hasta que se cambie a mano. Preguntarle a Diego si «Terminar» debería ofrecer marcarla desocupada (o en venta, o uso propio) en el mismo paso. 2026-10-04.
- **Pendientes: que cada uno lo organice a su conveniencia.** Pedido de Diego al revisar la página en local (2026-10-05). Tarea mediana: plan y aprobación antes de construir. Hacerla en el original, en una branch nueva, después de mezclar `contratos-cobranza`. Ya decidido:
  - **Buscador** por texto: propiedad, arrendatario, tipo y descripción. Las secciones sin coincidencias se esconden.
  - **Ordenar las líneas** por monto (lo de hoy, «la plata primero»), fecha, propiedad o tipo. Un solo criterio para todas las secciones.
  - **Secciones** (Atrasado, Esta semana, Este mes, Próximos meses) que se pueden **colapsar** (todas parten abiertas) y **reordenar arrastrándolas**, con la librería **dnd-kit**: funciona con mouse, en el celular y con teclado. Diego la aprobó el 2026-10-05 (regla de código 3).
  - Lo organizado se **recuerda en el navegador** (`localStorage`): cada equipo tiene su orden. No va en la base, porque sin login sería un solo orden compartido por todos.
  2026-10-05.
- **Pendientes: «Posponer» un ítem** («recuérdamelo en una semana»). La agenda se calcula al momento y no guarda nada (ADR 0008), así que posponer necesita guardar algo: qué ítem (su `clave`) y hasta cuándo. Hacerlo si en el uso aparecen pendientes que no se pueden resolver todavía y estorban. 2026-10-04.

## Datos automáticos y fuentes externas

Ordenados de más a menos factible. Salen de la investigación de la ficha de propiedad (ver `docs/decisiones/0002-ficha-cifras-y-mapa.md`). 2026-10-01.

- **UF e IPC automáticos** desde la API del Banco Central (BDE), que es oficial y gratis. Diego tiene que crear la cuenta; el token dura un año. La CMF queda de respaldo. Hoy la última UF en la base es del 2026-06-01, así que todo lo que está en UF se convierte con un valor viejo. Con el IPC en la base, «Reajustar» un contrato podría proponer el porcentaje solo; hoy se ingresa a mano (2026-10-04).
- **Leer con IA** el certificado de avalúo y la escritura, para llenar los datos de la ficha sin tipearlos.
- **Tasación y arriendo de mercado.** Piloto de un mes con un proveedor con API (Data Inmobiliaria o HousePricing) y 5 a 10 propiedades. Preguntar por escrito si se pueden guardar y mostrar los valores. Guardarlos como «estimación», con fuente, fecha y rango. Sin scraping de portales: sus condiciones lo prohíben.
- **Avalúo desde el SII.** Sin scraping: los términos del SII piden autorización expresa. Pedir un canal oficial, y revisar a mano la descarga pública de transferencias (F2890) en la página de transparencia del SII.
- **Reavalúo no agrícola.** Confirmar si entra el 1-ene-2027 (Ley 21.806, según la investigación) y preparar la carga de los avalúos nuevos.

## Ficha de propiedad, para después

Ideas que salieron al rediseñar la ficha y que no entran en esta tarea. 2026-10-01.

- Anterior/siguiente al recorrer la lista filtrada de propiedades.
- Bitácora de notas por propiedad.
- Flujo de venta: primero preguntar cómo se vende hoy (regla 8).
- Mapa de toda la cartera: requiere guardar coordenadas de cada propiedad.
- Papeles personalizables por empresa, cuando un cliente lo pida. Hoy la lista es fija, en `src/lib/papeles.ts` (ADR 0004, decisión 5).
- `rolSII` único por comuna y organización (hoy la base no lo impide).
- Foto de fachada.
- **Cambiar el papel de un documento ya subido.** El papel solo se elige al subir: un documento subido como «Otro» por error, o uno anterior a la etapa 3 (sin papel), no cuenta para la lista hasta que se vuelva a subir. Hoy no hay documentos cargados, así que no afecta a nadie todavía. Hacerlo antes de que se carguen documentos reales: un cuadro «Editar» en cada documento (papel, nombre y fechas). Salió del `/code-review` de la branch. 2026-10-01.
- **Mirar la ficha en el celular.** La vista en una columna se revisó en el código, pero no en pantalla (Chrome estaba en pantalla completa). Diego la tiene que mirar. 2026-10-01.
- **Separar los intereses del dividendo** para la rentabilidad neta. Hoy el dividendo solo se muestra y no entra al costo, porque mezcla abono a capital (ahorro) con intereses (gasto). Ver ADR 0003, decisión 9.
- **Más de un crédito por propiedad.** Hoy la deuda son columnas de `Property` (un crédito). Si aparece una propiedad con dos, pasar a una tabla de créditos. ADR 0003, decisión 5.
- **Fuente «estimación automática»** del valor comercial, cuando exista el piloto de tasación con un proveedor (ver «Datos automáticos»).
