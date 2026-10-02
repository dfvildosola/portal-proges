"use server";

import { revalidatePath } from "next/cache";
import { put, del } from "@vercel/blob";
import { db } from "@/lib/db";
import { getOrgId } from "@/lib/org";
import { assertProperty } from "@/lib/form-helpers";
import { DocumentType } from "@/generated/prisma/enums";

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
