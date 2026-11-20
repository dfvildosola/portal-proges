"use server";
// Guarda una nota de la bitácora con sus fotos. Las fotos ya llegan achicadas desde el teléfono
// (lib/foto-achicada.ts): esta acción solo las pasa a la API como multipart (POST
// /v1/servicios/{id}/notas), que las sube al Drive de la propiedad.
import type { NotaCreada } from "@proges/contrato";
import { casillaDe, ejecutar, textoDe, type ResultadoAccion } from "@/lib/acciones";
import { llamar } from "@/lib/api";

/** Como `ResultadoAccion`, pero al salir bien trae el aviso de la API (si alguna foto no subió). */
export type ResultadoDeNota = { ok: true; aviso: string | null } | Extract<ResultadoAccion, { ok: false }>;

/** Campos: servicioId, texto, paraDueno («on» si la ve el dueño) y fotos (una o varias). */
export async function guardarNota(datos: FormData): Promise<ResultadoDeNota> {
  const servicioId = textoDe(datos, "servicioId");
  if (!servicioId) throw new Error("guardarNota: falta el servicioId en el formulario.");

  const cuerpo = new FormData();
  const texto = textoDe(datos, "texto");
  if (texto) cuerpo.set("texto", texto);
  cuerpo.set("paraDueno", casillaDe(datos, "paraDueno") ? "true" : "false");
  for (const foto of datos.getAll("fotos")) {
    // Un campo de archivo vacío llega como archivo de 0 bytes: se descarta.
    if (foto instanceof File && foto.size > 0) cuerpo.append("fotos", foto, foto.name);
  }

  let aviso: string | null = null;
  const resultado = await ejecutar(
    async () => {
      const creada = await llamar<NotaCreada>("POST", `/v1/servicios/${encodeURIComponent(servicioId)}/notas`, { cuerpo });
      aviso = creada.aviso;
    },
    { revalidar: [`/servicios/${servicioId}`, "/inicio"] },
  );
  return resultado.ok ? { ok: true, aviso } : resultado;
}
