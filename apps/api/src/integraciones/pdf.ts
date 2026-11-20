// El guardado real de los PDF de documentos, todavía sin conectar.
//
// El plan dice que los PDF van a Vercel Blob (apps/api/src/integraciones/blob.ts), pero esa
// librería no estaba entre las aprobadas para la pieza B, y el portal viejo los guardaba con
// enlace público, que el plan prohíbe. Mientras se decide, la API arranca igual y lo único que
// falla, con un mensaje claro, es subir o abrir un PDF.
import { ErrorApi } from "../errores";
import type { GuardadoPdf } from "./tipos";

function sinConectar(): never {
  throw new ErrorApi(503, "Guardar y abrir PDF todavía no está conectado en la API de Proges.");
}

export const pdfSinConectar: GuardadoPdf = {
  guardar: async () => sinConectar(),
  leer: async () => sinConectar(),
  borrar: async () => sinConectar(),
};
