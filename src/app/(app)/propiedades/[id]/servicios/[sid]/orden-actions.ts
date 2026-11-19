"use server";

// Acciones del equipo para traer la orden de Odoo a un proyecto (d13, d19, ADR 0012):
//  - revisarOrden:    lee la orden por su número y muestra qué se va a enlazar. No escribe nada.
//  - enlazarOrden:    con el ok del equipo, guarda la orden y crea sus partidas.
//  - volverATraerOrden: pone al día lo que Odoo cambió sin perder avance, recepción ni maestro.
//
// Piensa en copiar a mano una cotización: primero la lees entera y confirmas que es del cliente
// correcto (revisar); después la copias (enlazar). Odoo no se toca nunca: solo se lee.
//
// Cada acción parte pidiendo EQUIPO. El proyecto se busca por su id y su espacio sale del propio
// proyecto (espacioParaEscribirEn): nada de lo que mande el navegador decide dónde se escribe.
// La orden se vuelve a leer de Odoo en cada paso: lo que se muestra en pantalla no se da por bueno.

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { espacioParaEscribirEn } from "@/lib/org";
import { equipoEnAccion } from "@/lib/sesion";
import { PROYECTO_CERRADO } from "@/lib/servicios";
import { toFieldErrors } from "@/lib/form-helpers";
import { leerOrden, type OrdenOdoo } from "@/lib/odoo";
import {
  compararCuenta,
  planDeOrden,
  type PartidaExistente,
  type PlanDeOrden,
  type VeredictoCuenta,
} from "@/lib/orden-odoo";

// Lo que la pantalla muestra antes de confirmar. Solo texto y números: viaja al navegador.
export type RevisionOrden = {
  numero: string;
  clienteOdoo: string | null;
  estado: string;
  total: number;
  moneda: "CLP" | "UF";
  facturado: number;
  anticipos: number;
  recintos: number;
  partidas: number;
  cuenta: string | null;
  propiedad: string; // la dirección de la propiedad del proyecto
  veredicto: VeredictoCuenta["tipo"];
  mensajeCuenta: string;
  avisos: string[];
};

export type OrdenFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  ok?: boolean;
  mensaje?: string; // el resumen de lo que se hizo
  revision?: RevisionOrden;
};

const ordenSchema = z.object({
  servicioId: z.string().min(1, "Falta el proyecto"),
  numero: z
    .string()
    .trim()
    .min(1, "Escribe el número de la orden (por ejemplo S00047)")
    .max(30, "El número es demasiado largo"),
});

// El proyecto con lo que hace falta para decidir, dentro del espacio que le toca. Un id que no
// existe y un id de un espacio que el usuario no puede escribir responden igual: «Sin permiso».
async function cargarProyecto(servicioId: string) {
  const s = await db.servicioEnCurso.findUnique({
    where: { id: servicioId },
    include: {
      property: { select: { id: true, direccion: true, rolSII: true, odooCuentaAnalitica: true } },
      servicio: { select: { nombre: true } },
      orden: { select: { id: true, numero: true, odooOrderId: true } },
    },
  });
  if (!s) throw new Error("Sin permiso");
  await espacioParaEscribirEn(s.organizationId);
  return s;
}

type Proyecto = Awaited<ReturnType<typeof cargarProyecto>>;

// Vuelve a pintar la página del proyecto y la ficha de la propiedad.
function revalidar(propertyId: string, servicioId: string) {
  revalidatePath(`/propiedades/${propertyId}`);
  revalidatePath(`/propiedades/${propertyId}/servicios/${servicioId}`);
}

// Lee la orden en Odoo. Si Odoo falla o no existe, el mensaje (que ya viene en español) vuelve
// como error del formulario en vez de romper la página.
async function traerOrden(numero: string): Promise<{ orden: OrdenOdoo } | { error: string }> {
  try {
    const orden = await leerOrden(numero);
    if (orden.estado === "cancel") return { error: `La orden ${orden.numero} está cancelada en Odoo.` };
    return { orden };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo leer la orden en Odoo." };
  }
}

// Una orden se enlaza a un solo proyecto. Devuelve el aviso (con el proyecto que ya la tiene) o null.
async function errorDeOrdenOcupada(proyecto: Proyecto, orden: OrdenOdoo): Promise<string | null> {
  if (proyecto.orden) {
    return `Este proyecto ya tiene la orden ${proyecto.orden.numero}. Usa «Volver a traer» para ponerla al día.`;
  }
  const otra = await db.ordenDueno.findFirst({
    where: { odooOrderId: orden.id },
    select: {
      servicioEnCurso: {
        select: { property: { select: { direccion: true } }, servicio: { select: { nombre: true } } },
      },
    },
  });
  if (!otra) return null;
  const { property, servicio } = otra.servicioEnCurso;
  return `La orden ${orden.numero} ya está enlazada a otro proyecto: «${servicio.nombre}» en ${property.direccion}.`;
}

function avisosDeOrden(orden: OrdenOdoo, plan: PlanDeOrden): string[] {
  const avisos: string[] = [];
  if (orden.estado !== "sale" && orden.estado !== "done") {
    avisos.push(`La orden todavía no está confirmada en Odoo (estado «${orden.estado}»): puede cambiar.`);
  }
  if (plan.totalPartidas === 0) avisos.push("La orden no tiene líneas de trabajo.");
  return avisos;
}

// ---------------------------------------------------------------------------
// Revisar (paso 1: no escribe nada)
// ---------------------------------------------------------------------------

export async function revisarOrden(_prev: OrdenFormState, formData: FormData): Promise<OrdenFormState> {
  await equipoEnAccion();

  const parsed = ordenSchema.safeParse({
    servicioId: formData.get("servicioId") ?? "",
    numero: formData.get("numero") ?? "",
  });
  if (!parsed.success) return { error: "Revisa los campos.", fieldErrors: toFieldErrors(parsed.error) };

  const proyecto = await cargarProyecto(parsed.data.servicioId);
  if (proyecto.estado !== "ABIERTO") return { error: PROYECTO_CERRADO };
  const leida = await traerOrden(parsed.data.numero);
  if ("error" in leida) return { error: leida.error, fieldErrors: { numero: leida.error } };
  const { orden } = leida;

  const ocupada = await errorDeOrdenOcupada(proyecto, orden);
  if (ocupada) return { error: ocupada, fieldErrors: { numero: ocupada } };

  let plan: PlanDeOrden;
  try {
    plan = planDeOrden(orden, []);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "No se pudo leer la orden.";
    return { error: msg, fieldErrors: { numero: msg } };
  }

  // Las propiedades del mismo cliente: una cuenta puede cubrir dos deptos (Monjitas 550).
  const delCliente = await db.property.findMany({
    where: { organizationId: proyecto.organizationId },
    select: { id: true, direccion: true, rolSII: true, odooCuentaAnalitica: true },
  });
  const veredicto = compararCuenta(orden.cuentaAnalitica, proyecto.property, delCliente);

  return {
    revision: {
      numero: orden.numero,
      clienteOdoo: orden.cliente,
      estado: orden.estado,
      total: plan.total,
      moneda: plan.moneda,
      facturado: plan.facturado,
      anticipos: plan.anticipos,
      recintos: plan.recintos,
      partidas: plan.totalPartidas,
      cuenta: orden.cuentaAnalitica?.codigo ?? null,
      propiedad: proyecto.property.direccion,
      veredicto: veredicto.tipo,
      mensajeCuenta: veredicto.mensaje,
      avisos: avisosDeOrden(orden, plan),
    },
  };
}

// ---------------------------------------------------------------------------
// Enlazar (paso 2: el equipo ya confirmó)
// ---------------------------------------------------------------------------

export async function enlazarOrden(_prev: OrdenFormState, formData: FormData): Promise<OrdenFormState> {
  const usuario = await equipoEnAccion();

  const parsed = ordenSchema.safeParse({
    servicioId: formData.get("servicioId") ?? "",
    numero: formData.get("numero") ?? "",
  });
  if (!parsed.success) return { error: "Revisa los campos.", fieldErrors: toFieldErrors(parsed.error) };

  const proyecto = await cargarProyecto(parsed.data.servicioId);
  if (proyecto.estado !== "ABIERTO") return { error: PROYECTO_CERRADO };
  const leida = await traerOrden(parsed.data.numero);
  if ("error" in leida) return { error: leida.error };
  const { orden } = leida;

  const ocupada = await errorDeOrdenOcupada(proyecto, orden);
  if (ocupada) return { error: ocupada };

  let plan: PlanDeOrden;
  try {
    plan = planDeOrden(orden, []);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo leer la orden." };
  }

  const orgId = proyecto.organizationId;
  // Si la propiedad aún no tiene su cuenta analítica, queda guardada para la próxima orden.
  const guardarCuenta = !proyecto.property.odooCuentaAnalitica && !!orden.cuentaAnalitica?.codigo;

  try {
    // Todo o nada: la orden, sus partidas y la cuenta quedan juntas, o no queda nada.
    await db.$transaction(async (tx) => {
      // Se vuelve a mirar dentro de la transacción por si otra persona la enlazó mientras tanto.
      const repetida = await tx.ordenDueno.findFirst({ where: { odooOrderId: orden.id }, select: { id: true } });
      if (repetida) throw new Error(`La orden ${orden.numero} ya está enlazada a otro proyecto.`);

      const creada = await tx.ordenDueno.create({
        data: {
          organizationId: orgId,
          servicioEnCursoId: proyecto.id,
          numero: orden.numero,
          odooOrderId: orden.id,
          total: plan.total,
          moneda: plan.moneda,
          facturado: plan.facturado,
        },
      });
      await tx.partida.createMany({
        data: plan.nuevas.map((p) => ({
          organizationId: orgId,
          servicioEnCursoId: proyecto.id,
          ordenId: creada.id,
          moneda: plan.moneda,
          ...p,
        })),
      });
      if (guardarCuenta) {
        await tx.property.update({
          where: { id: proyecto.property.id },
          data: { odooCuentaAnalitica: orden.cuentaAnalitica!.codigo, modificadoPorId: usuario.id },
        });
      }
    });
  } catch (e) {
    // Dos personas enlazando el mismo proyecto a la vez: la segunda choca con la llave única.
    if ((e as { code?: string }).code === "P2002") return { error: "Este proyecto ya tiene una orden enlazada." };
    if (e instanceof Error && e.message.startsWith("La orden ")) return { error: e.message };
    throw e;
  }

  revalidar(proyecto.property.id, proyecto.id);
  return { ok: true, mensaje: `Orden ${orden.numero} enlazada: ${plan.nuevas.length} partidas.` };
}

// ---------------------------------------------------------------------------
// Volver a traer (poner al día sin perder lo trabajado)
// ---------------------------------------------------------------------------

const volverSchema = z.object({ servicioId: z.string().min(1, "Falta el proyecto") });

export async function volverATraerOrden(_prev: OrdenFormState, formData: FormData): Promise<OrdenFormState> {
  await equipoEnAccion();

  const parsed = volverSchema.safeParse({ servicioId: formData.get("servicioId") ?? "" });
  if (!parsed.success) return { error: "Revisa los campos.", fieldErrors: toFieldErrors(parsed.error) };

  const proyecto = await cargarProyecto(parsed.data.servicioId);
  if (proyecto.estado !== "ABIERTO") return { error: PROYECTO_CERRADO };
  if (!proyecto.orden) return { error: "Este proyecto todavía no tiene una orden enlazada." };
  const ordenId = proyecto.orden.id;

  const leida = await traerOrden(proyecto.orden.numero);
  if ("error" in leida) return { error: leida.error };
  const { orden } = leida;
  if (orden.id !== proyecto.orden.odooOrderId) {
    return { error: `En Odoo, ${orden.numero} ya no es la misma orden que se enlazó. Avísale a quien administra el portal.` };
  }

  const filas = await db.partida.findMany({ where: { ordenId, servicioEnCursoId: proyecto.id } });
  const existentes: PartidaExistente[] = filas.map((f) => ({
    id: f.id,
    odooLineId: f.odooLineId,
    quitadaEnOdoo: f.quitadaEnOdoo,
    recinto: f.recinto,
    codigo: f.codigo,
    descripcion: f.descripcion,
    cantidad: f.cantidad === null ? null : Number(f.cantidad),
    unidad: f.unidad,
    precioDueno: f.precioDueno === null ? null : Number(f.precioDueno),
    posicion: f.posicion,
  }));

  let plan: PlanDeOrden;
  try {
    plan = planDeOrden(orden, existentes);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo leer la orden." };
  }

  const orgId = proyecto.organizationId;
  await db.$transaction(
    async (tx) => {
      await tx.ordenDueno.update({
        where: { id: ordenId },
        data: { total: plan.total, moneda: plan.moneda, facturado: plan.facturado, traidaEl: new Date() },
      });
      if (plan.nuevas.length > 0) {
        await tx.partida.createMany({
          data: plan.nuevas.map((p) => ({
            organizationId: orgId,
            servicioEnCursoId: proyecto.id,
            ordenId,
            moneda: plan.moneda,
            ...p,
          })),
        });
      }
      // Solo se escriben los campos que vienen de Odoo: avance, recepción y maestro no se tocan.
      for (const a of plan.actualizadas) {
        await tx.partida.update({ where: { id: a.id }, data: a.datos });
      }
      if (plan.quitadas.length > 0) {
        await tx.partida.updateMany({
          where: { id: { in: plan.quitadas }, ordenId },
          data: { quitadaEnOdoo: true },
        });
      }
    },
    { timeout: 20_000 },
  );

  revalidar(proyecto.property.id, proyecto.id);
  return { ok: true, mensaje: resumen(plan) };
}

function resumen(plan: PlanDeOrden): string {
  const partes: string[] = [];
  if (plan.nuevas.length > 0) partes.push(`${plan.nuevas.length} partidas nuevas`);
  if (plan.actualizadas.length > 0) partes.push(`${plan.actualizadas.length} cambiadas`);
  if (plan.quitadas.length > 0) partes.push(`${plan.quitadas.length} quitadas en Odoo`);
  return partes.length > 0 ? `Orden al día: ${partes.join(", ")}.` : "La orden ya estaba al día.";
}
