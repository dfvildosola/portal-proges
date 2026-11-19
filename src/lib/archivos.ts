// Fotos y PDF en el Drive de la propiedad (ADR 0015).
//
// El portal entra a Google Drive con una «cuenta de servicio»: un usuario de Google sin
// persona detrás, que es como un empleado con su propia llave de la bodega. Quien administra
// el Drive le da acceso a las carpetas de las propiedades (compartiéndolas con su correo) y el
// portal, con esa llave, guarda y lee archivos en una subcarpeta «Portal» de cada una.
//
// Reglas que no se rompen:
//  - Nunca se crea un permiso de compartir ni un enlace público: el archivo solo se ve a través
//    de la ruta /archivos/[driveFileId], que antes revisa quién pregunta.
//  - La llave vive solo en el .env (GOOGLE_SERVICE_ACCOUNT_EMAIL y
//    GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY). Falta de llave = error claro, pero solo al usar
//    una función, nunca al importar el archivo.
//  - Todo con supportsAllDrives=true: las carpetas viven en una unidad compartida.
//
// Es de SERVIDOR: la llave no puede llegar al navegador. Sin dependencias: la firma del token
// se hace con node:crypto y el resto es fetch.

import { createSign } from "node:crypto";

const API = "https://www.googleapis.com/drive/v3";
const SUBIDA = "https://www.googleapis.com/upload/drive/v3";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const ALCANCE = "https://www.googleapis.com/auth/drive";
const CARPETA_MIME = "application/vnd.google-apps.folder";
export const NOMBRE_SUBCARPETA = "Portal";

const FALTA_LLAVE =
  "Falta la llave de Google en el .env: pídele a Diego que cree la cuenta de servicio.";

// ----------------------------------------------------------------------------
// Token de la cuenta de servicio
// ----------------------------------------------------------------------------

const base64url = (datos: string | Buffer) => Buffer.from(datos).toString("base64url");

// El token dura una hora: se guarda en memoria hasta un minuto antes de que venza.
let token: { valor: string; venceEn: number } | null = null;

async function tokenDeAcceso(): Promise<string> {
  if (token && Date.now() < token.venceEn) return token.valor;

  const correo = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const llave = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (!correo || !llave) throw new Error(FALTA_LLAVE);

  // Google pide un «JWT»: un papel con quién pide (correo), qué pide (alcance) y hasta cuándo,
  // firmado con la llave privada. Es la firma del empleado en el vale de bodega.
  const ahora = Math.floor(Date.now() / 1000);
  const encabezado = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const cuerpo = base64url(
    JSON.stringify({ iss: correo, scope: ALCANCE, aud: TOKEN_URL, iat: ahora, exp: ahora + 3600 }),
  );
  const firmante = createSign("RSA-SHA256");
  firmante.update(`${encabezado}.${cuerpo}`);
  // En el .env la llave suele quedar en una línea, con los saltos escritos como «\n».
  const firma = firmante.sign(llave.replace(/\\n/g, "\n")).toString("base64url");

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${encabezado}.${cuerpo}.${firma}`,
    }),
  });
  if (!res.ok) {
    throw new Error(`Google no aceptó la llave de la cuenta de servicio (${res.status}): revisa el .env.`);
  }
  const json = (await res.json()) as { access_token: string; expires_in: number };
  token = { valor: json.access_token, venceEn: Date.now() + (json.expires_in - 60) * 1000 };
  return token.valor;
}

// Una llamada a Drive con el token puesto. Si Drive responde con error, dice cuál y qué hacer.
async function drive(url: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${await tokenDeAcceso()}` },
    cache: "no-store",
  });
  if (res.ok) return res;
  if (res.status === 404) {
    throw new Error(
      "Drive no encuentra el archivo o la carpeta: puede que la cuenta de servicio no tenga acceso. Comparte la carpeta de la propiedad con su correo.",
    );
  }
  if (res.status === 403) {
    throw new Error("Drive negó el permiso a la cuenta de servicio: debe ser editora de la carpeta de la propiedad.");
  }
  throw new Error(`Drive respondió ${res.status}.`);
}

// ----------------------------------------------------------------------------
// Carpetas
// ----------------------------------------------------------------------------

// Los ids de Drive son letras, números, guion y guion bajo. Se comprueba antes de armar una
// búsqueda con ellos, para que nadie cuele otra condición.
const ID_DRIVE = /^[A-Za-z0-9_-]{10,}$/;

// Saca el id de una carpeta de Drive desde lo que alguien pegue: la URL
// (drive.google.com/drive/folders/<id>?…, …/u/0/folders/<id>, …open?id=<id>) o el id suelto.
// Devuelve null si no parece ninguna de las dos: quien llama le dice a la persona qué pegar.
export function idDeCarpeta(textoOUrl: string): string | null {
  const t = textoOUrl.trim();
  if (ID_DRIVE.test(t)) return t;
  const enRuta = t.match(/\/folders\/([A-Za-z0-9_-]{10,})/);
  if (enRuta) return enRuta[1];
  const enParametro = t.match(/[?&]id=([A-Za-z0-9_-]{10,})/);
  return enParametro ? enParametro[1] : null;
}

// La subcarpeta «Portal» ya conocida de cada carpeta de propiedad, para no preguntarle a Drive
// en cada subida. Se pierde al reiniciar el servidor, y no pasa nada: se vuelve a buscar.
const carpetasPortal = new Map<string, string>();

// Busca la subcarpeta «Portal» dentro de la carpeta de la propiedad y, si falta, la crea.
export async function carpetaPortal(driveCarpetaId: string): Promise<string> {
  if (!ID_DRIVE.test(driveCarpetaId)) throw new Error("El id de la carpeta de Drive de esta propiedad no es válido.");
  const conocida = carpetasPortal.get(driveCarpetaId);
  if (conocida) return conocida;

  const q = `'${driveCarpetaId}' in parents and name='${NOMBRE_SUBCARPETA}' and mimeType='${CARPETA_MIME}' and trashed=false`;
  const busqueda = new URLSearchParams({
    q,
    fields: "files(id)",
    orderBy: "createdTime",
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true",
  });
  const encontradas = (await (await drive(`${API}/files?${busqueda}`)).json()) as { files: { id: string }[] };
  if (encontradas.files.length > 0) {
    carpetasPortal.set(driveCarpetaId, encontradas.files[0].id);
    return encontradas.files[0].id;
  }

  const creada = (await (
    await drive(`${API}/files?supportsAllDrives=true&fields=id`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: NOMBRE_SUBCARPETA, mimeType: CARPETA_MIME, parents: [driveCarpetaId] }),
    })
  ).json()) as { id: string };
  carpetasPortal.set(driveCarpetaId, creada.id);
  return creada.id;
}

// ----------------------------------------------------------------------------
// Archivos
// ----------------------------------------------------------------------------

// Sube un archivo a la subcarpeta «Portal» de la propiedad y devuelve su id de Drive (lo que
// se guarda en la base). Sin carpeta enlazada no sube: se pide enlazarla primero.
export async function subirArchivo(datosDelArchivo: {
  property: { driveCarpetaId: string | null };
  nombre: string;
  mime: string;
  datos: Buffer | Uint8Array;
}): Promise<{ driveFileId: string }> {
  const { property, nombre, mime, datos } = datosDelArchivo;
  if (!property.driveCarpetaId) {
    throw new Error("Esta propiedad no tiene carpeta de Drive: enlázala antes de subir el primer archivo.");
  }
  const carpeta = await carpetaPortal(property.driveCarpetaId);

  // Subida «multipart»: un solo envío con dos partes, los datos del archivo (nombre y carpeta)
  // y su contenido.
  const frontera = `portal-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  const cuerpo = Buffer.concat([
    Buffer.from(
      `--${frontera}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
        `${JSON.stringify({ name: nombre, parents: [carpeta] })}\r\n` +
        `--${frontera}\r\nContent-Type: ${mime}\r\n\r\n`,
    ),
    Buffer.from(datos),
    Buffer.from(`\r\n--${frontera}--`),
  ]);
  const res = await drive(`${SUBIDA}/files?uploadType=multipart&supportsAllDrives=true&fields=id`, {
    method: "POST",
    headers: { "Content-Type": `multipart/related; boundary=${frontera}` },
    body: new Uint8Array(cuerpo),
  });
  const { id } = (await res.json()) as { id: string };
  return { driveFileId: id };
}

// Trae un archivo de Drive entero. Quien lo llama (la ruta /archivos) ya comprobó el permiso.
export async function leerArchivo(driveFileId: string): Promise<{ datos: Buffer; mime: string; nombre: string }> {
  if (!ID_DRIVE.test(driveFileId)) throw new Error("El id del archivo de Drive no es válido.");
  const ficha = (await (
    await drive(`${API}/files/${driveFileId}?fields=name,mimeType&supportsAllDrives=true`)
  ).json()) as { name: string; mimeType: string };
  const contenido = await drive(`${API}/files/${driveFileId}?alt=media&supportsAllDrives=true`);
  return { datos: Buffer.from(await contenido.arrayBuffer()), mime: ficha.mimeType, nombre: ficha.name };
}

// La miniatura que Drive genera de una foto o un PDF, o null si todavía no la tiene. Sirve para
// las listas: el original solo se baja al abrirlo (R16 del plan).
export async function miniatura(driveFileId: string, ancho = 400): Promise<{ datos: Buffer; mime: string } | null> {
  if (!ID_DRIVE.test(driveFileId)) throw new Error("El id del archivo de Drive no es válido.");
  const ficha = (await (
    await drive(`${API}/files/${driveFileId}?fields=thumbnailLink&supportsAllDrives=true`)
  ).json()) as { thumbnailLink?: string };
  if (!ficha.thumbnailLink) return null;
  // El enlace trae un tamaño al final («=s220»): se cambia por el que se pidió.
  const res = await fetch(ficha.thumbnailLink.replace(/=s\d+$/, `=s${ancho}`), { cache: "no-store" });
  if (!res.ok) return null;
  return { datos: Buffer.from(await res.arrayBuffer()), mime: res.headers.get("content-type") ?? "image/jpeg" };
}
