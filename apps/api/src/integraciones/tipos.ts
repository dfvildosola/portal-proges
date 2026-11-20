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
export type Odoo = Pick<typeof odoo, "leerOrden" | "buscarProveedores" | "leerProveedor" | "facturasDeProveedor" | "leerFacturas">;

// Los archivos (fotos y PDF) en el Drive de cada propiedad. `idDeCarpeta` y `esIdDeArchivo` no van
// aquí: no hablan con Drive, son funciones puras que se importan directo.
export type Drive = Pick<typeof drive, "subirArchivo" | "leerArchivo" | "miniatura" | "borrarArchivo" | "comprobarCarpeta">;
