<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Antes de decir listo

`npm run lint` y `npm run build` tienen que pasar (el build corre `prisma generate`), y lo que cambió se prueba en el navegador (`npm run dev`). Todavía no hay tests automáticos. Las reglas generales están en `~/Code/CLAUDE.md`.

# Base local

La base de desarrollo es `proges_dev`, en el Postgres del Mac (el mismo que usa RASA). Ya no se usa Docker. Este proyecto tiene receta de espacios (`espacio.json`): cada espacio recibe su copia `proges_dev_<nombre>` y su propio puerto.

# Producción

Subir a `main` publica solo en Vercel. La base de producción es el proyecto de Neon `neon-apricot-pendant` (ADR 0005). En Vercel, `DATABASE_URL` es la dirección *con* pooling y la usa la app.

**Las migraciones se aplican solas al publicar** (ADR 0009): el build de producción de Vercel corre `scripts/migrar-produccion.mjs` después de `next build`, con `DIRECT_URL`, la dirección *directa* de Neon guardada en Vercel. En local, en los espacios y en las vistas previas ese paso no hace nada. Si falta `DIRECT_URL` o una migración falla, el build se detiene y sigue publicada la versión anterior. Como mezclar y subir ya migra producción, las migraciones se revisan antes de mezclar.

**A mano, solo en emergencias:** Diego deja la dirección directa (Neon → Connect, con «Connection pooling» apagado) en un `.env.prod` (ignorado por git), se corre `DATABASE_URL="<directa>" npx prisma migrate deploy` sin mostrarla y se borra el `.env.prod`.
