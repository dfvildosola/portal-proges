"use server";
// Las acciones de Configuración: cada una recibe un formulario, llama a la API y devuelve el
// resultado para que el formulario muestre el error o se cierre. Los maestros los puede registrar
// todo el equipo; usuarios, clientes y llaves, solo el administrador (si no lo es, la API responde
// 403 y ese mensaje es el que se ve).
import { revalidatePath } from "next/cache";
import type { LlaveCreada, ProveedorOdoo, ProveedoresRespuesta } from "@proges/contrato";
import { casillaDe, ejecutar, textoDe, type ResultadoAccion } from "@/lib/acciones";
import { ErrorDeApi, llamar } from "@/lib/api";

const RUTA = "/configuracion";

// ---------------------------------------------------------------------------
// Usuarios
// ---------------------------------------------------------------------------

export async function crearUsuario(_anterior: ResultadoAccion | null, datos: FormData): Promise<ResultadoAccion> {
  return ejecutar(
    () =>
      llamar("POST", "/v1/usuarios", {
        cuerpo: {
          nombre: textoDe(datos, "nombre") ?? "",
          correo: textoDe(datos, "correo") ?? "",
          rol: textoDe(datos, "rol"),
          clienteId: textoDe(datos, "clienteId"),
          // Las casillas de jefatura y admin solo existen en el formulario de una persona del equipo.
          jefatura: casillaDe(datos, "jefatura"),
          admin: casillaDe(datos, "admin"),
        },
      }),
    { revalidar: [RUTA] },
  );
}

export async function cambiarUsuario(_anterior: ResultadoAccion | null, datos: FormData): Promise<ResultadoAccion> {
  const id = textoDe(datos, "id");
  const esDelEquipo = textoDe(datos, "rol") === "EQUIPO";
  return ejecutar(
    () =>
      llamar("PATCH", `/v1/usuarios/${id}`, {
        cuerpo: {
          nombre: textoDe(datos, "nombre") ?? "",
          correo: textoDe(datos, "correo") ?? "",
          activo: casillaDe(datos, "activo"),
          // Una persona de un cliente nunca es jefatura ni administradora: no se manda.
          ...(esDelEquipo ? { jefatura: casillaDe(datos, "jefatura"), admin: casillaDe(datos, "admin") } : {}),
        },
      }),
    { revalidar: [RUTA] },
  );
}

// ---------------------------------------------------------------------------
// Clientes
// ---------------------------------------------------------------------------

export async function crearCliente(_anterior: ResultadoAccion | null, datos: FormData): Promise<ResultadoAccion> {
  return ejecutar(
    () => llamar("POST", "/v1/clientes", { cuerpo: { nombre: textoDe(datos, "nombre") ?? "", modo: textoDe(datos, "modo") } }),
    { revalidar: [RUTA] },
  );
}

export async function cambiarCliente(_anterior: ResultadoAccion | null, datos: FormData): Promise<ResultadoAccion> {
  const id = textoDe(datos, "id");
  return ejecutar(
    () =>
      llamar("PATCH", `/v1/clientes/${id}`, {
        cuerpo: { nombre: textoDe(datos, "nombre") ?? "", modo: textoDe(datos, "modo"), activa: casillaDe(datos, "activa") },
      }),
    { revalidar: [RUTA] },
  );
}

// ---------------------------------------------------------------------------
// Maestros
// ---------------------------------------------------------------------------

export type ResultadoBusqueda = { ok: true; items: ProveedorOdoo[] } | { ok: false; error: string };

/** Busca proveedores en Odoo (solo lee). Si Odoo no responde, devuelve su mensaje en vez de tumbar el diálogo. */
export async function buscarProveedores(texto: string): Promise<ResultadoBusqueda> {
  try {
    const { items } = await llamar<ProveedoresRespuesta>("GET", "/v1/maestros/odoo", { consulta: { q: texto.trim() } });
    return { ok: true, items };
  } catch (error) {
    if (error instanceof ErrorDeApi) return { ok: false, error: error.mensaje };
    throw error;
  }
}

export async function agregarMaestro(_anterior: ResultadoAccion | null, datos: FormData): Promise<ResultadoAccion> {
  const proveedor = textoDe(datos, "odooPartnerId");
  if (!proveedor) return { ok: false, error: "Busca el proveedor en Odoo y elígelo de la lista.", campos: {} };
  return ejecutar(
    () =>
      llamar("POST", "/v1/maestros", {
        cuerpo: { odooPartnerId: Number(proveedor), especialidad: textoDe(datos, "especialidad"), telefono: textoDe(datos, "telefono") },
      }),
    { revalidar: [RUTA] },
  );
}

export async function cambiarMaestro(_anterior: ResultadoAccion | null, datos: FormData): Promise<ResultadoAccion> {
  const id = textoDe(datos, "id");
  return ejecutar(
    () =>
      llamar("PATCH", `/v1/maestros/${id}`, {
        cuerpo: {
          // null borra el dato; así se puede vaciar una especialidad o un teléfono.
          especialidad: textoDe(datos, "especialidad") ?? null,
          telefono: textoDe(datos, "telefono") ?? null,
          activo: casillaDe(datos, "activo"),
          refrescarNombreDeOdoo: casillaDe(datos, "refrescarNombreDeOdoo"),
        },
      }),
    { revalidar: [RUTA] },
  );
}

// ---------------------------------------------------------------------------
// Llaves de la API
// ---------------------------------------------------------------------------

/** Al crear una llave, además de «salió bien» se devuelve la llave completa: es la única vez que existe. */
export type ResultadoLlave = { ok: true; llave: string } | { ok: false; error: string; campos: Record<string, string> };

export async function crearLlave(_anterior: ResultadoLlave | null, datos: FormData): Promise<ResultadoLlave> {
  try {
    const creada = await llamar<LlaveCreada>("POST", "/v1/llaves", {
      cuerpo: { clienteId: textoDe(datos, "clienteId") ?? "", nombre: textoDe(datos, "nombre") ?? "" },
    });
    // Esta acción no usa `ejecutar` (tiene que devolver también la llave), así que refresca la lista ella misma.
    revalidatePath(RUTA);
    return { ok: true, llave: creada.llave };
  } catch (error) {
    if (error instanceof ErrorDeApi) return { ok: false, error: error.mensaje, campos: error.campos ?? {} };
    throw error;
  }
}

export async function revocarLlave(_anterior: ResultadoAccion | null, datos: FormData): Promise<ResultadoAccion> {
  const id = textoDe(datos, "id");
  return ejecutar(() => llamar("DELETE", `/v1/llaves/${id}`), { revalidar: [RUTA] });
}
