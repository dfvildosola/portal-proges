// El guardado real de los PDF de documentos, en Vercel Blob (ADR 0016).
//
// Piensa en una bodega con casilleros: la API deja el archivo en un casillero con un nombre
// imposible de adivinar (lleva un UUID) y anota en la base la dirección del casillero
// (Document.blobKey). Esa dirección NUNCA sale de la API: quien quiere el PDF lo pide a
// GET /v1/documentos/:id/archivo, y la API primero revisa que pueda verlo y después va a
// buscarlo. El portal viejo entregaba el enlace directo; aquí ya no.
//
// Es de SERVIDOR: el token (BLOB_READ_WRITE_TOKEN) vive solo en el .env de la API.
//
// La librería `@vercel/blob` se carga recién al usarse, no al arrancar la API: así la API
// levanta aunque todavía no esté instalada o no haya token, y lo único que falla, con un
// mensaje claro, es subir o abrir un PDF. servidor.ts le pasa `crearGuardadoBlob()` a la app.
import { ErrorApi } from "../errores";
import type { GuardadoPdf } from "./tipos";

// Lo mínimo de @vercel/blob que se usa, para no depender de que su tipo esté instalado.
type LibreriaBlob = {
  put(
    ruta: string,
    cuerpo: Uint8Array,
    opciones: { access: "public"; addRandomSuffix: false; contentType: string; token: string },
  ): Promise<{ url: string }>;
  del(url: string, opciones: { token: string }): Promise<void>;
};

async function cargarLibreria(): Promise<LibreriaBlob> {
  // El nombre va en una variable para que TypeScript no exija el paquete al compilar.
  const nombre = "@vercel/blob";
  try {
    return (await import(nombre)) as LibreriaBlob;
  } catch (error) {
    throw new Error("No se pudo cargar @vercel/blob: falta instalarlo en apps/api (npm install @vercel/blob -w @proges/api).", {
      cause: error,
    });
  }
}

function tokenDeBlob(): string {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new ErrorApi(503, "Guardar y abrir PDF no está configurado: falta BLOB_READ_WRITE_TOKEN en la API.");
  }
  return token;
}

export function crearGuardadoBlob(): GuardadoPdf {
  return {
    async guardar({ ruta, mime, datos }) {
      const token = tokenDeBlob();
      const blob = await cargarLibreria();
      const guardado = await blob.put(ruta, datos, { access: "public", addRandomSuffix: false, contentType: mime, token });
      // La clave es la dirección del casillero: solo la API la usa.
      return { clave: guardado.url };
    },

    async leer(clave) {
      const token = tokenDeBlob();
      const respuesta = await fetch(clave, { headers: { authorization: `Bearer ${token}` } });
      if (!respuesta.ok) {
        throw new Error(`Vercel Blob respondió ${respuesta.status} al pedir el archivo ${clave}.`);
      }
      return {
        datos: new Uint8Array(await respuesta.arrayBuffer()),
        mime: respuesta.headers.get("content-type") ?? "application/pdf",
      };
    },

    async borrar(clave) {
      const token = tokenDeBlob();
      const blob = await cargarLibreria();
      await blob.del(clave, { token });
    },
  };
}
