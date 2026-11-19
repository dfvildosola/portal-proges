"use server";

// Acciones del panel comercial de un servicio de VENTA o ARRIENDO: precio,
// aviso, visitas, ofertas y recomendación.
//
// Todas parten igual: comprueban que quien llama es del equipo (equipoEnAccion)
// y que el servicio es de la organización, es comercial y sigue ABIERTO. Es la
// cerradura del servidor: aunque alguien llame la acción a mano, sin pasar por
// la pantalla, no puede tocar un servicio cerrado ni de otro tipo.

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { Currency, OfertaEstado, PrecioOrigen } from "@/generated/prisma/enums";
import { Prisma } from "@/generated/prisma/client";
import { getOrgId } from "@/lib/org";
import { equipoEnAccion } from "@/lib/sesion";
import { hoyChile } from "@/lib/fechas";
import { esComercial } from "@/lib/servicios";
import {
  dateField,
  enumField,
  optionalText,
  requiredMoneyField,
  toFieldErrors,
} from "@/lib/form-helpers";

export type ComercialFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

// ---------------------------------------------------------------------------
// Comprobaciones comunes
// ---------------------------------------------------------------------------

// Busca el servicio y confirma que se puede tocar: de la organización, de tipo
// venta o arriendo, y abierto. Devuelve el servicio o el texto del error.
async function servicioComercialAbierto(servicioId: string, orgId: string) {
  if (!servicioId) return { error: "Falta el servicio." } as const;
  const servicio = await db.servicioEnCurso.findFirst({
    where: { id: servicioId, organizationId: orgId },
    select: {
      id: true,
      propertyId: true,
      tipo: true,
      estado: true,
      precio: true,
      precioMoneda: true,
    },
  });
  if (!servicio) return { error: "Servicio no encontrado." } as const;
  if (!esComercial(servicio.tipo))
    return { error: "Solo la venta y el arriendo llevan precio, visitas y ofertas." } as const;
  if (servicio.estado !== "ABIERTO")
    return { error: "El servicio ya está cerrado: no se puede modificar." } as const;
  return { servicio } as const;
}

// Vuelve a pintar la página del servicio y la ficha de la propiedad.
function refrescar(propertyId: string, servicioId: string) {
  revalidatePath(`/propiedades/${propertyId}/servicios/${servicioId}`);
  revalidatePath(`/propiedades/${propertyId}`);
}

// Un monto que debe ser mayor que cero (el helper acepta 0, que acá no sirve).
const montoPositivo = requiredMoneyField.refine((v) => Number(v) > 0, {
  message: "El monto debe ser mayor que cero",
});

// ---------------------------------------------------------------------------
// Precio
// ---------------------------------------------------------------------------

const precioSchema = z.object({
  monto: montoPositivo,
  moneda: enumField(Currency),
  // Sin elegir llega null: se avisa en español en vez del mensaje técnico de zod.
  origen: z.enum(Object.values(PrecioOrigen) as [PrecioOrigen, ...PrecioOrigen[]], {
    error: "Elige quién fijó el precio",
  }),
  motivo: optionalText,
});

// Cambia el precio vigente y deja un Evento PRECIO con quién lo fijó. Las dos
// escrituras van en una transacción: o quedan las dos o ninguna, así el precio
// vigente nunca se desencuentra con su historial.
export async function cambiarPrecio(
  _prev: ComercialFormState,
  formData: FormData,
): Promise<ComercialFormState> {
  const usuario = await equipoEnAccion();
  const servicioId = String(formData.get("servicioId") ?? "");

  const parsed = precioSchema.safeParse({
    monto: formData.get("monto") ?? "",
    moneda: formData.get("moneda"),
    origen: formData.get("origen"),
    motivo: formData.get("motivo") ?? "",
  });
  if (!parsed.success) {
    return { error: "Revisa los campos.", fieldErrors: toFieldErrors(parsed.error) };
  }

  const orgId = await getOrgId();
  const encontrado = await servicioComercialAbierto(servicioId, orgId);
  if ("error" in encontrado) return { error: encontrado.error };
  const { servicio } = encontrado;

  const nuevo = new Prisma.Decimal(parsed.data.monto);
  const habiaPrecio = servicio.precio !== null;

  // Desde el segundo precio se pide el motivo: es lo que se le explica al propietario.
  if (habiaPrecio && !parsed.data.motivo) {
    return {
      error: "Revisa los campos.",
      fieldErrors: { motivo: "Cuenta por qué cambia el precio" },
    };
  }
  if (
    servicio.precio !== null &&
    servicio.precio.equals(nuevo) &&
    servicio.precioMoneda === parsed.data.moneda
  ) {
    return { error: "El precio vigente ya es ese." };
  }

  await db.$transaction([
    db.servicioEnCurso.update({
      where: { id: servicio.id },
      data: { precio: nuevo, precioMoneda: parsed.data.moneda },
    }),
    db.evento.create({
      data: {
        organizationId: orgId,
        servicioEnCursoId: servicio.id,
        tipo: "PRECIO",
        anterior: servicio.precio ? servicio.precio.toFixed() : null,
        nuevo: nuevo.toFixed(),
        moneda: parsed.data.moneda,
        origen: parsed.data.origen,
        motivo: parsed.data.motivo,
        autorId: usuario.id,
      },
    }),
  ]);

  refrescar(servicio.propertyId, servicio.id);
  return {};
}

// Enlace del aviso publicado: una dirección web válida, o vacío para quitarlo.
// Se exige http o https para que nadie guarde algo como «javascript:…».
const avisoSchema = z.object({
  avisoUrl: z
    .string()
    .trim()
    .max(2000, "El enlace es demasiado largo")
    .refine((v) => v === "" || /^https?:\/\//i.test(v), {
      message: "Debe empezar con http:// o https://",
    })
    .refine(
      (v) => {
        if (v === "") return true;
        try {
          new URL(v);
          return true;
        } catch {
          return false;
        }
      },
      { message: "No es un enlace válido" },
    )
    .transform((v) => (v === "" ? null : v)),
});

export async function cambiarAvisoUrl(
  _prev: ComercialFormState,
  formData: FormData,
): Promise<ComercialFormState> {
  await equipoEnAccion();
  const servicioId = String(formData.get("servicioId") ?? "");

  const parsed = avisoSchema.safeParse({ avisoUrl: formData.get("avisoUrl") ?? "" });
  if (!parsed.success) {
    return { error: "Revisa el enlace.", fieldErrors: toFieldErrors(parsed.error) };
  }

  const orgId = await getOrgId();
  const encontrado = await servicioComercialAbierto(servicioId, orgId);
  if ("error" in encontrado) return { error: encontrado.error };
  const { servicio } = encontrado;

  await db.servicioEnCurso.update({
    where: { id: servicio.id },
    data: { avisoUrl: parsed.data.avisoUrl },
  });

  refrescar(servicio.propertyId, servicio.id);
  return {};
}

// ---------------------------------------------------------------------------
// Visitas
// ---------------------------------------------------------------------------

// «1» a «5» o vacío (sin evaluación).
const evaluacionField = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === undefined || v === "" ? null : Number(v)))
  .refine((v) => v === null || (Number.isInteger(v) && v >= 1 && v <= 5), {
    message: "La evaluación va de 1 a 5",
  });

// Una fecha de visita o de oferta ya ocurrida: no puede ser de mañana.
const fechaPasada = dateField().refine((d) => d.getTime() <= hoyChile().getTime(), {
  message: "La fecha no puede ser futura",
});

const visitaSchema = z.object({
  fecha: fechaPasada,
  realizadaPorId: z.string().trim().min(1, "Elige quién la hizo"),
  interesadoNombre: optionalText,
  interesadoContacto: optionalText,
  evaluacion: evaluacionField,
  comentario: optionalText,
});

export async function registrarVisita(
  _prev: ComercialFormState,
  formData: FormData,
): Promise<ComercialFormState> {
  await equipoEnAccion();
  const servicioId = String(formData.get("servicioId") ?? "");

  const parsed = visitaSchema.safeParse({
    fecha: formData.get("fecha") ?? "",
    realizadaPorId: formData.get("realizadaPorId") ?? "",
    interesadoNombre: formData.get("interesadoNombre") ?? "",
    interesadoContacto: formData.get("interesadoContacto") ?? "",
    evaluacion: formData.get("evaluacion") ?? "",
    comentario: formData.get("comentario") ?? "",
  });
  if (!parsed.success) {
    return { error: "Revisa los campos.", fieldErrors: toFieldErrors(parsed.error) };
  }

  const orgId = await getOrgId();
  const encontrado = await servicioComercialAbierto(servicioId, orgId);
  if ("error" in encontrado) return { error: encontrado.error };
  const { servicio } = encontrado;

  // Quien hizo la visita tiene que ser una persona activa del equipo.
  const persona = await db.usuario.findFirst({
    where: {
      id: parsed.data.realizadaPorId,
      organizationId: orgId,
      rol: "EQUIPO",
      activo: true,
    },
    select: { id: true },
  });
  if (!persona) {
    return {
      error: "Revisa los campos.",
      fieldErrors: { realizadaPorId: "Esa persona no es del equipo" },
    };
  }

  await db.visita.create({
    data: {
      organizationId: orgId,
      servicioEnCursoId: servicio.id,
      fecha: parsed.data.fecha,
      realizadaPorId: persona.id,
      interesadoNombre: parsed.data.interesadoNombre,
      interesadoContacto: parsed.data.interesadoContacto,
      evaluacion: parsed.data.evaluacion,
      comentario: parsed.data.comentario,
    },
  });

  refrescar(servicio.propertyId, servicio.id);
  return {};
}

// Borra una visita mal ingresada. Va directo en un <form action>: no devuelve
// estado, así que un caso imposible desde la pantalla (servicio ya cerrado) se
// avisa lanzando el error.
export async function borrarVisita(formData: FormData): Promise<void> {
  await equipoEnAccion();
  const servicioId = String(formData.get("servicioId") ?? "");
  const visitaId = String(formData.get("visitaId") ?? "");
  if (!visitaId) throw new Error("Falta la visita.");

  const orgId = await getOrgId();
  const encontrado = await servicioComercialAbierto(servicioId, orgId);
  if ("error" in encontrado) throw new Error(encontrado.error);
  const { servicio } = encontrado;

  await db.visita.deleteMany({
    where: { id: visitaId, organizationId: orgId, servicioEnCursoId: servicio.id },
  });
  refrescar(servicio.propertyId, servicio.id);
}

// ---------------------------------------------------------------------------
// Ofertas
// ---------------------------------------------------------------------------

const ofertaSchema = z.object({
  fecha: fechaPasada,
  monto: montoPositivo,
  moneda: enumField(Currency),
  oferente: z.string().trim().min(1, "El oferente es obligatorio").max(200),
  nota: optionalText,
});

export async function registrarOferta(
  _prev: ComercialFormState,
  formData: FormData,
): Promise<ComercialFormState> {
  await equipoEnAccion();
  const servicioId = String(formData.get("servicioId") ?? "");

  const parsed = ofertaSchema.safeParse({
    fecha: formData.get("fecha") ?? "",
    monto: formData.get("monto") ?? "",
    moneda: formData.get("moneda"),
    oferente: formData.get("oferente") ?? "",
    nota: formData.get("nota") ?? "",
  });
  if (!parsed.success) {
    return { error: "Revisa los campos.", fieldErrors: toFieldErrors(parsed.error) };
  }

  const orgId = await getOrgId();
  const encontrado = await servicioComercialAbierto(servicioId, orgId);
  if ("error" in encontrado) return { error: encontrado.error };
  const { servicio } = encontrado;

  await db.oferta.create({
    data: {
      organizationId: orgId,
      servicioEnCursoId: servicio.id,
      fecha: parsed.data.fecha,
      monto: parsed.data.monto,
      moneda: parsed.data.moneda,
      oferente: parsed.data.oferente,
      nota: parsed.data.nota,
    },
  });

  refrescar(servicio.propertyId, servicio.id);
  return {};
}

// Cambia el estado de una oferta. NO mueve la etapa del servicio: eso lo hace
// una persona (decisión del plan). Va directo en un <form action>.
export async function cambiarEstadoOferta(formData: FormData): Promise<void> {
  await equipoEnAccion();
  const servicioId = String(formData.get("servicioId") ?? "");
  const ofertaId = String(formData.get("ofertaId") ?? "");
  const estado = enumField(OfertaEstado).safeParse(formData.get("estado"));
  if (!ofertaId) throw new Error("Falta la oferta.");
  if (!estado.success) throw new Error("Estado de oferta inválido.");

  const orgId = await getOrgId();
  const encontrado = await servicioComercialAbierto(servicioId, orgId);
  if ("error" in encontrado) throw new Error(encontrado.error);
  const { servicio } = encontrado;

  await db.oferta.updateMany({
    where: { id: ofertaId, organizationId: orgId, servicioEnCursoId: servicio.id },
    data: { estado: estado.data },
  });
  refrescar(servicio.propertyId, servicio.id);
}

// ---------------------------------------------------------------------------
// Recomendación al propietario
// ---------------------------------------------------------------------------

const recomendacionSchema = z.object({
  recomendacion: z
    .string()
    .trim()
    .min(1, "Escribe la recomendación")
    .max(4000, "La recomendación es demasiado larga (máximo 4000 caracteres)"),
});

// Reemplaza el texto vigente. La fecha queda en el momento de guardar.
export async function guardarRecomendacion(
  _prev: ComercialFormState,
  formData: FormData,
): Promise<ComercialFormState> {
  await equipoEnAccion();
  const servicioId = String(formData.get("servicioId") ?? "");

  const parsed = recomendacionSchema.safeParse({
    recomendacion: formData.get("recomendacion") ?? "",
  });
  if (!parsed.success) {
    return { error: "Revisa el texto.", fieldErrors: toFieldErrors(parsed.error) };
  }

  const orgId = await getOrgId();
  const encontrado = await servicioComercialAbierto(servicioId, orgId);
  if ("error" in encontrado) return { error: encontrado.error };
  const { servicio } = encontrado;

  await db.servicioEnCurso.update({
    where: { id: servicio.id },
    data: {
      recomendacion: parsed.data.recomendacion,
      recomendacionFecha: new Date(),
    },
  });

  refrescar(servicio.propertyId, servicio.id);
  return {};
}
