# Pendientes — Proges

- **Pendientes: botón dentro de otro botón.** En `pendientes/alert-group.tsx`, el botón «Resolver propiedad» está dentro del encabezado que abre y cierra el grupo, que también es un botón. El navegador reclama y React rehace la página al cargar (error de hidratación).
- **Tema:** decidir si montos, ROL y fechas pasan a JetBrains Mono, como pide el sistema de diseño. Quedó fuera del cambio de tema.
- **Espacios y Vercel Blob.** Cada espacio copia el `.env` del original, con el mismo `BLOB_READ_WRITE_TOKEN`: subir o borrar un documento desde un espacio escribe en el almacén real de Vercel Blob, igual que hoy desde `npm run dev`. Con varios espacios el riesgo se multiplica. Opciones: un almacén aparte para desarrollo, o que los espacios no traigan el token. 2026-10-01.
- **Borrar el contenedor viejo de Docker** (`proges-db-prueba` y su volumen `proges_proges-pgdata`) y el respaldo `.env.respaldo-docker` cuando la base `proges_dev` del Mac lleve un tiempo funcionando bien. Hoy el contenedor está apagado, no borrado. 2026-10-01.
- **Cuentas pagadas no llegan a la rentabilidad.** Marcar pagada una `PropertyBill` no crea un `Movement` (gasto), así que ese gasto no aparece en la rentabilidad de la propiedad. Resolver cuando el flujo lleve un tiempo en uso real. 2026-10-01.
- **Helpers copiados.** `toFieldErrors`, `assertProperty` y `dateField` están duplicados entre `propiedades/actions.ts` y `cuentas/actions.ts`, porque un archivo `"use server"` solo exporta funciones async. A la tercera copia, sacarlos a `src/lib/` (regla de tres). 2026-10-01.
- **Cuentas: «vencida» desde la tarde anterior.** Los vencimientos se guardan a medianoche UTC y se comparan con `now`: en Chile una cuenta que vence el 5 figura vencida desde ~20:00 del 4. Afecta `alerts.ts`, `bills-tab.tsx` y `cuentas/page.tsx`; revisar junto con las contribuciones. 2026-10-01.
- **Alertas se actualizan solo al abrir `/pendientes` o la ficha de una propiedad.** Pagar una cuenta deja su alerta activa y el contador del menú desfasado hasta la próxima visita a una de esas dos páginas (igual que los otros tipos). 2026-10-01.
- **Cuentas: `revalidatePath` usa el `propertyId` del formulario**, no el de la cuenta; si llega vacío la ficha queda en caché. 2026-10-01.
- **Cuentas: «Marcar pagada» no propone la fecha de hoy.** 2026-10-01.
- **Contratos con estado guardado `POR_VENCER`.** Solo los crea `prisma/seed.ts`; la app nunca lo asigna, y `/resumen`, las alertas y la ficha cuentan como vigente solo `VIGENTE`. Un contrato guardado como `POR_VENCER` deja la propiedad sin renta ni rentabilidad. Decidir si ese estado se elimina (el «por vencer» ya lo calcula la alerta a partir de la fecha de término) o si cuenta como vigente en todas partes. 2026-10-01.

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
- Papeles personalizables por empresa (la etapa 3 parte con una lista fija en el código).
- `rolSII` único por comuna y organización (hoy la base no lo impide).
- Foto de fachada.
