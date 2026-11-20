// Entrega al navegador una foto o un PDF que vive en la API (que a su vez lo trae del Drive de la
// propiedad). El navegador pide /archivos/foto/<id>, esta ruta le pide el archivo a la API con la
// sesión de quien pregunta, y la API decide si puede verlo. Es una ruta fija por tipo (no un
// «pasa lo que sea»): solo estos tres archivos se entregan así.
import { ErrorDeApi, pedirArchivo } from "@/lib/api";

const RUTAS: Record<string, (id: string) => string> = {
  foto: (id) => `/v1/fotos/${encodeURIComponent(id)}`,
  documento: (id) => `/v1/documentos/${encodeURIComponent(id)}/archivo`,
  presupuesto: (id) => `/v1/presupuestos/${encodeURIComponent(id)}/archivo`,
};

function respuestaDeError(status: number, mensaje: string): Response {
  return Response.json({ error: { mensaje } }, { status });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tipo: string; id: string }> },
): Promise<Response> {
  const { tipo, id } = await params;
  const ruta = RUTAS[tipo];
  if (!ruta) return respuestaDeError(404, "No se encontró lo que buscas.");

  const miniatura = new URL(request.url).searchParams.get("miniatura") === "1" && tipo === "foto";
  try {
    const archivo = await pedirArchivo(ruta(id), miniatura ? { miniatura: "1" } : undefined);
    // Se pasan solo los encabezados que importan; la caché es «private»: solo el navegador de quien
    // pidió puede guardar el archivo, nunca una caché compartida.
    const cabeceras = new Headers({ "Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff" });
    for (const nombre of ["Content-Type", "Content-Disposition"]) {
      const valor = archivo.headers.get(nombre);
      if (valor) cabeceras.set(nombre, valor);
    }
    return new Response(archivo.body, { status: 200, headers: cabeceras });
  } catch (error) {
    if (error instanceof ErrorDeApi) return respuestaDeError(error.status, error.mensaje);
    throw error;
  }
}
