# Proges: monorepo de la API y la web

Desde la v7 (ADR 0016) esto es un monorepo con workspaces de npm:

| Carpeta | Qué es | Su guía |
|---|---|---|
| `apps/api` | La API (Hono, `/v1`), la única que toca la base. Corre en Railway | `apps/api/LEEME.md` |
| `apps/web` | La web (Next.js 16). Le pide todo a la API desde el servidor. Corre en Vercel | `apps/web/LEEME.md` |
| `packages/db` | La base: esquema de Prisma por temas, migraciones, cliente y scripts de carga | — |
| `packages/contrato` | Lo que la API recibe y entrega (zod). Lo usan la API, la web y `/docs` | — |
| `legado/` | El portal viejo. Se borra al terminar la etapa 2. No se copia nada de sus pantallas | — |

La maqueta aprobada del portal es `docs/maqueta-v7.html`. Las decisiones están en `docs/decisiones/`, y las de la v7 son la 0016 (monorepo y API propia) y la 0017 (qué ve y hace cada uno).

<!-- BEGIN:nextjs-agent-rules -->
## Next.js 16 no es el que conoces

Esta versión cambió APIs, convenciones y estructura de archivos respecto de lo que probablemente sabes. Antes de escribir código de la web, lee la guía que corresponde en `node_modules/next/dist/docs/` (en la raíz del repo) y haz caso de los avisos de obsolescencia. Un ejemplo: el middleware ahora se llama `proxy.ts`.
<!-- END:nextjs-agent-rules -->

## Antes de decir listo

`npm run verificar`, en la raíz, tiene que pasar. Corre los tipos, el lint, las pruebas de la API (contra `proges_test`), el build de la web y el tope de 800 líneas. Lo que cambió en la web se prueba en el navegador, en computador (1280 px) y en celular (390 px), con la API y la web levantadas (`npm run dev -w @proges/api` y `npm run dev -w @proges/web`).

## Base local

La base de desarrollo es `proges_dev`, en el Postgres del Mac (el mismo que usa RASA). Las pruebas usan `proges_test`, que se crea y migra sola. Este proyecto tiene receta de espacios (`espacio.json`): cada espacio recibe su copia `proges_dev_<nombre>` y sus puertos.

## Producción

Nada de la v7 está publicado todavía; los pasos están en `PENDIENTES.md`.

- **La API** corre en Railway. Antes de publicar cada versión, Railway aplica las migraciones pendientes (`apps/api/railway.json` → `packages/db/scripts/migrar-produccion.mjs`, con `DIRECT_URL`). Si falta esa dirección o una migración falla, no publica.
- **La web** corre en Vercel, con la raíz en `apps/web`.
- **La base** de producción es el proyecto de Neon `neon-apricot-pendant` (ADR 0005).

Como mezclar y publicar ya migra producción, las migraciones se revisan antes de mezclar.

## Convenciones de código

Las reglas generales están en `~/Code/CLAUDE.md`, «Reglas de código»: lo más simple, la regla de tres, nada de librerías nuevas y errores explícitos. Quien lee este código está aprendiendo: los nombres y comentarios explican el porqué en español simple.

- **Tamaño:** ningún archivo pasa de ~800 líneas (`npm run largo` lo revisa).
- **La web no toca la base.** Nunca importa `@proges/db`; todo pasa por `apps/web/src/lib/api.ts`, solo desde el servidor (Server Components y server actions). Los tipos salen de `@proges/contrato`.
- **Permisos en la API:** toda lectura filtra por `espaciosQueLee`, y toda escritura pasa por `exigirEscritura` y `espacioParaEscribirEn`. Lo que sale hacia un dueño o una llave pasa por la función de recorte del área. Ver `apps/api/LEEME.md`.
- **Colores:** por tokens (los de la maqueta, definidos en claro y en oscuro), nunca hex sueltos.
- **Fechas:** las fechas «solo fecha» se guardan a medianoche UTC y «hoy» es `hoyChile()`. Nunca `new Date(str)` seguido de métodos locales: producción corre en UTC y el Mac en hora de Chile, y el mismo código daría días distintos.
- **Plata:** `Decimal` en la base, con su moneda al lado (CLP o UF); nunca `float`. La API la entrega como `{ valor: "texto decimal", moneda }`.
- **Un número vive en un solo lugar:** un cálculo va en el `dominio/` de la API, como función pura, y la web solo lo muestra.
- **Errores:** nunca tragarse una excepción. La API responde `{ error: { mensaje, campos? } }`, y la web muestra ese mensaje.
- **Textos:** al usuario, en español y sin jerga.
