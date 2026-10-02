# 0005 — Base de datos de producción

Fecha: 2026-10-02 · Estado: aceptada

## Contexto

Al subir la ficha de propiedad apareció un hueco: la base de producción nunca había recibido las tablas de Proges. Ninguna de las 10 migraciones estaba aplicada en ninguna base conocida.

- La dirección guardada en Vercel (`DATABASE_URL`, producción) se agregó el 1 de junio como «Sensitive». Vercel no se la vuelve a mostrar a nadie, así que no se sabe a qué base apuntaba.
- No coincide con ninguno de los dos proyectos de la cuenta de Neon, que se crearon un mes antes de esta fecha:
  - `neon-coral-river` es la base de otra app, con tablas de registro de ayunos;
  - `neon-apricot-pendant` estaba vacía.
- Nadie usaba Proges en producción, así que no había datos que rescatar.

Había que elegir dónde vive la base de producción. Las opciones eran Neon, Supabase y Railway; las tres son Postgres, así que el código de Proges funciona igual en cualquiera.

## Decisión (Diego, 2026-10-02)

**La base de producción de Proges es el proyecto de Neon `neon-apricot-pendant`** (región AWS us-east-1).

- Se le aplicaron las 10 migraciones y parte vacía.
- En Vercel, `DATABASE_URL` de producción se reemplazó por la dirección **con pooling** de esa base (el host lleva `-pooler`), marcada «Sensitive». El pooling es una fila compartida de conexiones: Vercel abre muchas funciones a la vez, y sin esa fila cada una abriría su propia conexión a la base.
- Las migraciones usan la dirección **directa**, sin `-pooler`. Neon la pide para cambiar la estructura de la base.

## Por qué Neon

- **Ya existía y estaba vacía.**
- **Gratis en este tamaño.**
- **Queda en la misma zona que Vercel** (Virginia): cada consulta tarda ~1 ms. Con Railway en otra región serían ~60 ms por consulta, y la ficha hace varias.
- **Se duerme sola cuando nadie la usa y despierta sola** en la primera visita (~1 s más).

## Alternativas descartadas

- **Supabase:** trae login, archivos y tiempo real, pero Proges ya usa Clerk y Vercel Blob para eso. Además, en el plan gratis se pausa a los 7 días sin uso y hay que despertarla a mano; evitarlo cuesta US$25 al mes.
- **Railway** (el plan de `rasa-back`): habría dejado todo en una sola factura y un solo panel, a cambio de ~US$1–5 al mes y de cuidar la región. No trae pooler.

## Consecuencias

- **Las migraciones no se aplican solas al subir.** El build de Vercel solo corre `prisma generate`. Antes de subir a `main` un cambio con migración, hay que aplicarla en producción con la dirección directa: `DATABASE_URL="<directa>" npx prisma migrate deploy`. El paso está escrito en `AGENTS.md`. Si se sube sin migrar, las páginas que leen columnas nuevas fallan hasta que se migre.
- **Producción parte vacía.** Las propiedades se cargan desde la app.
- **La base del 1 de junio no se borró ni se tocó.** Si existía con datos, siguen donde estaban, y se puede volver a apuntar a ella.
- **Para migrar hay que conseguir la dirección directa en Neon:** proyecto `neon-apricot-pendant` → Connect, con «Connection pooling» apagado. Vercel no la entrega.
