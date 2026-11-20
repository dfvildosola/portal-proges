// La forma de cada sistema de afuera que usa la API. La app recibe un objeto con esta forma
// (Dependencias, en entorno.ts) en vez de importar odoo.ts o drive.ts directo: así las pruebas
// le pasan versiones falsas y nunca tocan Odoo ni Drive de verdad. Es como un enchufe: la app
// trae el enchufe, y en la vida real se conecta al Odoo de verdad y en las pruebas a uno de juguete.
//
// Los tipos salen de lo que exportan odoo.ts y drive.ts (`typeof`), así que si esos archivos
// cambian una función, esto cambia solo.
import type * as odoo from "./odoo";
import type * as drive from "./drive";

// Odoo, solo lectura (ver la promesa al comienzo de odoo.ts).
export type Odoo = Pick<typeof odoo, "leerOrden" | "buscarProveedores" | "facturasDeProveedor" | "leerFacturas">;

// Las fotos en el Drive de cada propiedad. `idDeCarpeta` no va aquí: no habla con Drive, es una
// función pura que se importa directo.
export type Drive = Pick<typeof drive, "subirArchivo" | "leerArchivo" | "miniatura">;

// Donde se guardan los PDF de los documentos de una propiedad. La API los recibe, los guarda y
// los entrega revisando el permiso: nunca con un enlace público.
export interface GuardadoPdf {
  // Guarda el archivo en `ruta` (por ejemplo «<cliente>/propiedades/<id>/<uuid>.pdf») y devuelve la
  // clave con que se lo vuelve a pedir: es lo que se anota en Document.blobKey.
  guardar(archivo: { ruta: string; mime: string; datos: Uint8Array }): Promise<{ clave: string }>;
  leer(clave: string): Promise<{ datos: Uint8Array; mime: string }>;
  borrar(clave: string): Promise<void>;
}
