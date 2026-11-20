"use server";

// Presupuestos del maestro de una obra y las fechas de la obra (Pieza D).
//
// El maestro manda su presupuesto (en PDF o por WhatsApp). El equipo lo carga aquí: quién es,
// cuánto cobra, en cuántos días, y qué partidas de la orden cubre. Queda RECIBIDO. Después la
// jefatura lo APRUEBA (pasa a ser el plan de costo y plazo) o lo RECHAZA con un motivo. Un
// cambio de alcance durante la obra es un presupuesto ADICIONAL y se aprueba igual.
//
// Cargar es del equipo; aprobar y rechazar son solo de la jefatura. Toda acción parte del
// proyecto (ServicioEnCurso) o del presupuesto que se toca y usa SU espacio, nunca uno que mande
// el navegador.

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { ORG_PROGES, espacioParaEscribirEn } from "@/lib/org";
import { PROYECTO_CERRADO } from "@/lib/servicios";
import { equipoEnAccion, jefaturaEnAccion } from "@/lib/sesion";
import { subirArchivo } from "@/lib/archivos";
import { optionalDateField, optionalText, toFieldErrors } from "@/lib/form-helpers";

export type ObraFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  ok?: boolean; // true cuando se guardó: el diálogo usa esto para cerrarse
};

// Vercel no deja pasar más de 4,5 MB por petición (ADR 0015): un PDF más grande no se sube.
const MAX_PDF_BYTES = 4 * 1024 * 1024;

function recargar(propertyId: string, servicioId: string) {
  revalidatePath(`/propiedades/${propertyId}/servicios/${servicioId}`);
}

// El total viene como lo escribe una persona: «1500000» o «1.500.000». Se le quitan los puntos
// y espacios y tiene que quedar un número entero de pesos mayor que cero.
const totalEnPesos = z
  .string()
  .trim()
  .min(1, "El total es obligatorio")
  .transform((v) => v.replace(/[.\s]/g, ""))
  .refine((v) => /^\d+$/.test(v) && Number(v) > 0, {
    message: "Escribe el total en pesos, solo números",
  });

const plazoEnDias = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === undefined || v === "" ? null : Number(v)))
  .refine((v) => v === null || (Number.isInteger(v) && v >= 1 && v <= 1000), {
    message: "Escribe los días como número entero",
  });

const cargarSchema = z.object({
  servicioEnCursoId: z.string().min(1),
  maestroId: z.string().min(1, "Elige un maestro"),
  tipo: z.enum(["ORIGINAL", "ADICIONAL"], { message: "Elige el tipo" }),
  total: totalEnPesos,
  plazoDias: plazoEnDias,
  nota: optionalText,
});

// Sube el PDF a la carpeta «Portal» de la propiedad. Devuelve su id de Drive, o un mensaje de
// error si no se pudo (sin llave de Google, propiedad sin carpeta, archivo inválido…): en ese
// caso el presupuesto NO se guarda, para que nunca quede un presupuesto sin su PDF a medias.
async function subirPdf(
  archivo: File,
  property: { driveCarpetaId: string | null },
  nombreMaestro: string,
): Promise<{ driveFileId: string } | { error: string }> {
  if (archivo.size > MAX_PDF_BYTES) {
    return { error: "El PDF pesa más de 4 MB: achícalo o guárdalo en el Drive de la propiedad." };
  }
  const datos = Buffer.from(await archivo.arrayBuffer());
  // Un PDF de verdad empieza con «%PDF»; lo demás (una foto renombrada, por ejemplo) no vale.
  if (datos.subarray(0, 4).toString("latin1") !== "%PDF") {
    return { error: "El archivo no es un PDF." };
  }
  const limpio = nombreMaestro.replace(/[^\p{L}\p{N} ._-]/gu, "").trim().slice(0, 60);
  try {
    return await subirArchivo({
      property,
      nombre: `Presupuesto ${limpio || "maestro"}.pdf`,
      mime: "application/pdf",
      datos,
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo subir el PDF a Drive." };
  }
}

// Carga un presupuesto de maestro en un proyecto. Queda RECIBIDO.
export async function cargarPresupuesto(
  _prev: ObraFormState,
  formData: FormData,
): Promise<ObraFormState> {
  const usuario = await equipoEnAccion();

  const parsed = cargarSchema.safeParse({
    servicioEnCursoId: formData.get("servicioEnCursoId"),
    maestroId: formData.get("maestroId"),
    tipo: formData.get("tipo"),
    total: formData.get("total") ?? "",
    plazoDias: formData.get("plazoDias") ?? undefined,
    nota: formData.get("nota") ?? undefined,
  });
  if (!parsed.success) {
    return { error: "Revisa los campos.", fieldErrors: toFieldErrors(parsed.error) };
  }
  const { servicioEnCursoId, maestroId, tipo, total, plazoDias, nota } = parsed.data;

  // El proyecto manda: de él sale el espacio donde se escribe.
  const servicio = await db.servicioEnCurso.findUnique({
    where: { id: servicioEnCursoId },
    select: {
      id: true,
      propertyId: true,
      organizationId: true,
      estado: true,
      property: { select: { driveCarpetaId: true } },
    },
  });
  if (!servicio) return { error: "Ese proyecto no existe." };
  const orgId = await espacioParaEscribirEn(servicio.organizationId);
  if (servicio.estado !== "ABIERTO") return { error: PROYECTO_CERRADO };

  // El maestro vive en el espacio de Proges y tiene que estar activo.
  const maestro = await db.maestro.findFirst({
    where: { id: maestroId, organizationId: ORG_PROGES, activo: true },
    select: { id: true, nombre: true },
  });
  if (!maestro) return { fieldErrors: { maestroId: "Ese maestro no está disponible." } };

  // Las partidas que cubre tienen que ser de este mismo proyecto (los ids vienen del navegador).
  const partidaIds = [...new Set(formData.getAll("partidaId").map(String))];
  if (partidaIds.length > 0) {
    const validas = await db.partida.count({
      where: { id: { in: partidaIds }, servicioEnCursoId: servicio.id },
    });
    if (validas !== partidaIds.length) return { error: "Alguna partida no es de este proyecto." };
  }

  let pdfDriveFileId: string | null = null;
  const pdf = formData.get("pdf");
  if (pdf instanceof File && pdf.size > 0) {
    const subido = await subirPdf(pdf, servicio.property, maestro.nombre);
    if ("error" in subido) return { fieldErrors: { pdf: subido.error } };
    pdfDriveFileId = subido.driveFileId;
  }

  await db.presupuestoMaestro.create({
    data: {
      organizationId: orgId,
      servicioEnCursoId: servicio.id,
      maestroId: maestro.id,
      tipo,
      total,
      plazoDias,
      pdfDriveFileId,
      nota,
      cargadoPorId: usuario.id,
      partidas: { connect: partidaIds.map((id) => ({ id })) },
    },
  });
  recargar(servicio.propertyId, servicio.id);
  return { ok: true };
}

// Lee el presupuesto que se va a resolver y comprueba que se puede tocar. Devuelve el mensaje
// de error o el presupuesto.
async function presupuestoParaResolver(id: string) {
  const p = await db.presupuestoMaestro.findUnique({
    where: { id },
    select: {
      id: true,
      organizationId: true,
      servicioEnCursoId: true,
      estado: true,
      nota: true,
      maestroId: true,
      servicioEnCurso: { select: { propertyId: true, estado: true } },
      partidas: { select: { id: true, servicioEnCursoId: true } },
    },
  });
  if (!p) return { error: "Ese presupuesto no existe." } as const;
  await espacioParaEscribirEn(p.organizationId);
  if (p.servicioEnCurso.estado !== "ABIERTO") return { error: PROYECTO_CERRADO } as const;
  if (p.estado !== "RECIBIDO") return { error: "Ese presupuesto ya fue resuelto." } as const;
  return { presupuesto: p } as const;
}

// La jefatura aprueba un presupuesto: pasa a ser el plan. Las partidas que cubre y que aún no
// tienen maestro quedan a nombre de este.
export async function aprobarPresupuesto(
  _prev: ObraFormState,
  formData: FormData,
): Promise<ObraFormState> {
  const jefe = await jefaturaEnAccion();

  const leido = await presupuestoParaResolver(String(formData.get("id") ?? ""));
  if ("error" in leido) return { error: leido.error };
  const p = leido.presupuesto;

  const sinMaestro = p.partidas
    .filter((x) => x.servicioEnCursoId === p.servicioEnCursoId)
    .map((x) => x.id);

  // Todo o nada: aprobar y asignar el maestro van en una sola transacción. El `where` con el
  // estado evita aprobar dos veces si dos jefaturas aprietan a la vez.
  const hecho = await db.$transaction(async (tx) => {
    const cambio = await tx.presupuestoMaestro.updateMany({
      where: { id: p.id, estado: "RECIBIDO" },
      data: { estado: "APROBADO", resueltoPorId: jefe.id, resueltoEl: new Date() },
    });
    if (cambio.count === 0) return false;
    await tx.partida.updateMany({
      where: { id: { in: sinMaestro }, maestroId: null },
      data: { maestroId: p.maestroId },
    });
    return true;
  });
  if (!hecho) return { error: "Ese presupuesto ya fue resuelto." };

  recargar(p.servicioEnCurso.propertyId, p.servicioEnCursoId);
  return { ok: true };
}

const rechazarSchema = z.object({
  id: z.string().min(1),
  motivo: z.string().trim().min(1, "Escribe el motivo del rechazo").max(500, "El motivo es muy largo"),
});

// La jefatura rechaza un presupuesto y deja el motivo. El motivo se suma a la nota que ya tenía.
export async function rechazarPresupuesto(
  _prev: ObraFormState,
  formData: FormData,
): Promise<ObraFormState> {
  const jefe = await jefaturaEnAccion();

  const parsed = rechazarSchema.safeParse({
    id: formData.get("id"),
    motivo: formData.get("motivo") ?? "",
  });
  if (!parsed.success) {
    return { error: "Revisa los campos.", fieldErrors: toFieldErrors(parsed.error) };
  }

  const leido = await presupuestoParaResolver(parsed.data.id);
  if ("error" in leido) return { error: leido.error };
  const p = leido.presupuesto;

  const rechazo = `Rechazado: ${parsed.data.motivo}`;
  const cambio = await db.presupuestoMaestro.updateMany({
    where: { id: p.id, estado: "RECIBIDO" },
    data: {
      estado: "RECHAZADO",
      resueltoPorId: jefe.id,
      resueltoEl: new Date(),
      nota: p.nota ? `${p.nota}\n${rechazo}` : rechazo,
    },
  });
  if (cambio.count === 0) return { error: "Ese presupuesto ya fue resuelto." };

  recargar(p.servicioEnCurso.propertyId, p.servicioEnCursoId);
  return { ok: true };
}

const fechasSchema = z.object({
  servicioEnCursoId: z.string().min(1),
  inicioObra: optionalDateField(),
  fechaComprometida: optionalDateField(),
});

// Guarda cuándo empezó la obra y cuándo se le prometió al dueño que termina (fechas civiles).
export async function guardarFechasObra(
  _prev: ObraFormState,
  formData: FormData,
): Promise<ObraFormState> {
  await equipoEnAccion();

  const parsed = fechasSchema.safeParse({
    servicioEnCursoId: formData.get("servicioEnCursoId"),
    inicioObra: formData.get("inicioObra") ?? undefined,
    fechaComprometida: formData.get("fechaComprometida") ?? undefined,
  });
  if (!parsed.success) {
    return { error: "Revisa los campos.", fieldErrors: toFieldErrors(parsed.error) };
  }
  const { servicioEnCursoId, inicioObra, fechaComprometida } = parsed.data;

  if (inicioObra && fechaComprometida && fechaComprometida < inicioObra) {
    return { fieldErrors: { fechaComprometida: "No puede ser antes del inicio de la obra." } };
  }

  const servicio = await db.servicioEnCurso.findUnique({
    where: { id: servicioEnCursoId },
    select: { id: true, propertyId: true, organizationId: true, estado: true },
  });
  if (!servicio) return { error: "Ese proyecto no existe." };
  await espacioParaEscribirEn(servicio.organizationId);
  if (servicio.estado !== "ABIERTO") return { error: PROYECTO_CERRADO };

  await db.servicioEnCurso.update({
    where: { id: servicio.id },
    data: { inicioObra, fechaComprometida },
  });
  recargar(servicio.propertyId, servicio.id);
  return { ok: true };
}
