"use server";
// Agregar una propiedad desde el portal del dueño. La API la crea siempre en la cartera de su
// propio cliente (no se manda a quién pertenece). Al crearla, la persona pasa a su ficha.
import { redirect } from "next/navigation";
import type { PropiedadDatos } from "@proges/contrato";
import { ejecutar, textoDe, type ResultadoAccion } from "@/lib/acciones";
import { llamar } from "@/lib/api";

export async function agregarPropiedad(_anterior: ResultadoAccion | null, datos: FormData): Promise<ResultadoAccion> {
  // La respuesta se guarda en un objeto: así TypeScript sabe que cambió dentro de la función de abajo.
  const salida: { creada?: PropiedadDatos } = {};
  const resultado = await ejecutar(
    async () => {
      salida.creada = await llamar<PropiedadDatos>("POST", "/v1/propiedades", {
        cuerpo: {
          tipo: textoDe(datos, "tipo"),
          direccion: textoDe(datos, "direccion") ?? "",
          comuna: textoDe(datos, "comuna") ?? "",
          region: textoDe(datos, "region") ?? "",
        },
      });
    },
    { revalidar: ["/mi/propiedades"] },
  );
  // El redirect va fuera de `ejecutar`: en Next funciona lanzando una excepción especial.
  if (resultado.ok && salida.creada) redirect(`/mi/propiedades/${encodeURIComponent(salida.creada.id)}`);
  return resultado;
}
