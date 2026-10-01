# Pendientes — Proges

- **Pendientes: botón dentro de otro botón.** En `pendientes/alert-group.tsx`, el botón «Resolver propiedad» está dentro del encabezado que abre y cierra el grupo, que también es un botón. El navegador reclama y React rehace la página al cargar (error de hidratación).
- **Ficha: el selector de estado muestra el valor interno** (`ARRENDADA`) en vez de la etiqueta (`Arrendada`). Está en `propiedades/[id]/status-quick-edit.tsx`.
- **Tema:** decidir si montos, ROL y fechas pasan a JetBrains Mono, como pide el sistema de diseño. Quedó fuera del cambio de tema.
- **Espacios y Vercel Blob.** Cada espacio copia el `.env` del original, con el mismo `BLOB_READ_WRITE_TOKEN`: subir o borrar un documento desde un espacio escribe en el almacén real de Vercel Blob, igual que hoy desde `npm run dev`. Con varios espacios el riesgo se multiplica. Opciones: un almacén aparte para desarrollo, o que los espacios no traigan el token. 2026-10-01.
- **Borrar el contenedor viejo de Docker** (`proges-db-prueba` y su volumen `proges_proges-pgdata`) y el respaldo `.env.respaldo-docker` cuando la base `proges_dev` del Mac lleve un tiempo funcionando bien. Hoy el contenedor está apagado, no borrado. 2026-10-01.
- **Cuentas pagadas no llegan a la rentabilidad.** Marcar pagada una `PropertyBill` no crea un `Movement` (gasto), así que ese gasto no aparece en la rentabilidad de la propiedad. Resolver cuando el flujo lleve un tiempo en uso real. 2026-10-01.
- **Helpers copiados.** `toFieldErrors`, `assertProperty` y `dateField` están duplicados entre `propiedades/actions.ts` y `cuentas/actions.ts`, porque un archivo `"use server"` solo exporta funciones async. A la tercera copia, sacarlos a `src/lib/` (regla de tres). 2026-10-01.
- **Cuentas: «vencida» desde la tarde anterior.** Los vencimientos se guardan a medianoche UTC y se comparan con `now`: en Chile una cuenta que vence el 5 figura vencida desde ~20:00 del 4. Afecta `alerts.ts`, `bills-tab.tsx` y `cuentas/page.tsx`; revisar junto con las contribuciones. 2026-10-01.
- **Alertas se actualizan solo al abrir `/pendientes`.** Pagar una cuenta deja su alerta activa y el contador del menú desfasado hasta la próxima visita (igual que los otros tipos). 2026-10-01.
- **Cuentas: `revalidatePath` usa el `propertyId` del formulario**, no el de la cuenta; si llega vacío la ficha queda en caché. 2026-10-01.
- **Cuentas: «Marcar pagada» no propone la fecha de hoy.** 2026-10-01.
