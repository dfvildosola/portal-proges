"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getOrgId } from "@/lib/org";
import {
  PropertyType,
  PropertyStatus,
  PropertyGoal,
  Currency,
  OwnerType,
  PropertyUnitType,
  MovementType,
  MovementCategory,
  TaxStatus,
  DocumentType,
} from "@/generated/prisma/enums";
import { put, del } from "@vercel/blob";

export type PropertyFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

// Un campo de dinero opcional: viene como string del form; queda como string (Decimal) o null.
const moneyField = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === undefined || v === "" ? null : v))
  .refine((v) => v === null || (!Number.isNaN(Number(v)) && Number(v) >= 0), {
    message: "Debe ser un número válido",
  });

// Año opcional: viene como string del form; queda como number o null.
const optionalYearField = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === undefined || v === "" ? null : Number(v)))
  .refine(
    (v) => v === null || (Number.isInteger(v) && v >= 1800 && v <= 2100),
    { message: "Año inválido" },
  );

// Preserva el tipo literal del enum (p. ej. PropertyType) en vez de `string`,
// para que el resultado de zod calce con el tipo que Prisma espera.
const enumField = <T extends Record<string, string>>(e: T) =>
  z.enum(Object.values(e) as [T[keyof T], ...T[keyof T][]]);

const propertySchema = z.object({
  rolSII: z.string().trim().min(1, "El ROL es obligatorio"),
  tipo: enumField(PropertyType),
  direccion: z.string().trim().min(1, "La dirección es obligatoria"),
  comuna: z.string().trim().min(1, "La comuna es obligatoria"),
  region: z.string().trim().min(1, "La región es obligatoria"),
  objetivo: enumField(PropertyGoal),
  estado: enumField(PropertyStatus),
  monedaPrincipal: enumField(Currency),
  m2Terreno: moneyField,
  m2Construidos: moneyField,
  anoConstruccion: optionalYearField,
  valorComercial: moneyField,
  valorComercialMoneda: enumField(Currency),
});

function parse(formData: FormData) {
  return propertySchema.safeParse({
    rolSII: formData.get("rolSII"),
    tipo: formData.get("tipo"),
    direccion: formData.get("direccion"),
    comuna: formData.get("comuna"),
    region: formData.get("region"),
    objetivo: formData.get("objetivo"),
    estado: formData.get("estado"),
    monedaPrincipal: formData.get("monedaPrincipal"),
    m2Terreno: formData.get("m2Terreno") ?? "",
    m2Construidos: formData.get("m2Construidos") ?? "",
    anoConstruccion: formData.get("anoConstruccion") ?? "",
    valorComercial: formData.get("valorComercial") ?? "",
    valorComercialMoneda: formData.get("valorComercialMoneda") ?? "CLP",
  });
}

function toFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

export async function createProperty(
  _prev: PropertyFormState,
  formData: FormData,
): Promise<PropertyFormState> {
  const parsed = parse(formData);
  if (!parsed.success) {
    return { error: "Revisa los campos.", fieldErrors: toFieldErrors(parsed.error) };
  }

  const orgId = await getOrgId();
  const data = parsed.data;
  const created = await db.property.create({
    data: { ...data, organizationId: orgId },
  });

  revalidatePath("/propiedades");
  redirect(`/propiedades/${created.id}`);
}

export async function updateProperty(
  _prev: PropertyFormState,
  formData: FormData,
): Promise<PropertyFormState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Falta el identificador de la propiedad." };

  const parsed = parse(formData);
  if (!parsed.success) {
    return { error: "Revisa los campos.", fieldErrors: toFieldErrors(parsed.error) };
  }

  const orgId = await getOrgId();
  // updateMany con where { id, organizationId } refuerza el aislamiento multi-tenant.
  const res = await db.property.updateMany({
    where: { id, organizationId: orgId },
    data: parsed.data,
  });
  if (res.count === 0) return { error: "Propiedad no encontrada." };

  revalidatePath("/propiedades");
  revalidatePath(`/propiedades/${id}`);
  redirect(`/propiedades/${id}`);
}

export async function updatePropertyStatus(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const estado = formData.get("estado") as PropertyStatus;
  if (!id || !Object.values(PropertyStatus).includes(estado)) return;

  const orgId = await getOrgId();
  await db.property.updateMany({
    where: { id, organizationId: orgId },
    data: { estado },
  });

  revalidatePath("/propiedades");
  revalidatePath(`/propiedades/${id}`);
  revalidatePath("/resumen");
}

export async function deleteProperty(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const orgId = await getOrgId();
  await db.property.deleteMany({ where: { id, organizationId: orgId } });

  revalidatePath("/propiedades");
  redirect("/propiedades");
}

// ---------------------------------------------------------------------------
// Dueños (copropiedad) y etiquetas
// ---------------------------------------------------------------------------

// Confirma que la propiedad pertenece a la organización activa. Devuelve null si no.
async function assertProperty(propertyId: string, orgId: string) {
  return db.property.findFirst({
    where: { id: propertyId, organizationId: orgId },
    select: { id: true },
  });
}

const porcentajeField = z
  .string()
  .trim()
  .min(1, "El porcentaje es obligatorio")
  .refine(
    (v) => !Number.isNaN(Number(v)) && Number(v) > 0 && Number(v) <= 100,
    { message: "Debe ser un número entre 0 y 100" },
  );

const newOwnerSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio"),
  rut: z.string().trim().min(1, "El RUT es obligatorio"),
  tipo: enumField(OwnerType),
});

// Agrega un dueño a la propiedad. Puede REUTILIZAR una entidad existente
// (`ownerId`) o crear una nueva (nombre/rut/tipo). Así una misma sociedad/persona
// no se duplica entre propiedades — base para agruparlas por grupo económico.
export async function addOwner(
  _prev: PropertyFormState,
  formData: FormData,
): Promise<PropertyFormState> {
  const propertyId = String(formData.get("propertyId") ?? "");
  if (!propertyId) return { error: "Falta la propiedad." };

  const porcentaje = porcentajeField.safeParse(formData.get("porcentaje") ?? "");
  if (!porcentaje.success) {
    return { error: "Revisa los campos.", fieldErrors: toFieldErrors(porcentaje.error) };
  }

  const orgId = await getOrgId();
  if (!(await assertProperty(propertyId, orgId)))
    return { error: "Propiedad no encontrada." };

  // Entidad existente o nueva
  const existingOwnerId = String(formData.get("ownerId") ?? "").trim();
  let ownerId: string;
  if (existingOwnerId) {
    const owner = await db.owner.findFirst({
      where: { id: existingOwnerId, organizationId: orgId },
      select: { id: true },
    });
    if (!owner) return { error: "Entidad no encontrada." };
    ownerId = owner.id;
  } else {
    const parsed = newOwnerSchema.safeParse({
      nombre: formData.get("nombre"),
      rut: formData.get("rut"),
      tipo: formData.get("tipo"),
    });
    if (!parsed.success) {
      return { error: "Revisa los campos.", fieldErrors: toFieldErrors(parsed.error) };
    }
    const created = await db.owner.create({
      data: { organizationId: orgId, ...parsed.data },
    });
    ownerId = created.id;
  }

  // Evita duplicar la copropiedad (única por propiedad+entidad).
  const dup = await db.propertyOwner.findFirst({
    where: { propertyId, ownerId },
    select: { id: true },
  });
  if (dup) return { error: "Esa entidad ya figura como dueña de esta propiedad." };

  await db.propertyOwner.create({
    data: { organizationId: orgId, propertyId, ownerId, porcentaje: porcentaje.data },
  });

  revalidatePath(`/propiedades/${propertyId}`);
  return {};
}

export async function removeOwner(formData: FormData): Promise<void> {
  const propertyOwnerId = String(formData.get("propertyOwnerId") ?? "");
  const propertyId = String(formData.get("propertyId") ?? "");
  if (!propertyOwnerId) return;

  const orgId = await getOrgId();
  await db.propertyOwner.deleteMany({
    where: { id: propertyOwnerId, organizationId: orgId },
  });
  revalidatePath(`/propiedades/${propertyId}`);
}

const tagSchema = z.object({
  nombre: z.string().trim().min(1, "Escribe una etiqueta"),
});

export async function addTag(
  _prev: PropertyFormState,
  formData: FormData,
): Promise<PropertyFormState> {
  const propertyId = String(formData.get("propertyId") ?? "");
  if (!propertyId) return { error: "Falta la propiedad." };

  const parsed = tagSchema.safeParse({ nombre: formData.get("nombre") });
  if (!parsed.success) {
    return { error: "Revisa los campos.", fieldErrors: toFieldErrors(parsed.error) };
  }

  const orgId = await getOrgId();
  if (!(await assertProperty(propertyId, orgId)))
    return { error: "Propiedad no encontrada." };

  // Crea la etiqueta si no existe (única por organización) y la vincula a la propiedad.
  const tag = await db.propertyTag.upsert({
    where: {
      organizationId_nombre: { organizationId: orgId, nombre: parsed.data.nombre },
    },
    create: { organizationId: orgId, nombre: parsed.data.nombre },
    update: {},
  });
  await db.property.update({
    where: { id: propertyId },
    data: { tags: { connect: { id: tag.id } } },
  });

  revalidatePath(`/propiedades/${propertyId}`);
  return {};
}

export async function removeTag(formData: FormData): Promise<void> {
  const propertyId = String(formData.get("propertyId") ?? "");
  const tagId = String(formData.get("tagId") ?? "");
  if (!propertyId || !tagId) return;

  const orgId = await getOrgId();
  if (!(await assertProperty(propertyId, orgId))) return;

  await db.property.update({
    where: { id: propertyId },
    data: { tags: { disconnect: { id: tagId } } },
  });
  revalidatePath(`/propiedades/${propertyId}`);
}

// ---------------------------------------------------------------------------
// Anexos (estacionamientos y bodegas)
// ---------------------------------------------------------------------------

// Campo de texto opcional: "" del form queda como null.
const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === undefined || v === "" ? null : v));

const unitSchema = z.object({
  tipo: enumField(PropertyUnitType),
  numero: z.string().trim().min(1, "El número o identificador es obligatorio"),
  rolSII: optionalText,
  avaluoFiscal: moneyField,
});

export async function addUnit(
  _prev: PropertyFormState,
  formData: FormData,
): Promise<PropertyFormState> {
  const propertyId = String(formData.get("propertyId") ?? "");
  if (!propertyId) return { error: "Falta la propiedad." };

  const parsed = unitSchema.safeParse({
    tipo: formData.get("tipo"),
    numero: formData.get("numero"),
    rolSII: formData.get("rolSII") ?? "",
    avaluoFiscal: formData.get("avaluoFiscal") ?? "",
  });
  if (!parsed.success) {
    return { error: "Revisa los campos.", fieldErrors: toFieldErrors(parsed.error) };
  }

  const orgId = await getOrgId();
  if (!(await assertProperty(propertyId, orgId)))
    return { error: "Propiedad no encontrada." };

  await db.propertyUnit.create({
    data: { organizationId: orgId, propertyId, ...parsed.data },
  });

  revalidatePath(`/propiedades/${propertyId}`);
  return {};
}

export async function removeUnit(formData: FormData): Promise<void> {
  const unitId = String(formData.get("unitId") ?? "");
  const propertyId = String(formData.get("propertyId") ?? "");
  if (!unitId) return;

  const orgId = await getOrgId();
  await db.propertyUnit.deleteMany({
    where: { id: unitId, organizationId: orgId },
  });
  revalidatePath(`/propiedades/${propertyId}`);
}

// ---------------------------------------------------------------------------
// Movimientos (ingresos / gastos)
// ---------------------------------------------------------------------------

const dateField = z
  .string()
  .trim()
  .min(1, "La fecha es obligatoria")
  .refine((v) => !Number.isNaN(Date.parse(`${v}T00:00:00Z`)), {
    message: "Fecha inválida",
  })
  .transform((v) => new Date(`${v}T00:00:00Z`));

const requiredMoneyField = z
  .string()
  .trim()
  .min(1, "El monto es obligatorio")
  .refine((v) => !Number.isNaN(Number(v)) && Number(v) >= 0, {
    message: "Debe ser un número válido",
  });

export type MovementFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

const movementSchema = z.object({
  tipo: enumField(MovementType),
  categoria: enumField(MovementCategory),
  monto: requiredMoneyField,
  moneda: enumField(Currency),
  fecha: dateField,
  descripcion: optionalText,
});

export async function addMovement(
  _prev: MovementFormState,
  formData: FormData,
): Promise<MovementFormState> {
  const propertyId = String(formData.get("propertyId") ?? "");
  if (!propertyId) return { error: "Falta la propiedad." };

  const parsed = movementSchema.safeParse({
    tipo: formData.get("tipo"),
    categoria: formData.get("categoria"),
    monto: formData.get("monto"),
    moneda: formData.get("moneda"),
    fecha: formData.get("fecha"),
    descripcion: formData.get("descripcion") ?? "",
  });
  if (!parsed.success) {
    return { error: "Revisa los campos.", fieldErrors: toFieldErrors(parsed.error) };
  }

  const orgId = await getOrgId();
  if (!(await assertProperty(propertyId, orgId)))
    return { error: "Propiedad no encontrada." };

  await db.movement.create({
    data: {
      organizationId: orgId,
      propertyId,
      tipo: parsed.data.tipo,
      categoria: parsed.data.categoria,
      monto: parsed.data.monto,
      moneda: parsed.data.moneda,
      fecha: parsed.data.fecha,
      descripcion: parsed.data.descripcion,
    },
  });

  revalidatePath(`/propiedades/${propertyId}`);
  return {};
}

export async function removeMovement(formData: FormData): Promise<void> {
  const movementId = String(formData.get("movementId") ?? "");
  const propertyId = String(formData.get("propertyId") ?? "");
  if (!movementId) return;

  const orgId = await getOrgId();
  await db.movement.deleteMany({
    where: { id: movementId, organizationId: orgId },
  });
  revalidatePath(`/propiedades/${propertyId}`);
}

// ---------------------------------------------------------------------------
// Contribuciones (impuesto territorial)
// ---------------------------------------------------------------------------

export type TaxFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

// Meses de vencimiento de cada cuota (basados en el calendario SII Chile).
const TAX_CUOTA_MONTH: Record<number, number> = { 1: 4, 2: 6, 3: 9, 4: 11 };

function calcTaxVencimiento(anio: number, cuota: number): Date {
  const month = TAX_CUOTA_MONTH[cuota];
  const lastDay = new Date(Date.UTC(anio, month, 0)).getUTCDate();
  return new Date(Date.UTC(anio, month - 1, lastDay));
}

const taxSchema = z.object({
  anio: z
    .string()
    .trim()
    .min(1, "El año es obligatorio")
    .refine(
      (v) => Number.isInteger(Number(v)) && Number(v) >= 2000 && Number(v) <= 2100,
      { message: "Año inválido" },
    ),
  cuota: z
    .string()
    .trim()
    .min(1, "La cuota es obligatoria")
    .refine((v) => ["1", "2", "3", "4"].includes(v), {
      message: "La cuota debe ser 1, 2, 3 o 4",
    }),
  monto: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === undefined || v === "" ? null : v))
    .refine((v) => v === null || (!Number.isNaN(Number(v)) && Number(v) >= 0), {
      message: "Debe ser un número válido",
    }),
});

export async function addTax(
  _prev: TaxFormState,
  formData: FormData,
): Promise<TaxFormState> {
  const propertyId = String(formData.get("propertyId") ?? "");
  if (!propertyId) return { error: "Falta la propiedad." };

  const parsed = taxSchema.safeParse({
    anio: formData.get("anio"),
    cuota: formData.get("cuota"),
    monto: formData.get("monto"),
  });
  if (!parsed.success) {
    return { error: "Revisa los campos.", fieldErrors: toFieldErrors(parsed.error) };
  }

  const orgId = await getOrgId();
  if (!(await assertProperty(propertyId, orgId)))
    return { error: "Propiedad no encontrada." };

  try {
    const anio = Number(parsed.data.anio);
    const cuota = Number(parsed.data.cuota);
    await db.propertyTax.create({
      data: {
        organizationId: orgId,
        propertyId,
        anio,
        cuota,
        monto: parsed.data.monto,
        fechaVencimiento: calcTaxVencimiento(anio, cuota),
        estado: TaxStatus.PENDIENTE,
      },
    });
  } catch {
    return { error: "Ya existe una contribución para ese año y cuota." };
  }

  revalidatePath(`/propiedades/${propertyId}`);
  return {};
}

// Genera las 4 cuotas de un año para una propiedad. Idempotente: no pisa registros existentes.
export async function generateYearTaxes(formData: FormData): Promise<void> {
  const propertyId = String(formData.get("propertyId") ?? "");
  const anioStr = String(formData.get("anio") ?? "");
  if (!propertyId || !anioStr) return;
  const anio = Number(anioStr);
  if (!Number.isInteger(anio) || anio < 2000 || anio > 2100) return;

  const orgId = await getOrgId();
  if (!(await assertProperty(propertyId, orgId))) return;

  for (const cuota of [1, 2, 3, 4]) {
    await db.propertyTax.upsert({
      where: { propertyId_anio_cuota: { propertyId, anio, cuota } },
      create: {
        organizationId: orgId,
        property: { connect: { id: propertyId } },
        anio,
        cuota,
        monto: null,
        fechaVencimiento: calcTaxVencimiento(anio, cuota),
        estado: TaxStatus.PENDIENTE,
      },
      update: {},
    });
  }

  revalidatePath(`/propiedades/${propertyId}`);
}

export async function updateTaxMonto(formData: FormData): Promise<void> {
  const taxId = String(formData.get("taxId") ?? "");
  const propertyId = String(formData.get("propertyId") ?? "");
  const montoStr = String(formData.get("monto") ?? "");
  if (!taxId || !montoStr || Number.isNaN(Number(montoStr)) || Number(montoStr) < 0) return;

  const orgId = await getOrgId();
  await db.propertyTax.updateMany({
    where: { id: taxId, organizationId: orgId },
    data: { monto: montoStr },
  });
  revalidatePath(`/propiedades/${propertyId}`);
}

export async function markTaxPaid(formData: FormData): Promise<void> {
  const taxId = String(formData.get("taxId") ?? "");
  const propertyId = String(formData.get("propertyId") ?? "");
  const fechaPagoStr = String(formData.get("fechaPago") ?? "");
  if (!taxId || !fechaPagoStr) return;

  const fechaPago = new Date(`${fechaPagoStr}T00:00:00Z`);
  if (Number.isNaN(fechaPago.getTime())) return;

  const orgId = await getOrgId();
  await db.propertyTax.updateMany({
    where: { id: taxId, organizationId: orgId },
    data: { estado: TaxStatus.PAGADA, fechaPago },
  });
  revalidatePath(`/propiedades/${propertyId}`);
}

export async function removeTax(formData: FormData): Promise<void> {
  const taxId = String(formData.get("taxId") ?? "");
  const propertyId = String(formData.get("propertyId") ?? "");
  if (!taxId) return;

  const orgId = await getOrgId();
  await db.propertyTax.deleteMany({
    where: { id: taxId, organizationId: orgId },
  });
  revalidatePath(`/propiedades/${propertyId}`);
}

// ---------------------------------------------------------------------------
// Avalúos fiscales (historial)
// ---------------------------------------------------------------------------

const assessmentSchema = z.object({
  anio: z
    .string()
    .trim()
    .min(1, "El año es obligatorio")
    .refine(
      (v) => Number.isInteger(Number(v)) && Number(v) >= 1800 && Number(v) <= 2100,
      { message: "Año inválido" },
    ),
  valor: requiredMoneyField,
});

export async function addAssessment(
  _prev: PropertyFormState,
  formData: FormData,
): Promise<PropertyFormState> {
  const propertyId = String(formData.get("propertyId") ?? "");
  if (!propertyId) return { error: "Falta la propiedad." };

  const parsed = assessmentSchema.safeParse({
    anio: formData.get("anio"),
    valor: formData.get("valor"),
  });
  if (!parsed.success) {
    return { error: "Revisa los campos.", fieldErrors: toFieldErrors(parsed.error) };
  }

  const orgId = await getOrgId();
  if (!(await assertProperty(propertyId, orgId)))
    return { error: "Propiedad no encontrada." };

  try {
    await db.propertyAssessment.create({
      data: {
        organizationId: orgId,
        propertyId,
        anio: Number(parsed.data.anio),
        valor: parsed.data.valor,
      },
    });
  } catch {
    return { error: "Ya existe un avalúo para ese año." };
  }

  revalidatePath(`/propiedades/${propertyId}`);
  return {};
}

export async function removeAssessment(formData: FormData): Promise<void> {
  const assessmentId = String(formData.get("assessmentId") ?? "");
  const propertyId = String(formData.get("propertyId") ?? "");
  if (!assessmentId) return;

  const orgId = await getOrgId();
  await db.propertyAssessment.deleteMany({
    where: { id: assessmentId, organizationId: orgId },
  });
  revalidatePath(`/propiedades/${propertyId}`);
}

// ---------------------------------------------------------------------------
// Documentos (Vercel Blob + metadatos en DB)
// ---------------------------------------------------------------------------

export type DocumentFormState = {
  error?: string;
  success?: boolean;
};

export async function uploadDocument(
  _prev: DocumentFormState,
  formData: FormData,
): Promise<DocumentFormState> {
  const propertyId = String(formData.get("propertyId") ?? "");
  if (!propertyId) return { error: "Falta la propiedad." };

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { error: "Selecciona un archivo." };

  const tipoRaw = String(formData.get("tipo") ?? "");
  if (!Object.values(DocumentType).includes(tipoRaw as DocumentType)) {
    return { error: "Tipo de documento inválido." };
  }
  const tipo = tipoRaw as DocumentType;

  const nombreRaw = String(formData.get("nombre") ?? "").trim();
  const nombre = nombreRaw || file.name;

  const fechaEmisionRaw = String(formData.get("fechaEmision") ?? "").trim();
  const fechaVencimientoRaw = String(formData.get("fechaVencimiento") ?? "").trim();
  const fechaEmision = fechaEmisionRaw ? new Date(`${fechaEmisionRaw}T00:00:00Z`) : null;
  const fechaVencimiento = fechaVencimientoRaw ? new Date(`${fechaVencimientoRaw}T00:00:00Z`) : null;

  const orgId = await getOrgId();
  if (!(await assertProperty(propertyId, orgId))) return { error: "Propiedad no encontrada." };

  const ext = file.name.includes(".") ? file.name.split(".").pop() : "";
  const blobPath = `proges/${orgId}/propiedades/${propertyId}/${crypto.randomUUID()}${ext ? `.${ext}` : ""}`;

  let blobUrl: string;
  try {
    const blob = await put(blobPath, file, {
      access: "public",
      addRandomSuffix: false,
      contentType: file.type || "application/octet-stream",
    });
    blobUrl = blob.url;
  } catch {
    return { error: "Error al subir el archivo. Verifica que BLOB_READ_WRITE_TOKEN esté configurado." };
  }

  await db.document.create({
    data: { organizationId: orgId, propertyId, tipo, nombre, blobKey: blobUrl, fechaEmision, fechaVencimiento },
  });

  revalidatePath(`/propiedades/${propertyId}`);
  return { success: true };
}

export async function deleteDocument(formData: FormData): Promise<void> {
  const documentId = String(formData.get("documentId") ?? "");
  const propertyId = String(formData.get("propertyId") ?? "");
  if (!documentId) return;

  const orgId = await getOrgId();
  const doc = await db.document.findFirst({
    where: { id: documentId, organizationId: orgId },
    select: { id: true, blobKey: true },
  });
  if (!doc) return;

  try {
    await del(doc.blobKey);
  } catch {
    // Si falla el borrado del blob (ej. token no configurado), igual elimina el registro.
  }

  await db.document.delete({ where: { id: documentId } });
  revalidatePath(`/propiedades/${propertyId}`);
}
