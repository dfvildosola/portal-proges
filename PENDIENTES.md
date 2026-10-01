# Pendientes — Proges

- **Pendientes: botón dentro de otro botón.** En `pendientes/alert-group.tsx`, el botón «Resolver propiedad» está dentro del encabezado que abre y cierra el grupo, que también es un botón. El navegador reclama y React rehace la página al cargar (error de hidratación).
- **Ficha: el selector de estado muestra el valor interno** (`ARRENDADA`) en vez de la etiqueta (`Arrendada`). Está en `propiedades/[id]/status-quick-edit.tsx`.
- **Tema:** decidir si montos, ROL y fechas pasan a JetBrains Mono, como pide el sistema de diseño. Quedó fuera del cambio de tema.
- **Espacios y Vercel Blob.** Cada espacio copia el `.env` del original, con el mismo `BLOB_READ_WRITE_TOKEN`: subir o borrar un documento desde un espacio escribe en el almacén real de Vercel Blob, igual que hoy desde `npm run dev`. Con varios espacios el riesgo se multiplica. Opciones: un almacén aparte para desarrollo, o que los espacios no traigan el token. 2026-10-01.
- **Borrar el contenedor viejo de Docker** (`proges-db-prueba` y su volumen `proges_proges-pgdata`) y el respaldo `.env.respaldo-docker` cuando la base `proges_dev` del Mac lleve un tiempo funcionando bien. Hoy el contenedor está apagado, no borrado. 2026-10-01.
