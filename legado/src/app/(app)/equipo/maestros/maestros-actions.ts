"use server";

// Los maestros: gente que hace los trabajos en las obras (Pieza D, d23).
//
// Un maestro no se inventa en el portal: es un PROVEEDOR de Odoo. Aquí solo se busca entre los
// que Odoo ya tiene, se elige uno y se le agrega lo que Odoo no sabe (su especialidad y su
// teléfono de trabajo). Es como anotar en la libreta de contactos de la oficina: el nombre y el
// RUT los dicta Odoo; el portal solo agrega «es gasfíter».
//
// Los maestros viven en el espacio de Proges (org_proges) y valen para todos los clientes.
// Cualquiera del equipo puede agregarlos (no hace falta jefatura).

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { ORG_PROGES } from "@/lib/org";
import { equipoEnAccion } from "@/lib/sesion";
import { buscarProveedores, type ProveedorOdoo } from "@/lib/odoo";
import { optionalText, toFieldErrors } from "@/lib/form-helpers";

export type MaestroFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  ok?: boolean; // true cuando se guardó: el diálogo usa esto para cerrarse
};

// Un proveedor encontrado en Odoo, con la marca de si ya es maestro del portal.
export type ProveedorEncontrado = ProveedorOdoo & { yaAgregado: boolean };

export type BusquedaProveedores = {
  error?: string;
  proveedores?: ProveedorEncontrado[];
};

function recargar() {
  revalidatePath("/equipo/maestros");
}

// Odoo puede estar caído o sin llave: se devuelve el mensaje en vez de dejar caer la pantalla.
function mensajeDe(e: unknown): string {
  return e instanceof Error ? e.message : "Error desconocido al leer Odoo.";
}

// Busca proveedores en Odoo por nombre. Es una lectura: no guarda nada. Se llama desde el
// diálogo «Agregar maestro» mientras la persona escribe.
export async function buscarProveedoresOdoo(texto: string): Promise<BusquedaProveedores> {
  await equipoEnAccion();
  const buscado = String(texto ?? "").trim();
  if (buscado.length < 2) return { error: "Escribe al menos dos letras del nombre." };

  let proveedores: ProveedorOdoo[];
  try {
    proveedores = await buscarProveedores(buscado);
  } catch (e) {
    return { error: mensajeDe(e) };
  }

  const existentes = await db.maestro.findMany({
    where: { organizationId: ORG_PROGES, odooPartnerId: { in: proveedores.map((p) => p.id) } },
    select: { odooPartnerId: true },
  });
  const yaEstan = new Set(existentes.map((m) => m.odooPartnerId));
  return { proveedores: proveedores.map((p) => ({ ...p, yaAgregado: yaEstan.has(p.id) })) };
}

// Confirma contra Odoo que ese proveedor existe y devuelve sus datos. No se le cree al navegador
// el nombre que manda: se busca de nuevo en Odoo y se toma de ahí. (Odoo se consulta por
// nombre porque src/lib/odoo.ts todavía no tiene «leer un proveedor por su id».)
async function proveedorDeOdoo(
  odooPartnerId: number,
  textoParaBuscar: string,
): Promise<ProveedorOdoo | null> {
  const encontrados = await buscarProveedores(textoParaBuscar);
  return encontrados.find((p) => p.id === odooPartnerId) ?? null;
}

const agregarSchema = z.object({
  odooPartnerId: z.coerce.number().int().positive("Elige un proveedor de la lista"),
  buscado: z.string().trim().min(2, "Falta el nombre del proveedor"),
  especialidad: optionalText,
  telefono: optionalText,
});

// Agrega un proveedor de Odoo como maestro. Si ya está, avisa (el id de Odoo es único).
export async function agregarMaestro(
  _prev: MaestroFormState,
  formData: FormData,
): Promise<MaestroFormState> {
  await equipoEnAccion();

  const parsed = agregarSchema.safeParse({
    odooPartnerId: formData.get("odooPartnerId"),
    buscado: formData.get("buscado"),
    especialidad: formData.get("especialidad") ?? undefined,
    telefono: formData.get("telefono") ?? undefined,
  });
  if (!parsed.success) {
    return { error: "Revisa los campos.", fieldErrors: toFieldErrors(parsed.error) };
  }
  const { odooPartnerId, buscado, especialidad, telefono } = parsed.data;

  const repetido = await db.maestro.findUnique({
    where: { odooPartnerId },
    select: { nombre: true },
  });
  if (repetido) return { error: `${repetido.nombre} ya está agregado como maestro.` };

  let proveedor: ProveedorOdoo | null;
  try {
    proveedor = await proveedorDeOdoo(odooPartnerId, buscado);
  } catch (e) {
    return { error: mensajeDe(e) };
  }
  if (!proveedor) return { error: "No encontré ese proveedor en Odoo. Búscalo de nuevo." };

  await db.maestro.create({
    data: {
      organizationId: ORG_PROGES,
      odooPartnerId,
      nombre: proveedor.nombre,
      especialidad,
      // Si no se escribió un teléfono, se parte con el que tiene Odoo.
      telefono: telefono ?? proveedor.telefono,
    },
  });
  recargar();
  return { ok: true };
}

const editarSchema = z.object({
  id: z.string().min(1),
  especialidad: optionalText,
  telefono: optionalText,
});

// Cambia la especialidad y el teléfono de un maestro.
export async function editarMaestro(
  _prev: MaestroFormState,
  formData: FormData,
): Promise<MaestroFormState> {
  await equipoEnAccion();

  const parsed = editarSchema.safeParse({
    id: formData.get("id"),
    especialidad: formData.get("especialidad") ?? undefined,
    telefono: formData.get("telefono") ?? undefined,
  });
  if (!parsed.success) {
    return { error: "Revisa los campos.", fieldErrors: toFieldErrors(parsed.error) };
  }
  const { id, especialidad, telefono } = parsed.data;

  // El maestro tiene que ser del espacio de Proges: el id viene del navegador.
  const maestro = await db.maestro.findFirst({
    where: { id, organizationId: ORG_PROGES },
    select: { id: true },
  });
  if (!maestro) return { error: "Ese maestro no existe." };

  await db.maestro.update({ where: { id }, data: { especialidad, telefono } });
  recargar();
  return { ok: true };
}

// Activa o desactiva un maestro. Uno desactivado deja de ofrecerse al cargar presupuestos,
// pero sus presupuestos y partidas siguen: nunca se borra.
export async function cambiarActivoMaestro(
  _prev: MaestroFormState,
  formData: FormData,
): Promise<MaestroFormState> {
  await equipoEnAccion();

  const id = String(formData.get("id") ?? "");
  const activo = formData.get("activo") === "si";
  const maestro = await db.maestro.findFirst({
    where: { id, organizationId: ORG_PROGES },
    select: { id: true },
  });
  if (!maestro) return { error: "Ese maestro no existe." };

  await db.maestro.update({ where: { id }, data: { activo } });
  recargar();
  return { ok: true };
}

// Vuelve a copiar el nombre desde Odoo (por si lo corrigieron allá). Odoo se busca por las
// primeras palabras del nombre que ya tenemos; si lo renombraron por completo, no lo encuentra y
// lo dice.
export async function copiarNombreDesdeOdoo(
  _prev: MaestroFormState,
  formData: FormData,
): Promise<MaestroFormState> {
  await equipoEnAccion();

  const id = String(formData.get("id") ?? "");
  const maestro = await db.maestro.findFirst({
    where: { id, organizationId: ORG_PROGES },
    select: { id: true, nombre: true, odooPartnerId: true },
  });
  if (!maestro) return { error: "Ese maestro no existe." };

  const palabras = maestro.nombre.split(/\s+/).filter((p) => p.length >= 2);
  let proveedor: ProveedorOdoo | null = null;
  try {
    // Primero con dos palabras (más preciso) y, si no aparece, con la primera sola.
    for (const cuantas of [2, 1]) {
      proveedor = await proveedorDeOdoo(maestro.odooPartnerId, palabras.slice(0, cuantas).join(" "));
      if (proveedor) break;
    }
  } catch (e) {
    return { error: mensajeDe(e) };
  }
  if (!proveedor) {
    return { error: "No lo encontré en Odoo con ese nombre: puede que lo hayan cambiado del todo." };
  }

  if (proveedor.nombre !== maestro.nombre) {
    await db.maestro.update({ where: { id }, data: { nombre: proveedor.nombre } });
  }
  recargar();
  return { ok: true };
}
