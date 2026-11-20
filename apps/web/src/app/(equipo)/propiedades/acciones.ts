"use server";
// Crear una propiedad desde la lista. Al crearla, la persona pasa directo a su ficha para seguir
// llenando datos (valor, compra, carpeta de Drive…).
import { redirect } from "next/navigation";
import type { PropiedadDatos } from "@proges/contrato";
import { ejecutar, textoDe, type ResultadoAccion } from "@/lib/acciones";
import { llamar } from "@/lib/api";

export async function crearPropiedad(_anterior: ResultadoAccion | null, datos: FormData): Promise<ResultadoAccion> {
  // La respuesta se guarda en un objeto: así TypeScript sabe que cambió dentro de la función de abajo.
  const salida: { creada?: PropiedadDatos } = {};
  const resultado = await ejecutar(
    async () => {
      salida.creada = await llamar<PropiedadDatos>("POST", "/v1/propiedades", {
        cuerpo: {
          clienteId: textoDe(datos, "clienteId"),
          tipo: textoDe(datos, "tipo"),
          direccion: textoDe(datos, "direccion") ?? "",
          comuna: textoDe(datos, "comuna") ?? "",
          region: textoDe(datos, "region") ?? "",
          rolSII: textoDe(datos, "rolSII") ?? null,
        },
      });
    },
    { revalidar: ["/propiedades"] },
  );
  // El redirect va fuera de `ejecutar`: en Next funciona lanzando una excepción especial.
  if (resultado.ok && salida.creada) redirect(`/propiedades/${encodeURIComponent(salida.creada.id)}`);
  return resultado;
}
