"use server";

// Facturas del maestro asignadas a un proyecto (Pieza E).
//
// El maestro le factura a Proges y esa factura (si está en Odoo) puede cubrir una o varias obras.
// Aquí el equipo decide cuánto de cada factura es de ESTE proyecto: eso es una «asignación». Del
// Odoo solo se guarda el id de la factura y el monto asignado; su total, su estado y su pago se
// leen de Odoo cada vez que se mira. Si la factura no está en Odoo, se anota a mano («fuera de
// Odoo») con su monto y si está pagada.
//
// Regla de plata: la suma asignada de una factura, entre TODOS los proyectos, nunca pasa su total.
// Se comprueba acá en el servidor, dentro de una transacción con un candado por factura (dos
// personas asignando la misma factura a la vez no pueden pasarse del total).
//
// Todo es del equipo. El espacio donde se escribe sale del proyecto o de la asignación que se
// toca, nunca de algo que mande el navegador.

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { ORG_PROGES, espacioParaEscribirEn } from "@/lib/org";
import { equipoEnAccion } from "@/lib/sesion";
import { facturasDeProveedor } from "@/lib/odoo";
import { asignableRestante } from "@/lib/obra";
import { dateField, optionalText, toFieldErrors } from "@/lib/form-helpers";

export type FacturaFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  ok?: boolean; // true cuando se guardó: el diálogo usa esto para cerrarse
};

function recargar(propertyId: string, servicioId: string) {
  revalidatePath(`/propiedades/${propertyId}/servicios/${servicioId}`);
}

// El monto viene como lo escribe una persona: «1500000» o «1.500.000». Pesos enteros, mayor que cero.
const montoEnPesos = z
  .string()
  .trim()
  .min(1, "El monto es obligatorio")
  .transform((v) => v.replace(/[.\s]/g, ""))
  .refine((v) => /^\d+$/.test(v) && Number(v) > 0, {
    message: "Escribe el monto en pesos, solo números",
  })
  .transform(Number);

const asignarSchema = z.object({
  servicioEnCursoId: z.string().min(1),
  maestroId: z.string().min(1),
  odooMoveId: z.coerce.number().int().positive(),
  monto: montoEnPesos,
});

// Asigna (parte de) una factura de proveedor de Odoo a este proyecto.
export async function asignarFactura(_prev: FacturaFormState, formData: FormData): Promise<FacturaFormState> {
  const usuario = await equipoEnAccion();

  const parsed = asignarSchema.safeParse({
    servicioEnCursoId: formData.get("servicioEnCursoId"),
    maestroId: formData.get("maestroId"),
    odooMoveId: formData.get("odooMoveId"),
    monto: formData.get("monto") ?? "",
  });
  if (!parsed.success) {
    return { error: "Revisa los campos.", fieldErrors: toFieldErrors(parsed.error) };
  }
  const { servicioEnCursoId, maestroId, odooMoveId, monto } = parsed.data;

  const servicio = await db.servicioEnCurso.findUnique({
    where: { id: servicioEnCursoId },
    select: { id: true, propertyId: true, organizationId: true },
  });
  if (!servicio) return { error: "Ese proyecto no existe." };
  const orgId = await espacioParaEscribirEn(servicio.organizationId);

  // El maestro vive en el espacio de Proges.
  const maestro = await db.maestro.findFirst({
    where: { id: maestroId, organizationId: ORG_PROGES },
    select: { id: true, odooPartnerId: true },
  });
  if (!maestro) return { error: "Ese maestro no existe." };

  // La factura tiene que ser de ese maestro en Odoo: se lee de nuevo, no se confía en el navegador.
  let facturas;
  try {
    facturas = await facturasDeProveedor(maestro.odooPartnerId);
  } catch (e) {
    return { error: `Odoo no respondió: ${e instanceof Error ? e.message : "error desconocido"}. Prueba de nuevo en un rato.` };
  }
  const factura = facturas.find((f) => f.id === odooMoveId);
  if (!factura) return { error: "Esa factura no es de este maestro en Odoo." };
  if (factura.estado === "anulada") return { error: "Esa factura está anulada en Odoo." };

  const resultado = await db.$transaction(async (tx) => {
    // Candado por factura: quien llegue segundo espera a que el primero termine, y recién ahí
    // cuenta lo ya asignado. Se libera solo al terminar la transacción.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${odooMoveId}::bigint)`;

    const yaAqui = await tx.facturaMaestro.findFirst({
      where: { servicioEnCursoId: servicio.id, odooMoveId },
      select: { id: true },
    });
    if (yaAqui) {
      return { error: "Esa factura ya está asignada a este proyecto: quita la asignación y hazla de nuevo con el monto correcto." };
    }

    const suma = await tx.facturaMaestro.aggregate({
      where: { odooMoveId },
      _sum: { montoAsignado: true },
    });
    const restante = asignableRestante(factura.total, Number(suma._sum.montoAsignado?.toString() ?? 0));
    if (monto > restante) {
      return {
        fieldErrors: {
          monto: `Solo quedan ${new Intl.NumberFormat("es-CL").format(restante)} pesos por asignar de esa factura.`,
        },
      };
    }

    await tx.facturaMaestro.create({
      data: {
        organizationId: orgId,
        servicioEnCursoId: servicio.id,
        maestroId: maestro.id,
        odooMoveId,
        montoAsignado: monto,
        asignadaPorId: usuario.id,
      },
    });
    return { ok: true as const };
  });

  if ("ok" in resultado) recargar(servicio.propertyId, servicio.id);
  return resultado;
}

const manualSchema = z.object({
  servicioEnCursoId: z.string().min(1),
  maestroId: z.string().min(1, "Elige un maestro"),
  numero: optionalText,
  fecha: dateField("Escribe la fecha de la factura"),
  monto: montoEnPesos,
  pagada: z.string().optional(),
  nota: optionalText,
});

// Anota a mano una factura «fuera de Odoo»: no está en Odoo, así que su monto y si está pagada se
// escriben aquí. Las cuentas la suman igual que a las de Odoo.
export async function anotarFacturaManual(_prev: FacturaFormState, formData: FormData): Promise<FacturaFormState> {
  const usuario = await equipoEnAccion();

  const parsed = manualSchema.safeParse({
    servicioEnCursoId: formData.get("servicioEnCursoId"),
    maestroId: formData.get("maestroId"),
    numero: formData.get("numero") ?? undefined,
    fecha: formData.get("fecha") ?? "",
    monto: formData.get("monto") ?? "",
    pagada: formData.get("pagada") ?? undefined,
    nota: formData.get("nota") ?? undefined,
  });
  if (!parsed.success) {
    return { error: "Revisa los campos.", fieldErrors: toFieldErrors(parsed.error) };
  }
  const { servicioEnCursoId, maestroId, numero, fecha, monto, pagada, nota } = parsed.data;

  const servicio = await db.servicioEnCurso.findUnique({
    where: { id: servicioEnCursoId },
    select: { id: true, propertyId: true, organizationId: true },
  });
  if (!servicio) return { error: "Ese proyecto no existe." };
  const orgId = await espacioParaEscribirEn(servicio.organizationId);

  const maestro = await db.maestro.findFirst({
    where: { id: maestroId, organizationId: ORG_PROGES, activo: true },
    select: { id: true },
  });
  if (!maestro) return { fieldErrors: { maestroId: "Ese maestro no está disponible." } };

  await db.facturaMaestro.create({
    data: {
      organizationId: orgId,
      servicioEnCursoId: servicio.id,
      maestroId: maestro.id,
      odooMoveId: null,
      numero,
      fecha,
      pagada: pagada === "1",
      nota,
      montoAsignado: monto,
      asignadaPorId: usuario.id,
    },
  });
  recargar(servicio.propertyId, servicio.id);
  return { ok: true };
}

// Quita una asignación (de Odoo o manual). La factura de Odoo no se toca: solo deja de estar
// asignada a este proyecto y su monto vuelve a quedar disponible.
export async function quitarFactura(_prev: FacturaFormState, formData: FormData): Promise<FacturaFormState> {
  await equipoEnAccion();

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Falta la factura." };

  const asignacion = await db.facturaMaestro.findUnique({
    where: { id },
    select: { id: true, organizationId: true, servicioEnCurso: { select: { id: true, propertyId: true } } },
  });
  if (!asignacion) return { error: "Esa asignación ya no existe." };
  await espacioParaEscribirEn(asignacion.organizationId);

  await db.facturaMaestro.delete({ where: { id: asignacion.id } });
  recargar(asignacion.servicioEnCurso.propertyId, asignacion.servicioEnCurso.id);
  return { ok: true };
}
