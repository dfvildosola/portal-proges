# 0015 — Fotos y PDF en el Drive de la propiedad

Fecha: 2026-11-19 · Estado: aceptada (plan v6 de la etapa 1, d12 b y d24; aprobado por Diego)

## Contexto

El equipo anota en la bitácora de cada proyecto con fotos («fui, faltaba la llave del medidor»), recibe la obra partida por partida con fotos y guarda el PDF del presupuesto del maestro. Hay que decidir **dónde viven esos archivos**.

Hoy cada propiedad ya tiene una carpeta en el Drive de Proges (el campo `driveCarpetaId`), donde el equipo guarda sus papeles. Diego eligió (d12 b) que las fotos y los PDF queden **ahí, en el Drive de la propiedad**, y no en un almacén aparte: si mañana el portal dejara de existir, los archivos siguen en la carpeta de siempre. Y confirmó (d24) cómo entra el portal: con una cuenta de servicio, en una subcarpeta «Portal», y si la propiedad no tiene carpeta se pide enlazarla antes de subir.

## Decisión

**El portal entra a Drive con una cuenta de servicio.** Una cuenta de servicio es un usuario de Google sin persona detrás: como un empleado nuevo al que se le entrega su propia llave de la bodega, en vez de prestarle la llave de Diego. Esa llave (el correo de la cuenta y su clave privada) vive solo en el `.env` (`GOOGLE_SERVICE_ACCOUNT_EMAIL` y `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`), nunca en el código ni en un log. Si falta, el portal lo dice con un mensaje claro la primera vez que alguien sube o abre un archivo; no se cae al arrancar.

**Todo va en una subcarpeta «Portal»** dentro de la carpeta de la propiedad. El portal la crea la primera vez. Así lo que sube el portal queda separado de los papeles que el equipo ordena a mano, y se ve a simple vista qué puso cada uno. Si la propiedad no tiene carpeta enlazada, no se sube nada: se pide enlazarla (se pega la URL de la carpeta y el portal saca su id). La cuenta de servicio solo puede entrar a las carpetas que Proges le comparta con su correo, y las propiedades viven en una unidad compartida, así que todas las llamadas a Drive piden `supportsAllDrives`.

**Nunca hay enlaces públicos.** El portal no crea permisos de compartir ni enlaces «cualquiera con el enlace». El navegador pide el archivo a una ruta del propio portal (`/archivos/[driveFileId]`) y esa ruta, antes de entregarlo, comprueba quién pregunta: es el guardia de la bodega, que mira el carnet antes de entregar la caja.

- Solo entrega lo que el portal conoce: una foto de la bitácora o de una recepción, o el PDF de un presupuesto. Un id cualquiera de Drive da «No encontrado», aunque la cuenta de servicio lo pueda abrir.
- Comprueba que el archivo es de un espacio que ese usuario puede leer.
- Un **cliente** (el dueño) solo ve las fotos de notas que el equipo marcó «la ve el dueño» y las fotos de recepción; nunca el PDF del presupuesto, que trae el costo del maestro.
- Cuando algo no se puede mostrar, responde «No encontrado», para no confirmar que existe.

**En la base solo se guarda el id del archivo en Drive** (`Foto.driveFileId`, `PresupuestoMaestro.pdfDriveFileId`), con su nombre y tipo. El archivo mismo nunca está en la base.

## Alternativas descartadas

- **Vercel Blob privado** (el almacén de archivos de Vercel, que ya usa el portal para los documentos de las propiedades). Es más simple de armar: no hay cuenta de servicio ni carpetas que compartir. Se descartó porque deja las fotos en un lugar que el equipo no ve ni ordena: sería una bodega paralela, difícil de revisar y que habría que migrar si algún día se cambia de portal. Queda como el plan B si Drive diera problemas.
- **Enlaces públicos de Drive («cualquiera con el enlace»).** Cualquiera que reciba el enlace ve la foto, sin pasar por el portal, y no se puede retirar el acceso a una persona. Para fotos de la casa de un cliente no es aceptable.
- **El Drive personal de cada usuario (OAuth).** Cada persona del equipo tendría que autorizar al portal y las fotos quedarían en el Drive de quien las subió: se pierden si esa persona se va.

## Consecuencias

- **Las fotos pasan por el servidor.** El navegador se las manda al portal y el portal a Drive (y al revés al verlas). Vercel limita lo que se envía en una sola petición a **4,5 MB**: una foto de celular suele pesar más. Por eso **el navegador achica la foto antes de subirla** (unos 1.600 píxeles de lado alcanzan para ver el detalle y pesan menos de 1 MB). La pieza de la bitácora (C) lo hace; los PDF de presupuesto grandes tendrán el mismo límite y se avisa si lo pasan.
- **Las listas usan miniaturas** de Drive (`?miniatura=1`): el original solo se baja al abrir la foto. Si Drive todavía no generó la miniatura, se entrega el original.
- **Hay que crear la cuenta de servicio** en Google antes de la primera subida real, y compartirle con su correo la carpeta de cada propiedad (como «editora»). Sin eso, el portal avisa «Falta la llave de Google en el .env» o «la cuenta de servicio no tiene acceso». Mientras no exista, todo lo demás funciona; solo no se puede subir ni ver archivos.
- **Si dos personas suben a la vez a una propiedad sin subcarpeta «Portal»**, Drive podría crear dos. El portal usa siempre la más antigua; no se pierde nada, pero queda una carpeta vacía de sobra.
- **Los archivos viven en el Drive de Proges.** Si alguien borra una foto desde Drive, el portal la sigue mostrando como existente y al abrirla dice que no la encuentra.
