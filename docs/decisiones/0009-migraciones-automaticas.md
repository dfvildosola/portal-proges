# 0009 — Migraciones automáticas al publicar

Fecha: 2026-10-05 · Estado: aceptada · Cambia una consecuencia del ADR 0005

## Contexto

Producción tiene dos piezas que se actualizan por separado: el código, en Vercel, y la base, en Neon. Una migración es la instrucción que cambia la estructura de la base (agregar una columna, borrar una tabla). Es como cambiar los formularios de una oficina: si llegan los formularios nuevos pero nadie agrega las carpetas que piden en el archivador, el trabajo se detiene.

Hasta hoy, subir a `main` publicaba el código solo, pero las migraciones se aplicaban a mano antes de subir (ADR 0005). Si alguien se olvidaba, las páginas que leen columnas nuevas fallaban hasta que se migrara. La branch `contratos-cobranza` trae 3 migraciones esperando, una de ellas borra la tabla `Alert`.

## Decisión (Diego, 2026-10-05)

**El build de producción de Vercel aplica las migraciones pendientes solo.** El script `scripts/migrar-produccion.mjs` corre al final de `npm run build`:

- **Solo en producción** (`VERCEL_ENV=production`). En local, en los espacios y en las vistas previas de Vercel no hace nada, así que una branch sin mezclar nunca toca la base de producción.
- **Después de `next build`.** Si el código no compila, la base no se toca.
- **Con la dirección directa de Neon**, guardada en Vercel como `DIRECT_URL` (producción, «Sensitive»). Neon la pide para cambiar la estructura de la base. La app sigue usando `DATABASE_URL`, la dirección con pooling.
- **Si falta `DIRECT_URL` o una migración falla, el build se detiene.** Vercel no publica la versión nueva y sigue en línea la anterior.

## Alternativas descartadas

- **Seguir a mano:** da control sobre cada cambio a la base, pero depende de que nadie se olvide del paso.
- **Migrar antes de `next build`:** si después el build fallaba, quedaba la base cambiada con el código viejo publicado.

## Consecuencias

- **Subir a `main` ya no pide migrar antes.** El paso de `.env.prod` de `AGENTS.md` queda solo para emergencias.
- **Hay unos segundos entre que se migra y que se publica el código nuevo.** Una migración que borra algo que el código viejo todavía lee (como `sacar_alertas`) puede hacer fallar esas páginas durante ese rato. Con el uso actual no importa; si algún día importa, se borra en dos subidas: primero el código deja de usarlo, después la migración lo borra.
- **Una migración se revisa antes de mezclar a `main`,** porque mezclar y subir ya la aplica en producción sin otro paso.
- **`DIRECT_URL` vive en Vercel** como variable de producción marcada «Sensitive»: Vercel no la vuelve a mostrar. Si cambia la contraseña de Neon, hay que reemplazarla ahí, junto con `DATABASE_URL`.
