# Pendientes — Proges

- **Producción es pública: falta el login.** Desde el 2026-10-02, `proges.vercel.app` funciona con su base (ADR 0005), pero no hay login: no hay middleware ni Clerk en el código, y `getOrgId()` (`src/lib/org.ts`) devuelve siempre `org_proges`. Cualquiera con la dirección puede ver, crear y borrar datos. **No cargar datos reales en producción hasta tener login.** Las llaves de Clerk ya están en Vercel. Mientras tanto, una opción rápida es activar la protección de Vercel (Deployment Protection) también para producción. 2026-10-02.
- **Pendientes: botón dentro de otro botón.** En `pendientes/alert-group.tsx`, el botón «Resolver propiedad» está dentro del encabezado que abre y cierra el grupo, que también es un botón. El navegador reclama y React rehace la página al cargar (error de hidratación).
- **Tema:** decidir si montos, ROL y fechas pasan a JetBrains Mono, como pide el sistema de diseño. Quedó fuera del cambio de tema.
- **Subir documentos no funciona en local: `BLOB_READ_WRITE_TOKEN` está vacío en `.env`.** Toda subida responde «Error al subir el archivo…» antes de llegar a Vercel; en la etapa 3 de la ficha (papeles) el flujo se probó hasta ese paso, pero no la escritura del documento. Decidir antes de cargar el token:
  - un almacén de Vercel Blob aparte para desarrollo, para que ni `npm run dev` ni los espacios (que copian el `.env` del original) escriban en el de producción;
  - si los documentos pasan a almacenamiento **privado**: hoy se suben con `access: "public"`, así que una escritura o un certificado quedan en una URL pública, difícil de adivinar pero sin protección. Vercel Blob ya ofrece almacenamiento privado.
  2026-10-01.
- **Migraciones de producción a mano.** Subir a `main` publica en Vercel, pero las migraciones se aplican aparte (`AGENTS.md`, ADR 0005). Si alguien sube sin migrar, producción falla hasta que se migre. Decidir si el build de Vercel corre `prisma migrate deploy` solo, para lo que necesita la dirección directa de Neon como variable aparte. 2026-10-02.
- **Borrar el contenedor viejo de Docker** (`proges-db-prueba` y su volumen `proges_proges-pgdata`) y el respaldo `.env.respaldo-docker` cuando la base `proges_dev` del Mac lleve un tiempo funcionando bien. Hoy el contenedor está apagado, no borrado. 2026-10-01.
- **Cuentas pagadas no llegan a la rentabilidad.** Marcar pagada una `PropertyBill` no crea un `Movement` (gasto), así que ese gasto no aparece en la rentabilidad de la propiedad. Resolver cuando el flujo lleve un tiempo en uso real. 2026-10-01.
- **`Field` copiado 6 veces.** El envoltorio etiqueta + campo + error está repetido en `property-form.tsx`, `property-form-economic.tsx`, `[id]/economic-forms.tsx`, `pay-form`, `tenant-form` y `contract-form`. Sacarlo a `src/components/` y que todos lo importen (regla de tres). 2026-10-01.
- **`catch` que esconden la causa.** `addTax` (`finance-actions.ts`) y `addAssessment` (`facts-actions.ts`) responden «Ya existe…» ante cualquier error, aunque sea otro. `deleteDocument` (`documents-actions.ts`) ignora en silencio si falla el borrado del archivo en Vercel Blob. Revisar el código del error (`P2002` para duplicado) y avisar el resto (regla de código 5). 2026-10-01.
- **Alertas se actualizan solo al abrir `/pendientes` o la ficha de una propiedad.** Pagar una cuenta deja su alerta activa y el contador del menú desfasado hasta la próxima visita a una de esas dos páginas (igual que los otros tipos). 2026-10-01.
- **Pendientes: «Resolver» no sirve mientras siga la causa.** `/pendientes` recalcula las alertas al cargar (`syncAlerts`), así que una alerta resuelta a mano vuelve al instante si la causa sigue (confirmado en `proges_dev`). En la ficha se quitó el botón (ADR 0002). Decidir lo mismo para `/pendientes`, o hacer un «Posponer» que `syncAlerts` respete. 2026-10-01.
- **Alerta de desocupada cuenta desde la última edición.** `DESOCUPADA_PROLONGADA` (`alerts.ts`) mide los meses desde `updatedAt` de la propiedad, y la Situación de la ficha mide los días desde la `fechaTermino` del último contrato: en la misma pantalla pueden no coincidir. Usar la misma fecha en los dos. 2026-10-01.
- **Los cuadros de agregar se vacían cuando hay un error.** React 19 limpia el formulario cada vez que corre la acción, haya salido bien o no, así que tras «Revisa los campos.» hay que volver a escribir todo. Ya pasaba con los formularios en línea. En **editar propiedad** (`property-form.tsx`) duele más: una fecha mal puesta borra lo escrito en compra y deuda, y los campos vuelven a los valores guardados. Arreglarlo devolviendo lo escrito en el estado y usándolo como `defaultValue`. 2026-10-01.
- **Ficha: `syncAlerts` corre antes de comprobar que la propiedad existe.** Abrir una ficha con un id que no existe igual recalcula las alertas de toda la cartera. Menor. 2026-10-01.
- **Selectores que muestran el valor interno** (`PERSONA`, `GASTO_COMUN`…) en vez de la etiqueta: les falta `items={…Labels}` en el `<Select>`, como ya se hizo en la ficha. Quedan `propiedades/[id]/economic-forms.tsx` y `duenos/forms.tsx`. 2026-10-01.
- **Contribuciones: «Marcar pagada» no propone la fecha de hoy** (pestaña Finanzas de la ficha), como ya hacen cuentas y cobros. 2026-10-04.
- **Al terminar un contrato, la propiedad sigue «Arrendada».** «Terminar» guarda la fecha de salida, pero no cambia el estado de la propiedad: la ficha avisa «Arrendada sin contrato» hasta que se cambie a mano. Preguntarle a Diego si «Terminar» debería ofrecer marcarla desocupada (o en venta, o uso propio) en el mismo paso. 2026-10-04.

## Datos automáticos y fuentes externas

Ordenados de más a menos factible. Salen de la investigación de la ficha de propiedad (ver `docs/decisiones/0002-ficha-cifras-y-mapa.md`). 2026-10-01.

- **UF e IPC automáticos** desde la API del Banco Central (BDE), que es oficial y gratis. Diego tiene que crear la cuenta; el token dura un año. La CMF queda de respaldo. Hoy la última UF en la base es del 2026-06-01, así que todo lo que está en UF se convierte con un valor viejo.
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
