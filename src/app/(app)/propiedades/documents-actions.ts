"use server";

import { revalidatePath } from "next/cache";
import { put, del } from "@vercel/blob";
import { db } from "@/lib/db";
import { getOrgId } from "@/lib/org";
import { assertProperty, optionalDateField } from "@/lib/form-helpers";
import { DocumentType, Papel } from "@/generated/prisma/enums";
import { PAPEL_CATEGORIA } from "@/lib/papeles";

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

  // Qué papel es el documento. Un papel de la lista fija el cajón (tipo) solo;
  // "OTRO" lo deja sin papel y ahí sí se usa el cajón que mandó el formulario.
  const papelRaw = String(formData.get("papel") ?? "").trim();
  if (papelRaw === "") return { error: "Elige qué papel es." };

  let papel: Papel | null;
  let tipo: DocumentType;
  if (papelRaw === "OTRO") {
    const tipoRaw = String(formData.get("tipo") ?? "");
    if (!Object.values(DocumentType).includes(tipoRaw as DocumentType)) {
      return { error: "Tipo de documento inválido." };
    }
    papel = null;
    tipo = tipoRaw as DocumentType;
  } else if (Object.values(Papel).includes(papelRaw as Papel)) {
    papel = papelRaw as Papel;
    tipo = PAPEL_CATEGORIA[papel];
  } else {
    return { error: "Papel inválido." };
  }

  const nombreRaw = String(formData.get("nombre") ?? "").trim();
  const nombre = nombreRaw || file.name;

  // Fechas: la de emisión no puede ser futura; la de vencimiento sí.
  const emisionParsed = optionalDateField({ noFutura: true }).safeParse(
    String(formData.get("fechaEmision") ?? ""),
  );
  if (!emisionParsed.success) {
    return { error: `Fecha de emisión: ${emisionParsed.error.issues[0].message}` };
  }
  const vencimientoParsed = optionalDateField().safeParse(
    String(formData.get("fechaVencimiento") ?? ""),
  );
  if (!vencimientoParsed.success) {
    return { error: `Fecha de vencimiento: ${vencimientoParsed.error.issues[0].message}` };
  }
  const fechaEmision = emisionParsed.data;
  const fechaVencimiento = vencimientoParsed.data;

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
    data: { organizationId: orgId, propertyId, tipo, papel, nombre, blobKey: blobUrl, fechaEmision, fechaVencimiento },
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
  } catch (e) {
    // Se borra igual de la lista (es una acción sin estado: no hay dónde mostrar un aviso),
    // pero queda registrado qué archivo quedó en el almacén para poder limpiarlo.
    console.error("deleteDocument: no se pudo borrar el archivo del almacén", { documentId, blobKey: doc.blobKey }, e);
  }

  await db.document.delete({ where: { id: documentId } });
  revalidatePath(`/propiedades/${propertyId}`);
}
