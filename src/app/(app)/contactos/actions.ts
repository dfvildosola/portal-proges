"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getOrgId } from "@/lib/org";
import { toFieldErrors } from "@/lib/form-helpers";

export type TenantFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

// Campo opcional de texto: "" del form queda como null.
const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === undefined || v === "" ? null : v));

const tenantSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio"),
  rut: z.string().trim().min(1, "El RUT es obligatorio"),
  email: optionalText.refine(
    (v) => v === null || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v),
    { message: "Email inválido" },
  ),
  telefono: optionalText,
});

function parse(formData: FormData) {
  return tenantSchema.safeParse({
    nombre: formData.get("nombre"),
    rut: formData.get("rut"),
    email: formData.get("email") ?? "",
    telefono: formData.get("telefono") ?? "",
  });
}

export async function createTenant(
  _prev: TenantFormState,
  formData: FormData,
): Promise<TenantFormState> {
  const parsed = parse(formData);
  if (!parsed.success) {
    return { error: "Revisa los campos.", fieldErrors: toFieldErrors(parsed.error) };
  }

  const orgId = await getOrgId();
  await db.tenant.create({
    data: { ...parsed.data, organizationId: orgId },
  });

  revalidatePath("/contactos");
  redirect("/contactos");
}

export async function updateTenant(
  _prev: TenantFormState,
  formData: FormData,
): Promise<TenantFormState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Falta el identificador del contacto." };

  const parsed = parse(formData);
  if (!parsed.success) {
    return { error: "Revisa los campos.", fieldErrors: toFieldErrors(parsed.error) };
  }

  const orgId = await getOrgId();
  const res = await db.tenant.updateMany({
    where: { id, organizationId: orgId },
    data: parsed.data,
  });
  if (res.count === 0) return { error: "Contacto no encontrado." };

  revalidatePath("/contactos");
  redirect("/contactos");
}

export async function deleteTenant(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const orgId = await getOrgId();
  // onDelete: Restrict en LeaseContract impide borrar un arrendatario con contratos;
  // lo verificamos antes para dar un mensaje claro en vez de un error de FK.
  const conContratos = await db.leaseContract.count({
    where: { tenantId: id, organizationId: orgId },
  });
  if (conContratos > 0) {
    redirect("/contactos?error=con-contratos");
  }

  await db.tenant.deleteMany({ where: { id, organizationId: orgId } });
  revalidatePath("/contactos");
  redirect("/contactos");
}
