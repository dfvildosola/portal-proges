# Pendientes — Proges

- **Pendientes: botón dentro de otro botón.** En `pendientes/alert-group.tsx`, el botón «Resolver propiedad» está dentro del encabezado que abre y cierra el grupo, que también es un botón. El navegador reclama y React rehace la página al cargar (error de hidratación).
- **Lint: 2 errores.** Hay un `setState` dentro de un `useEffect` en `hooks/use-mobile.ts` y otro en `propiedades/[id]/documents-forms.tsx`. Bloquean el merge (regla de código 6).
- **Ficha: el selector de estado muestra el valor interno** (`ARRENDADA`) en vez de la etiqueta (`Arrendada`). Está en `propiedades/[id]/status-quick-edit.tsx`.
- **Base local en conflicto de puerto.** El `docker-compose.yml` usa el 5432, que ya ocupa otro Postgres instalado en el Mac. Para desarrollar hoy hay que levantar la base de Proges en otro puerto (por ejemplo 5433) y ajustar `DATABASE_URL`. Conviene dejarlo fijo en el compose y en `.env.example`.
- **Tema:** decidir si montos, ROL y fechas pasan a JetBrains Mono, como pide el sistema de diseño. Quedó fuera del cambio de tema.
