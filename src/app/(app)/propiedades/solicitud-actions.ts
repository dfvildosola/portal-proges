"use server";

// Acción del cliente: pedirle un servicio a Proges sobre una de sus propiedades.
//
// Es como dejar un pedido en el mesón: el cliente dice qué necesita y Proges lo ve en su
// bandeja de Operación. No abre ningún servicio ni lleva precio (se cotiza después, fuera
// del portal): solo crea una Solicitud NUEVA que el equipo acepta o rechaza.
//
// El espacio sale de la sesión (`clienteEnAccion`), nunca del formulario: lo que llega del
// navegador, incluido el id de la propiedad, se vuelve a comprobar en el servidor.

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { clienteEnAccion } from "@/lib/sesion";
import { assertProperty, enumField, toFieldErrors } from "@/lib/form-helpers";
import { ServicioTipo } from "@/generated/prisma/enums";

export type SolicitudFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  ok?: boolean; // true cuando el pedido quedó guardado: el formulario muestra el aviso
};

const pedirSchema = z.object({
  propertyId: z.string().trim().min(1, "Elige la propiedad"),
  tipo: enumField(ServicioTipo),
  descripcion: z
    .string()
    .trim()
    .min(10, "Cuéntanos un poco más (mínimo 10 caracteres)")
    .max(2000, "Máximo 2000 caracteres"),
});

export async function pedirServicio(
  _prev: SolicitudFormState,
  formData: FormData,
): Promise<SolicitudFormState> {
  const usuario = await clienteEnAccion();
  // Un cliente pide siempre en su propio espacio.
  const orgId = usuario.organizationId;

  const parsed = pedirSchema.safeParse({
    propertyId: formData.get("propertyId") ?? "",
    tipo: formData.get("tipo") ?? "",
    descripcion: formData.get("descripcion") ?? "",
  });
  if (!parsed.success) {
    return { error: "Revisa los campos.", fieldErrors: toFieldErrors(parsed.error) };
  }
  const { propertyId, tipo, descripcion } = parsed.data;

  if (!(await assertProperty(propertyId, orgId))) return { error: "Propiedad no encontrada." };

  await db.solicitud.create({
    data: {
      organizationId: orgId,
      propertyId,
      tipo,
      descripcion,
      pedidaPorId: usuario.id,
    },
  });

  // «Mis servicios» y la ficha del cliente muestran el pedido; la bandeja del equipo lo recibe.
  revalidatePath("/servicios");
  revalidatePath(`/propiedades/${propertyId}`);
  revalidatePath("/operacion");
  return { ok: true };
}
