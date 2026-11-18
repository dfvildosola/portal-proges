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

# Convenciones de código

Escritas desde lo que el código ya hace (2026-11-18). Las reglas generales (lo más simple, regla de tres, sin librerías nuevas, errores explícitos) están en `~/Code/CLAUDE.md`, «Reglas de código». Quien lee este código está aprendiendo: los nombres y comentarios explican el porqué en español simple.

- **Tamaño:** ningún archivo pasa de ~800 líneas. Cada pestaña, cada formulario y cada grupo de acciones va en su archivo, al lado de la página que lo usa (`propiedades/[id]/lease-tab.tsx`, `contratos/ciclo-actions.ts`).
- **Datos:** Prisma por `db` de `@/lib/db`, desde Server Components y server actions. Toda consulta filtra por `organizationId` con `await getOrgId()` (`src/lib/org.ts`); nunca se escribe el id de la organización a mano.
- **Formularios:** el patrón es `useFormAction` (`src/hooks/use-form-action.ts`) + una server action que recibe `(prev, formData)` y devuelve `{ error?, fieldErrors? }`. La action valida con zod (`toFieldErrors`, `moneyField` y demás helpers de `src/lib/form-helpers.ts`) y vuelve a comprobar en el servidor que el registro es de la organización. Los campos usan `Field` (`src/components/field.tsx`) con los componentes de `src/components/ui/`, no HTML suelto con clases propias. El formulario no se vacía si el servidor responde con error.
- **Componentes:** primero los de `src/components/ui/` (shadcn). Tablas con `data-table`. Íconos solo de `lucide-react`. `src/components/` es plano.
- **Colores:** por tokens de `src/app/globals.css` (`text-success`, `bg-warning-soft`…), nunca hex. Un token nuevo se define en claro y en oscuro.
- **Fechas:** las fechas «solo fecha» se guardan a medianoche UTC y «hoy» es `hoyChile()` de `src/lib/fechas.ts`. Nunca `new Date(str)` seguido de métodos locales: producción corre en UTC y el Mac en hora de Chile, y el mismo código daría días distintos.
- **Plata:** `Decimal` en la base, con su moneda al lado (CLP o UF); nunca `float`. Se formatea con `src/lib/format.ts`.
- **Un número vive en un solo lugar:** un cálculo que se muestra en dos pantallas va en `src/lib/`, como función pura, y las dos lo llaman.
- **Errores:** nunca tragarse una excepción. La action devuelve un mensaje que dice qué falló; lo inesperado se deja caer.
- **Textos:** al usuario en español, sin jerga.
- **Antes de devolver una pieza:** `npx tsc --noEmit && npm run lint && npm run build`. El lint tiene un aviso conocido en `data-table.tsx` (`react-hooks/incompatible-library`); cualquier otro aviso en un archivo tocado se arregla.
