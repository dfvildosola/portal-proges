"use server";

// Acción del cliente: pedirle un servicio a Proges.
//
// Es como dejar un pedido en el mesón, pero el mesón anota solo en la pizarra del taller: al
// pedir se abre el proyecto en la propiedad del cliente, marcado «por revisar», y se deja una
// tarea «Revisar y repartir» para la jefatura (d26, ADR 0013). No lleva precio: se cotiza
// después, fuera del portal. El cliente puede pedir para una propiedad que ya tiene o para una
// nueva (dirección, comuna y tipo): se crea en su espacio en la misma transacción.
//
// El espacio sale de la sesión (`clienteEnAccion`), nunca del formulario: lo que llega del
// navegador, incluido el id de la propiedad, se vuelve a comprobar en el servidor. Todo lo que
// se escribe vive en `abrirPedido` (src/lib/pedidos.ts), en una sola transacción.

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { clienteEnAccion } from "@/lib/sesion";
import { enumField, toFieldErrors } from "@/lib/form-helpers";
import { abrirPedido } from "@/lib/pedidos";
import { PropertyType, ServicioTipo } from "@/generated/prisma/enums";

export type SolicitudFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  ok?: boolean; // true cuando el pedido quedó guardado: el formulario muestra el aviso
};

// Lo que se pide siempre.
const pedidoSchema = z.object({
  tipo: enumField(ServicioTipo),
  descripcion: z
    .string()
    .trim()
    .min(10, "Cuéntanos un poco más (mínimo 10 caracteres)")
    .max(2000, "Máximo 2000 caracteres"),
});

// Una propiedad que el cliente ya tiene.
const existenteSchema = z.object({
  propertyId: z.string().trim().min(1, "Elige la propiedad"),
});

// Una propiedad nueva: lo mínimo que exige Property. La región es opcional: sin ella queda
// «Por confirmar», como en la carga inicial.
const nuevaSchema = z.object({
  direccion: z.string().trim().min(1, "La dirección es obligatoria").max(200, "Máximo 200 caracteres"),
  comuna: z.string().trim().min(1, "La comuna es obligatoria").max(100, "Máximo 100 caracteres"),
  tipoPropiedad: enumField(PropertyType),
  region: z
    .string()
    .trim()
    .max(100, "Máximo 100 caracteres")
    .transform((v) => (v === "" ? "Por confirmar" : v)),
});

export async function pedirServicio(
  _prev: SolicitudFormState,
  formData: FormData,
): Promise<SolicitudFormState> {
  const usuario = await clienteEnAccion();
  // Un cliente pide siempre en su propio espacio.
  const orgId = usuario.organizationId;

  const esNueva = formData.get("propiedadNueva") === "1";
  const base = pedidoSchema.safeParse({
    tipo: formData.get("tipo") ?? "",
    descripcion: formData.get("descripcion") ?? "",
  });
  const existente = esNueva
    ? null
    : existenteSchema.safeParse({ propertyId: formData.get("propertyId") ?? "" });
  const nueva = esNueva
    ? nuevaSchema.safeParse({
        direccion: formData.get("direccion") ?? "",
        comuna: formData.get("comuna") ?? "",
        tipoPropiedad: formData.get("tipoPropiedad") ?? "",
        region: formData.get("region") ?? "",
      })
    : null;

  // Todos los errores de campo juntos, para que el formulario marque todo de una vez.
  const fieldErrors: Record<string, string> = {};
  for (const r of [base, existente, nueva]) {
    if (r && !r.success) Object.assign(fieldErrors, toFieldErrors(r.error));
  }
  if (!base.success || (existente && !existente.success) || (nueva && !nueva.success)) {
    return { error: "Revisa los campos.", fieldErrors };
  }

  const resultado = await abrirPedido({
    orgId,
    usuarioId: usuario.id,
    tipo: base.data.tipo,
    descripcion: base.data.descripcion,
    propertyId: existente?.success ? existente.data.propertyId : null,
    propiedadNueva: nueva?.success
      ? {
          direccion: nueva.data.direccion,
          comuna: nueva.data.comuna,
          region: nueva.data.region,
          tipo: nueva.data.tipoPropiedad,
        }
      : null,
  });
  if (!resultado.ok) return { error: resultado.error, fieldErrors: resultado.fieldErrors };

  // «Mis servicios» y la ficha del cliente muestran el pedido; el equipo lo ve en «Trabajo del
  // equipo» y en el número del menú (que está en el layout).
  revalidatePath("/servicios");
  revalidatePath("/propiedades");
  revalidatePath(`/propiedades/${resultado.propertyId}`);
  revalidatePath("/operacion");
  revalidatePath("/mi-trabajo");
  revalidatePath("/", "layout");
  return { ok: true };
}
