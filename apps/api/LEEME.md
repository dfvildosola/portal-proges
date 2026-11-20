# La API de Proges (apps/api)

Toda lectura y escritura de datos de Proges pasa por aquí. La web nunca toca la base: le pide todo a esta API, igual que el sistema de un cliente con su llave. Es Hono en TypeScript, versionada en `/v1`, y corre en Railway.

Piensa en una ventanilla única: en la puerta hay un portero que averigua quién eres (`acceso/`), detrás está la lista de lo que cada uno puede hacer (`permisos.ts`), y cada ventanilla atiende un trámite (`rutas/`). El formulario oficial de cada trámite es el **contrato** (`packages/contrato`): la API revisa con él lo que llega, la web saca de él sus tipos y `/docs` lo muestra.

## Comandos

Desde la raíz del repo:

| Qué | Comando |
|---|---|
| Levantar la API en el Mac (se recarga sola al guardar) | `npm run dev -w @proges/api` → http://localhost:3001, documentación en http://localhost:3001/docs |
| Todas las pruebas de la API | `npm run prueba -w @proges/api` |
| Un archivo de pruebas | `npm run prueba -w @proges/api -- test/propiedades.test.ts` |
| Tipos / lint de la API | `npm run tipos -w @proges/api` / `npm run lint -w @proges/api` |
| Todo (antes de decir listo) | `npm run verificar` |

`npm run verificar` corre tipos, lint y pruebas de todos los workspaces, y falla si un archivo de `apps/` o `packages/` pasa de 800 líneas.

**Las pruebas** corren contra la base `proges_test` (nunca `proges_dev`). La primera vez: copia `apps/api/.env.test.ejemplo` a `apps/api/.env.test` y pon tu usuario del Mac. `npm run prueba` crea la base si no existe y le aplica las migraciones cada vez; no hay que prepararla a mano.

## Cómo está armada

```
apps/api/src/
  app.ts            crearApp(dep): arma la app (portero, rutas, /docs, errores)
  servidor.ts       la levanta de verdad con Clerk, Odoo y Drive reales
  entorno.ts        qué hay en el contexto (quien, dep) y nuevoRouter()
  acceso/           el portero: sesión de Clerk o llave prg_ → c.get("quien")
  permisos.ts       qué puede leer y escribir cada uno
  errores.ts        ErrorApi y la forma de toda respuesta con error
  rutas/            un archivo por área; index.ts los monta en /v1
  rutas/ayuda.ts    json() y errores(): las respuestas de cada ruta para /docs
  dominio/<área>/   las reglas (cálculos, recortes), en funciones puras cuando se puede
  integraciones/    Odoo (solo lectura), Drive, guardado de PDF; tipos.ts es su forma
  util/             fechas, formato y al-contrato.ts (Decimal → Monto, fechas → texto)
apps/api/test/      pruebas (node:test); ayuda.ts arma el escenario
packages/contrato/  lo que la API recibe y entrega (zod), un archivo por área
```

## Qué archivos son de qué pieza

Cada pieza edita **solo** sus archivos. Si necesitas cambiar uno común (app.ts, entorno.ts, permisos.ts, errores.ts, rutas/index.ts, rutas/ayuda.ts, contrato/src/comun.ts, test/ayuda.ts, un package.json o el esquema de la base), no lo hagas: anótalo como duda con el cambio exacto.

| Pieza | Rutas (`src/rutas/`) | Dominio | Contrato | Pruebas |
|---|---|---|---|---|
| B · acceso | `salud.ts`, `yo.ts`, `index.ts`, `ayuda.ts` | `acceso/`, `permisos.ts`, `errores.ts` | `comun.ts`, `acceso.ts` | `acceso.test.ts`, `permisos.test.ts` |
| C · propiedades y ficha | `propiedades.ts`, `documentos.ts`, `vencimientos.ts` | `dominio/ficha/` | `propiedades.ts` | `propiedades.test.ts` |
| D · servicios, tareas, bitácora, pedidos | `servicios.ts`, `tareas.ts`, `notas.ts`, `pedidos.ts`, `inicio.ts`, `catalogo.ts` | `dominio/trabajo/`, `integraciones/drive.ts` | `trabajo.ts` | `trabajo.test.ts` |
| E · obra | `obra.ts`, `maestros.ts` | `dominio/obra/`, `integraciones/odoo.ts` | `obra.ts` | `obra.test.ts` |
| F · corretaje | `venta.ts` | `dominio/venta/` | `venta.ts` | `venta.test.ts` |
| G · cartera del dueño | `cartera.ts`, `administracion.ts` | `dominio/cartera/` | `cartera.ts` | `cartera.test.ts` |
| H · configuración, llaves, resultados | `config.ts`, `llaves.ts`, `resultados.ts` | `dominio/resultados/` | `config.ts` | `config.test.ts` |

Los archivos de `rutas/` ya existen vacíos y ya están montados: solo se llenan. Cada ruta escribe su dirección completa después de `/v1` (`/propiedades/{id}/documentos`), así que una pieza puede colgar rutas de otra área sin tocar `index.ts`.

## La regla de oro

**Todo lo que sale hacia un cliente o una llave pasa por una función de recorte del dominio.** Esa función nunca incluye costos del maestro, presupuestos de maestros, facturas, márgenes, notas no marcadas para el dueño (`paraDueno`) ni datos de otro cliente.

- `esDueno(quien)` dice si la respuesta va recortada: es `true` para una persona de un cliente y para una llave.
- El recorte arma un objeto **nuevo, campo por campo** (lista de lo que sí sale), con el tipo del contrato como tipo de retorno. Nunca `{ ...registro }` ni «borrar los campos internos»: así un campo nuevo en la base no se cuela solo hacia el dueño.
- Cada endpoint de lectura se prueba como cliente A (ve lo suyo), cliente B (404 en lo de A) y llave de A (ve lo de A, recortado), y cada endpoint de escritura con la llave (403).

## Cómo se agrega un endpoint

Ejemplo: `GET /v1/propiedades/{id}` (pieza C). Son cuatro pasos.

**1. El contrato** (`packages/contrato/src/propiedades.ts`). Se importa `z` de `zod` (nunca de `@hono/zod-openapi`, para que la web pueda importar el contrato sin arrastrar el servidor). La descripción que sale en `/docs` va con `.meta({ description })`, y `.meta({ id })` le da nombre único al esquema en `/docs`.

```ts
import { z } from "zod";
import { Id, Monto } from "./comun";

export const Propiedad = z
  .object({
    id: Id,
    direccion: z.string(),
    valorComercial: Monto.nullable().meta({ description: "Lo que vale hoy, si se sabe." }),
  })
  .meta({ id: "Propiedad", description: "Una propiedad, como la ve el dueño." });
export type Propiedad = z.infer<typeof Propiedad>;
```

**2. El recorte** (`src/dominio/ficha/recorte.ts`): lo que puede ver el dueño, campo por campo.

```ts
import type { Property } from "@proges/db";
import type { Propiedad } from "@proges/contrato";
import { aMonto } from "../../util/al-contrato";

export function propiedadParaDueno(p: Property): Propiedad {
  return {
    id: p.id,
    direccion: p.direccion,
    valorComercial: p.valorComercial ? aMonto(p.valorComercial, p.valorComercialMoneda) : null,
  };
}
```

**3. La ruta** (`src/rutas/propiedades.ts`). Permisos primero: `legible` responde 404 si no existe o es de otro cliente.

```ts
import { createRoute, z } from "@hono/zod-openapi";
import { db } from "@proges/db";
import { Id, Propiedad } from "@proges/contrato";
import { nuevoRouter } from "../entorno";
import { legible } from "../permisos";
import { propiedadParaDueno } from "../dominio/ficha/recorte";
import { errores, json } from "./ayuda";

export const propiedades = nuevoRouter();

propiedades.openapi(
  createRoute({
    method: "get",
    path: "/propiedades/{id}",
    tags: ["Propiedades"],
    summary: "Una propiedad",
    request: { params: z.object({ id: Id }) },
    responses: { 200: json(Propiedad, "La propiedad."), ...errores(401, 404) },
  }),
  async (c) => {
    const quien = c.get("quien");
    const { id } = c.req.valid("param");
    const propiedad = await legible(quien, await db.property.findUnique({ where: { id } }));
    return c.json(propiedadParaDueno(propiedad), 200);
  },
);
```

Si el equipo ve más que el dueño (por ejemplo, el costo del maestro), el contrato tiene dos esquemas (la vista del dueño y la del equipo, que la extiende), la respuesta es la unión de los dos, y la ruta elige con `esDueno(quien)`.

**4. La prueba** (`test/propiedades.test.ts`): dos clientes y una llave.

```ts
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { db } from "@proges/db";
import { clavesInternas, crearEscenario, type Escenario } from "./ayuda";

let e: Escenario;
let idDeA: string;

before(async () => {
  e = await crearEscenario();
  const p = await db.property.create({
    data: { organizationId: e.ids.clienteA, tipo: "CASA", direccion: "Agustinas 715", comuna: "Santiago", region: "RM" },
  });
  idDeA = p.id;
});
after(() => e.limpiar());

test("A ve lo suyo, B no lo ve, la llave de A lo ve recortado", async () => {
  assert.equal((await e.pedir("clienteA", "GET", `/v1/propiedades/${idDeA}`)).estado, 200);
  assert.equal((await e.pedir("clienteB", "GET", `/v1/propiedades/${idDeA}`)).estado, 404);
  const conLlave = await e.pedir("llaveA", "GET", `/v1/propiedades/${idDeA}`);
  assert.equal(conLlave.estado, 200);
  assert.deepEqual(clavesInternas(conLlave.cuerpo), []);
});
```

## Permisos (`src/permisos.ts`)

Todas reciben `quien = c.get("quien")`.

| Función | Para qué | Si no |
|---|---|---|
| `espaciosQueLee(quien, filtroCliente?)` | En las listas: `where: { organizationId: { in: await espaciosQueLee(quien) } }` | — |
| `legible(quien, registro)` / `exigirLecturaEn(quien, orgId)` | Después de leer un registro por su id | 404 (no revela que existe) |
| `espacioParaEscribirEn(quien, registro.organizationId)` | Antes de escribir algo que cuelga de un registro | llave 403; ajeno 404 |
| `espacioParaCrear(quien, clienteElegido)` | Crear algo suelto (una propiedad): el cliente crea en lo suyo; el equipo elige | 400 con el campo `clienteId` |
| `exigirEscritura(quien)` | Toda ruta que crea, cambia o borra. Devuelve la persona (para anotar quién) | llave 403 |
| `exigirEquipo` / `exigirJefatura` / `exigirAdmin` / `exigirJefaturaOAdmin` | Lo que es solo de Proges | 403 |
| `exigirCliente(quien)` | Lo que hace solo el dueño (responder una oferta) | 403 |
| `esDueno(quien)` | ¿La respuesta va recortada? | — |

Nunca se usa un `organizationId` que mande la web: el espacio de una escritura sale del registro que se toca. El catálogo de servicios y los maestros viven en `ORG_PROGES` (de `@proges/db`): se leen con ese id fijo y se escriben con `exigirEquipo`, no con las funciones de espacios.

## Errores (`src/errores.ts`)

Lo previsto se lanza: `throw new ErrorApi(409, "Esa oferta ya fue respondida.")`, o con campos: `throw new ErrorApi(400, "Revisa la fecha.", { vence: "No puede ser anterior a hoy." })`. Toda respuesta con error tiene la forma `{ error: { mensaje, campos? } }`, en español y para una persona. Lo que zod rechaza responde 400 solo, con los campos (por eso cada router se crea con `nuevoRouter()`). Lo imprevisto se deja caer: queda en el registro del servidor y la persona recibe un 500 sin detalles internos. Nunca se traga una excepción.

## Plata y fechas

- La plata sale como `Monto` = `{ valor: "1500000", moneda: "CLP" }` (texto, nunca número): `aMonto(decimal, moneda)` de `util/al-contrato.ts`.
- Las fechas «solo fecha» salen como `"2026-11-19"` con `aFechaISO(fecha)`; los momentos, con `aFechaHoraISO(fecha)`. «Hoy» es `hoyChile()` de `util/fechas.ts`.

## Pruebas (`test/ayuda.ts`)

- `crearEscenario()` arma con nombres únicos: equipo, jefatura, admin (de Proges), cliente A (ATENDIDO, con su usuario), cliente B (AUTONOMO, con su usuario) y una llave de A. Devuelve `ids`, `tokens`, `app`, `pedir(quien, método, ruta, cuerpo?)` y `limpiar()`.
- `quien` en `pedir` es `"equipo" | "jefatura" | "admin" | "clienteA" | "clienteB" | "llaveA" | "anonimo"` o `{ token }`. El cuerpo puede ser un objeto (JSON) o un `FormData` (archivos). Responde `{ estado, cuerpo }`.
- Odoo, Drive y el guardado de PDF son falsos y fallan si se usan. Para usarlos, pasa tu versión: `crearEscenario({ odoo: { leerOrden: async () => ordenDePrueba } })`.
- `limpiar()` borra todo lo de los clientes A y B (cualquier tabla con `organizationId`) y las personas del escenario. Si tu prueba crea algo en `org_proges` (un maestro, un servicio del catálogo), bórralo tú antes.
- Seis piezas corren pruebas a la vez sobre la misma base: **nunca** vacíes una tabla entera ni dependas de cuántas filas hay en total; cuenta solo lo de tu escenario.
- `clavesInternas(cuerpo)` lista las claves que suenan a dato interno (costo, margen, presupuesto, factura); lo que va al dueño tiene que dar `[]`.

## Sistemas de afuera

Las rutas no importan `integraciones/odoo.ts` ni `drive.ts` directo: los piden al contexto, `c.get("dep").odoo.leerOrden("S00047")`, para que las pruebas pasen versiones falsas. Odoo es **solo lectura**. Guardar y abrir PDF todavía no está conectado (responde 503): ver `integraciones/pdf.ts`.

## Producción (Railway)

La API corre en Railway con `apps/api/railway.json`. El servicio usa la raíz del repo como carpeta (para que se instalen los workspaces) y esa ruta como archivo de configuración. Antes de publicar cada versión corre `npm run migrar-produccion -w @proges/db`: solo migra en el ambiente `production` y, si falla, Railway no publica y sigue la versión anterior. Arranca con `npm run inicio -w @proges/api` y Railway revisa `/v1/salud`. Variables: `DATABASE_URL` (Neon con pooling), `DIRECT_URL` (Neon directa, para migrar), `CLERK_SECRET_KEY`, `ODOO_*`, `GOOGLE_SERVICE_ACCOUNT_*`. `PORT` lo pone Railway.
