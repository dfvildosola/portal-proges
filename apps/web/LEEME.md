# La web de Proges (apps/web)

Next.js 16 con Tailwind 4. Es el portal del equipo de Proges (la etapa 3 agrega el del dueño). **La web nunca toca la base de datos**: le pide todo a la API (`apps/api`), igual que el sistema de un cliente con su llave. Piensa en un restaurante: la web es el salón y la API es la cocina; el salón no entra a la bodega, hace el pedido y la cocina decide qué puede servir a quién.

Antes de escribir código de la web, lee la guía que corresponda en `node_modules/next/dist/docs/` (en la raíz del repo): Next 16 cambió muchas cosas (por ejemplo, `middleware` ahora es `proxy`, y `params` y `searchParams` son promesas).

## Comandos (desde la raíz del repo)

| Qué | Comando |
|---|---|
| Levantar la web en el Mac | `npm run dev -w @proges/web` → http://localhost:3000 (necesita la API en el 3001: `PORT=3001 npm run dev -w @proges/api`) |
| Tipos / lint de la web | `npm run tipos -w @proges/web` / `npm run lint -w @proges/web` |
| Build | `npm run build -w @proges/web` (no lo corras con `next dev` encendido: se pisan la caché) |
| Todo (antes de decir listo) | `npm run verificar` |

Las variables viven en `apps/web/.env.local` (ignorado por git): `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` y `API_URL`. Nunca las muestres ni las escribas en el código.

## Cómo está armada

```
apps/web/src/
  proxy.ts                  el portero: pide sesión de Clerk en todo menos /entrar
  app/
    layout.tsx              raíz: tipografías, Clerk, tooltips
    globals.css             LOS COLORES (tokens de la maqueta) y su conexión con Tailwind
    page.tsx                «/» manda a cada uno a su inicio
    entrar/  sin-acceso/  mi/  archivos/[tipo]/[id]/
    (equipo)/               las pantallas del equipo; layout.tsx pone menú, barra y cabecera
      hoy anotar inicio repartir servicios servicios/[id] propiedades propiedades/[id] resultados configuracion
  lib/
    api.ts                  el ÚNICO que llama a la API (solo servidor)
    acciones.ts             patrón de server actions (servidor)
    usar-formulario.ts      hook de formularios (navegador)
    formato.ts              plata y fechas
    etiquetas.ts            nombres en pantalla de las listas de la API (NOTARIA → «Notaría»)
    archivos.ts             direcciones de fotos y PDF
    utils.ts                cn() para clases
  componentes/
    ui/                     piezas básicas (botón, campo, diálogo…)
    comunes/                piezas de Proges (Monto, Fecha, ChipEsperando…)
    layout/                 menú lateral, barra de abajo, cabecera
    obra/panel-obra.tsx  venta/panel-venta.tsx    (provisorios; los reemplazan M y N)
```

## Quién edita qué

Cada pieza edita **solo** sus carpetas. Si necesitas cambiar algo que no es tuyo, no lo hagas: anótalo como duda con el cambio exacto.

| Pieza | Carpetas |
|---|---|
| J | `app/(equipo)/hoy/`, `app/(equipo)/anotar/`, `componentes/tareas/`, `lib/foto-achicada.ts` |
| K | `app/(equipo)/inicio/`, `app/(equipo)/repartir/` |
| L | `app/(equipo)/servicios/` (incluida la ficha `servicios/[id]`), `componentes/servicio/` |
| M | `componentes/obra/` |
| N | `componentes/venta/` |
| O | `app/(equipo)/propiedades/`, `componentes/ficha/` |
| P | `app/(equipo)/resultados/`, `app/(equipo)/configuracion/` |

Todo lo demás de `apps/web` (`lib/`, `componentes/ui/`, `componentes/comunes/`, `componentes/layout/`, los layouts, `globals.css`, `proxy.ts`) es de la base y en J a P nadie lo edita.

`PanelObra` y `PanelVenta` son los dos componentes que la ficha del servicio (L) usa y que escriben M y N. Su interfaz ya está fijada y **no cambia**: `<PanelObra servicioId={id} modo="equipo" />` y `<PanelVenta servicioId={id} modo="equipo" />`. El `modo` (`"equipo"` o `"dueno"`) lo usa también el portal del dueño en la etapa 3, así que cada panel decide qué muestra según el modo (el dueño nunca ve costos de maestros ni márgenes; la API ya los recorta, pero el componente no los dibuja).

## Cómo pide datos una pantalla

Una página es un **Server Component** (corre en el servidor): pide lo que necesita con `pedir`, que llama a la API con la sesión de quien mira. Los tipos salen de `@proges/contrato`; en `packages/contrato/src/<área>.ts` está qué recibe y qué entrega cada endpoint (y en http://localhost:3001/docs).

```tsx
// app/(equipo)/servicios/[id]/page.tsx
import type { ServicioFicha } from "@proges/contrato";
import { pedir } from "@/lib/api";

export default async function Pagina({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;                       // en Next 16, params es una promesa
  const servicio = await pedir<ServicioFicha>(`/v1/servicios/${id}`);
  return <h1>{servicio.nombre}</h1>;
}
```

- `pedir<T>(ruta, { consulta })` hace un GET. Con filtros: `pedir<Lista>("/v1/servicios", { consulta: { vista: "tablero", cliente: id } })` (lo vacío o `undefined` se omite).
- **Los problemas de sesión y permiso se resuelven solos**: 401 → `/entrar`, 403 → `/sin-acceso`, 404 → la página «No se encontró lo que buscas». No hace falta atraparlos.
- `yo()` dice quién está conectado (`GET /v1/yo`). Se puede llamar desde el layout, la página y los componentes: la API se consulta una sola vez por petición.
- **Una pieza que puede fallar sin tumbar la pantalla** (por ejemplo, algo que depende de Odoo, que a veces no responde): atrapa el `ErrorDeApi` y muestra su mensaje en ese bloque. En producción Next esconde el texto de los errores del servidor, así que solo atrapándolo se ve el mensaje real:

```tsx
try {
  datos = await pedir<Obra>(`/v1/servicios/${id}/obra`);
} catch (error) {
  if (error instanceof ErrorDeApi) return <ErrorDeCarga mensaje={error.mensaje} />;
  throw error;                                        // lo inesperado sube, nunca se traga
}
```

- Varias cosas independientes: pídelas a la vez con `Promise.all([pedir(...), pedir(...)])`, no una tras otra.
- **No uses `fetch`, ni `process.env.API_URL`, ni `@proges/db`** en una pantalla. Todo pasa por `lib/api.ts`.
- **Fotos y PDF**: el navegador no puede pedirlos a la API (no tiene el token). Usa `urlDeArchivo("foto", id, { miniatura: true })` de `lib/archivos.ts` para el `src` o el enlace: la web los trae de la API con la sesión de quien mira. Tipos: `"foto"`, `"documento"`, `"presupuesto"`.

Si a tu pantalla le falta un endpoint o un campo, **no lo inventes**: déjala lista con un aviso «todavía no disponible» y anótalo en `faltaEnLaApi`.

## Cómo funciona un formulario

Un formulario son tres piezas: una **server action** (guarda, en el servidor), el hook **`useFormulario`** (muestra el resultado) y los campos.

**1. La acción**, en un archivo propio de tu carpeta que empieza con `"use server"`. Lee el FormData, llama a la API con `llamar` y devuelve lo que entrega `ejecutar`:

```ts
// app/(equipo)/servicios/[id]/acciones.ts
"use server";
import { ejecutar, textoDe, type ResultadoAccion } from "@/lib/acciones";
import { llamar } from "@/lib/api";

export async function crearTarea(_anterior: ResultadoAccion | null, datos: FormData): Promise<ResultadoAccion> {
  const servicioId = textoDe(datos, "servicioId");
  return ejecutar(
    () =>
      llamar("POST", `/v1/servicios/${servicioId}/tareas`, {
        // Un objeto se manda como JSON. Si pasas el FormData tal cual, va como multipart (fotos y PDF).
        cuerpo: { que: textoDe(datos, "que"), vence: textoDe(datos, "vence") ?? null },
      }),
    { revalidar: [`/servicios/${servicioId}`] }, // las pantallas que muestran estos datos se refrescan
  );
}
```

`ejecutar` devuelve `{ ok: true }` o `{ ok: false, error, campos }` y **no lanza** cuando la API rechaza: `error` es el mensaje de la API y `campos` dice qué le pasa a cada campo. Lo inesperado (un error de programación) sí sube. Los números y la plata viajan como texto; los formularios con archivos van como multipart.

**2. El formulario**, un componente de cliente que usa el hook:

```tsx
"use client";
import { CampoFormulario } from "@/componentes/comunes/campo-formulario";
import { ErrorDeFormulario } from "@/componentes/comunes/error-de-formulario";
import { Boton } from "@/componentes/ui/boton";
import { CampoTexto } from "@/componentes/ui/campo-texto";
import { useFormulario } from "@/lib/usar-formulario";
import { crearTarea } from "./acciones";

export function FormularioDeTarea({ servicioId }: { servicioId: string }) {
  const { formProps, pendiente, errorGeneral, errorDe } = useFormulario(crearTarea);
  return (
    <form {...formProps} className="flex flex-col gap-3">
      <input type="hidden" name="servicioId" value={servicioId} />
      <CampoFormulario etiqueta="Qué hay que hacer" error={errorDe("que")}>
        <CampoTexto name="que" />
      </CampoFormulario>
      <CampoFormulario etiqueta="Para cuándo" error={errorDe("vence")}>
        <CampoTexto name="vence" type="date" />
      </CampoFormulario>
      <ErrorDeFormulario mensaje={errorGeneral} />
      <Boton type="submit" disabled={pendiente}>{pendiente ? "Guardando…" : "Agregar tarea"}</Boton>
    </form>
  );
}
```

El hook se encarga de que, **si algo falla, lo que la persona escribió se queda** (React 19 vacía los formularios al enviarlos; aquí solo se vacía cuando sale bien). `useFormulario(accion, { alExito })` permite cerrar un diálogo al guardar; `vaciarAlExito: false` evita vaciarlo. Para leer una casilla en la acción usa `casillaDe(datos, "campo")`, y para un archivo `archivoDe(datos, "campo")`. Para algo que no es un formulario (marcar una tarea hecha con un toque) llama a la acción directamente desde un `onClick` con `startTransition`, o usa `ejecutar` igual.

## Plata y fechas

Siempre con `lib/formato.ts` (o los componentes `Monto` y `Fecha`). Nunca armes un texto de plata o de fecha a mano.

- **Plata**: la API la entrega como `{ valor: "1234567", moneda: "CLP" }` (texto, no número, porque un número de JavaScript redondea). `<Monto valor={x.precio} />` o `formatearMonto(monto)` → `$ 1.234.567`, `UF 1.234,56`. Un monto `null` se escribe «—». Nunca conviertas la plata a `number` para sumar o comparar: los cálculos son de la API.
- **Fechas «solo fecha»** (`2026-11-19`): `fechaCorta` «19 nov», `fechaConAnio` «19 nov 2026», `fechaAuto` (con año solo si no es de este año), `fechaConDia` «jue 19 nov», `fechaDelDia` «jueves 19 de noviembre», `haceCuanto` «hace 3 días». En JSX: `<Fecha valor={f} formato="relativa" />`.
- **Momentos exactos** (`2026-11-19T15:20:00.000Z`): `horaChile` «12:20»; `diaChile` los pasa a su día en Chile; `<Fecha formato="hora" />`.
- **Comparar fechas**: `hoyChile()` da «AAAA-MM-DD» de hoy en Chile; `diasEntre(desde, hasta?)` cuenta días. Como el formato es AAAA-MM-DD, `fecha < hoyChile()` también sirve para saber si algo está atrasado.
- **Nunca `new Date("2026-11-19")` seguido de métodos locales** (`getDate()`, `toLocaleDateString()`): producción corre en UTC y el Mac en hora de Chile, y daría días distintos.

## Los componentes que hay

En `componentes/ui/` (piezas básicas, ya con los colores de Proges):

| Componente | Para qué |
|---|---|
| `Boton`, `estiloBoton` | Botón (`variante`: principal, contorno, suave, fantasma, peligro; `tamano`: normal, chico, icono). `estiloBoton()` en un `<Link>` lo viste de botón |
| `CampoTexto`, `AreaTexto` | Campo de una línea y de varias |
| `Select` | Lista desplegable (el `<select>` del navegador, con estilo: en celular abre el selector del teléfono) |
| `Casilla` | Casilla de verificación con su texto |
| `Dialogo*` | Ventana al centro que pide confirmar o llenar algo corto |
| `Hoja*` | Panel que se desliza (`lado="abajo"` en celular, `"derecha"` en computador) |
| `Menu*` | Menú desplegable de acciones |
| `Pestanas`, `PestanasLista`, `Pestana`, `PestanaPanel` | Pestañas |
| `Tabla*` | Tabla (se desliza de lado en celular) |
| `Insignia` | Etiqueta chica de color (`tono`: neutro, ink, ok, warn, bad) |
| `Tarjeta`, `TarjetaTitulo` | Panel (`tono="panel"`) o elemento dentro de un panel (`tono="item"`) |
| `Tooltip*` | Globito de ayuda (nada importante vive solo ahí: en celular no existe) |

En `componentes/comunes/` (piezas de Proges):

| Componente | Para qué |
|---|---|
| `Monto`, `Fecha` | Plata y fechas escritas como corresponde |
| `Vacio` | Estado vacío con un texto («No hay tareas para hoy»). Una lista vacía siempre dice algo |
| `ErrorDeCarga` | Mensaje de error de un bloque, con «Intentar de nuevo» opcional |
| `ChipEsperando` | A quién se espera y desde cuándo (recibe `servicio.esperando`); rojo pasados 10 días, «Nos toca» si es null |
| `ChipEstado` | Estado de un servicio (En curso, Terminado, Cancelado, Nuevo · sin repartir, Por confirmar) |
| `Seccion` | Título chico en mayúsculas + contenido |
| `EncabezadoDePagina` | Título de la pantalla, línea de apoyo y botones |
| `CampoFormulario` | Etiqueta + control + ayuda + error de ese campo (si hay error, el borde se pone rojo solo) |
| `ErrorDeFormulario` | El mensaje general de un formulario que falló |
| `EnConstruccion` | El esqueleto provisorio que cada pieza reemplaza |

Los colores se usan por nombre, nunca en hex: `bg-bg`, `bg-card`, `bg-scr` (fondo de un elemento dentro de una tarjeta), `text-fg`, `text-soft`, `border-line`, `bg-ink` / `text-ink` / `bg-ink-soft` (marca), `text-ok` `bg-ok-soft`, `text-warn` `bg-warn-soft`, `text-bad` `bg-bad-soft`. Cambian solos en modo oscuro. Si falta un color, no lo inventes: anótalo. Los íconos son de `lucide-react`. Para juntar clases: `cn(...)` de `lib/utils`.

## Reglas de celular y de computador

- **Quién usa qué**: Hoy y Anotar son para el celular (François y Leo, en terreno); el resto se usa sobre todo en el computador pero **todo tiene que verse bien a 390 px** sin scroll horizontal de la página.
- **Un punto de quiebre: `lg` (1024 px)**. Menos de 1024: barra de abajo y una columna. Desde 1024: menú lateral y varias columnas. No inventes otros quiebres para el marco; dentro de tu pantalla puedes usar `sm:`, `md:` y `lg:`.
- **Se diseña primero para el celular**: las clases sin prefijo son las del celular; `lg:` agrega lo del computador (`grid grid-cols-1 lg:grid-cols-3`).
- **Dedo, no mouse**: zonas tocables de al menos 44 px de alto en celular (`Boton`, `Casilla`, `Select` y `CampoTexto` ya lo hacen). Una acción frecuente va al alcance del pulgar, abajo, no arriba.
- **Los campos de texto quedan en 16 px en celular** (`globals.css` lo asegura): con menos, el teléfono amplía la pantalla al tocarlos.
- **Márgenes**: el layout ya deja 16 px a los lados en celular y 24 en computador; las pantallas no agregan los suyos. El contenido tiene espacio abajo para no quedar tapado por la barra.
- **Las tablas** se deslizan de lado dentro de su cuadro (`Tabla`). En celular, si una tabla es lo principal, mejor mostrar cada fila como tarjeta.
- **Zona segura**: `env(safe-area-inset-bottom)` en lo que se pega al borde de abajo (la barra y las hojas ya lo hacen).
- **Textos**: en español, sin jerga, sin emojis. Un error le dice a la persona qué pasó y qué hacer.
- **Un archivo no pasa de 800 líneas y cada componente va en su archivo.** Los comentarios explican el porqué en lenguaje simple.

## El marco del equipo

`app/(equipo)/layout.tsx` pregunta `yo()`: si quien entra no es del equipo (un dueño o una llave), lo manda a `/mi`. El menú lateral muestra **Resultados** a la jefatura y al administrador (como exige la API) y **Configuración** solo al administrador. «/» manda al equipo a **Hoy** en celular y a **Inicio** en computador (por el tipo de aparato).

Las pantallas del dueño (`app/(dueno)/`, etapa 3) usarán su propio layout; hoy un dueño solo ve `/mi` («Tu portal está en construcción»).
