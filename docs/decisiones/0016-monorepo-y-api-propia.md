# 0016 — Monorepo y API propia

Fecha: 2026-11-19 · Estado: aceptada (plan v7, d1 a d4; aprobado por Diego). Reemplaza al ADR 0009 en **dónde** corren las migraciones; lo demás del 0009 sigue valiendo.

## Contexto

Hasta la v6, el portal de Proges era una sola aplicación de Next.js: cada pantalla leía la base directamente y cada formulario escribía en ella con una «server action». Funcionaba para el equipo, pero el plan v7 cambió el objetivo. El portal pasa a ser **el producto que Proges vende**: los dueños registran sus propiedades y llevan su control ahí, y desde ahí le piden servicios a Proges. Un cliente grande como NPL además querría consultar sus datos desde su propio sistema.

Para eso hacía falta una puerta única a los datos, con las mismas reglas para todos los que entran: la web del equipo, el portal del dueño y el sistema de un cliente. Diego pidió que esa puerta fuera **nuestra propia API** y que todo viviera en **un solo repositorio** (monorepo).

## Decisión

**Solo la API toca la base (d1 a).** La API es una ventanilla única: la web, el portal del dueño y el sistema de un cliente le piden todo a ella, y ninguno abre la bodega por su cuenta. Así las reglas de quién ve qué, por ejemplo que un dueño nunca vea el costo del maestro, se escriben una sola vez y se prueban una sola vez. La web no depende de `packages/db`: si alguien la importa ahí, es un error.

**La API se hace con Hono, en TypeScript (d2 a).** Hono es una herramienta liviana hecha solo para APIs. Se eligió porque el back que ya existía, también en TypeScript, se trasladó tal cual: las reglas que ya estaban probadas no se tradujeron a otro lenguaje. La documentación (`/docs` y `/openapi.json`) se genera sola desde el **contrato** (`packages/contrato`), la misma lista de datos con zod que revisa cada pedido. Por eso no se queda atrás cuando cambia el código.

**La API corre en Railway y la web en Vercel (d3 b).** Es la misma forma que tiene RASA (rasa-api en Railway, team-portal en Vercel). Tiene tres consecuencias:

- **Las migraciones corren en Railway, antes de publicar la API.** El ADR 0009 las corría en el build de Vercel. Ahora `apps/api/railway.json` las corre en su paso `preDeployCommand`, que llama a `packages/db/scripts/migrar-produccion.mjs`. Ese paso migra solo si el ambiente se llama `production` y usa `DIRECT_URL`, la dirección directa de Neon. Si falta esa dirección o una migración falla, Railway no publica y sigue la versión anterior: es la misma red de seguridad del 0009, en otro lugar.
- **Railway tiene un solo ambiente.** Una vista previa de la web en Vercel podría terminar escribiendo en la base real. Para evitarlo, las vistas previas no reciben la dirección de la API de producción, y lo nuevo se prueba en el Mac con los dos servicios levantados (`espacio.json`).
- **Los archivos los guarda la API, pero hoy pasan por la web.** La API recibe y guarda los PDF y las fotos, y no tiene el tope de 4,5 MB de Vercel. Sin embargo, la web construida en la v7 los manda desde el servidor de Vercel (una «server action»), y ese paso sí tiene el tope: un PDF de más de 4,5 MB no va a subir desde la web publicada hasta que el navegador lo suba directo a la API (está en `PENDIENTES.md`). Las fotos no lo notan: se achican en el teléfono, para gastar menos datos en terreno.

**Las llaves de sistemas externos solo leen, y solo lo de su cliente (d4 a).** Una llave (`prg_…`) es como una tarjeta de visita de un piso del edificio: deja mirar y nada más. Se guarda solo su huella (sha256), nunca la llave misma, que se muestra una sola vez al crearla. Se puede revocar sin borrarla, y queda anotado su último uso. Una llave recibe lo mismo que ve el dueño en el portal, recortado de la misma forma.

**Cómo quedó el repositorio:**

| Carpeta | Qué es |
|---|---|
| `apps/api` | La API (Hono), versionada en `/v1`. El portero (`acceso/`), los permisos (`permisos.ts`), un archivo de rutas por área y las reglas en `dominio/` |
| `apps/web` | La web (Next.js). Le pide todo a la API desde el servidor, con el token de sesión de Clerk |
| `packages/db` | La base: el esquema de Prisma partido por temas, las migraciones, el cliente y los scripts de carga |
| `packages/contrato` | Lo que la API recibe y entrega (zod). Lo comparten la API, la web y `/docs` |

Se usan los workspaces de npm, sin Turborepo: con dos aplicaciones y dos paquetes, una herramienta más no resuelve nada que hoy duela. `npm run verificar`, en la raíz, corre tipos, lint, las pruebas de la API, el build de la web y el tope de 800 líneas.

**Las pruebas corren contra `proges_test`**, con `node:test`. Cada prueba arma su propio escenario: dos clientes, el equipo y una llave, con nombres únicos. Al terminar borra solo lo que ella creó, así que varias pruebas pueden correr a la vez sobre la misma base.

## Alternativas descartadas

- **Que la web siga leyendo la base y la API sea solo para afuera.** Las reglas de quién ve qué quedarían escritas dos veces, una en la web y otra en la API, y tarde o temprano dirían cosas distintas.
- **Rutas de Next.js en una aplicación aparte.** Usaría la misma herramienta que la web, pero la documentación habría que escribirla y mantenerla a mano, y Next pesa más de lo necesario para una API.
- **FastAPI en Python, como rasa-api.** Habría significado traducir unas 10.000 líneas de reglas que ya funcionaban, con el riesgo de equivocarse justo en las delicadas: plata, permisos y fechas.
- **La API en Vercel (d3 a).** Era lo propuesto, por tener todo en un solo lugar. Diego eligió Railway para que Proges quede igual que RASA.
- **Llaves que además pueden pedir servicios (d4 b).** Se deja para cuando un cliente lo pida de verdad.
