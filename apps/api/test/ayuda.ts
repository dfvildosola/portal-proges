// Ayuda para las pruebas de la API: arma un «escenario» (personas, clientes y una llave) y
// deja pedirle cosas a la API como si fuera cada una de esas personas.
//
// Las pruebas corren contra la base proges_test (nunca la de desarrollo). Varias piezas corren
// sus pruebas a la vez sobre esa misma base, así que cada escenario usa nombres únicos y
// limpiar() borra SOLO lo suyo. Nunca se vacía una tabla entera.
//
// Uso:
//   let e: Escenario;
//   before(async () => { e = await crearEscenario(); });
//   after(() => e.limpiar());
//   test("…", async () => {
//     const r = await e.pedir("clienteA", "GET", "/v1/propiedades");
//     assert.equal(r.estado, 200);
//   });
import { db, ORG_PROGES, type Usuario } from "@proges/db";
import { crearApp, type App } from "../src/app";
import { generarLlave } from "../src/acceso/llaves";
import type { VerificarSesion } from "../src/entorno";
import type { Drive, Odoo } from "../src/integraciones/tipos";

// Un seguro: si DATABASE_URL no apunta a una base «…_test», ninguna prueba crea ni borra nada.
// Así un error de configuración nunca toca proges_dev.
const nombreBase = new URL(process.env.DATABASE_URL ?? "postgresql://x/sin-base").pathname.slice(1);
if (!nombreBase.endsWith("_test")) {
  throw new Error(
    `Las pruebas solo corren sobre una base terminada en _test, y DATABASE_URL apunta a «${nombreBase}». Córrelas con «npm run prueba -w @proges/api».`,
  );
}

// ---------------------------------------------------------------------------
// Sesiones de mentira
// ---------------------------------------------------------------------------

// En las pruebas no hay Clerk: un token de sesión es «prueba|<clerkUserId>|<correo>», y el
// verificador falso de abajo lo «valida» leyendo esas partes. Cualquier otro texto es una sesión
// inválida (401). El verificador real (acceso/clerk.ts) nunca acepta estos tokens.
export function tokenDePrueba(clerkUserId: string, correo: string | null = null): string {
  return `prueba|${clerkUserId}|${correo ?? ""}`;
}

export const verificarSesionDePrueba: VerificarSesion = async (token) => {
  const [marca, clerkUserId, correo, ...sobra] = token.split("|");
  if (marca !== "prueba" || !clerkUserId || sobra.length > 0) return null;
  return { clerkUserId, correo: correo || null };
};

// ---------------------------------------------------------------------------
// Sistemas de afuera de mentira
// ---------------------------------------------------------------------------

// Por defecto, Odoo y Drive (fotos y PDF) fallan con un mensaje claro si una ruta los usa.
// Una prueba que los necesita pasa su versión falsa: crearEscenario({ odoo: { leerOrden: async () => … } }).
function noDisponible(nombre: string): never {
  throw new Error(`${nombre} no está disponible en las pruebas: pásale una versión falsa a crearEscenario().`);
}

export type Falsos = { odoo?: Partial<Odoo>; drive?: Partial<Drive> };

function dependenciasDePrueba(falsos: Falsos) {
  const odoo: Odoo = {
    leerOrden: async () => noDisponible("odoo.leerOrden"),
    buscarProveedores: async () => noDisponible("odoo.buscarProveedores"),
    leerProveedor: async () => noDisponible("odoo.leerProveedor"),
    facturasDeProveedor: async () => noDisponible("odoo.facturasDeProveedor"),
    leerFacturas: async () => noDisponible("odoo.leerFacturas"),
    ...falsos.odoo,
  };
  const drive: Drive = {
    subirArchivo: async () => noDisponible("drive.subirArchivo"),
    leerArchivo: async () => noDisponible("drive.leerArchivo"),
    miniatura: async () => noDisponible("drive.miniatura"),
    borrarArchivo: async () => noDisponible("drive.borrarArchivo"),
    comprobarCarpeta: async () => noDisponible("drive.comprobarCarpeta"),
    ...falsos.drive,
  };
  return { verificarSesion: verificarSesionDePrueba, odoo, drive };
}

// ---------------------------------------------------------------------------
// El escenario
// ---------------------------------------------------------------------------

// Quién hace la consulta en pedir(): una de las personas del escenario, la llave del cliente A,
// nadie («anonimo», sin encabezado) o un token cualquiera ({ token: "…" }).
export type Actor = "equipo" | "jefatura" | "admin" | "clienteA" | "clienteB" | "llaveA" | "anonimo";

// Lo que responde la API en pedir(). `cuerpo` es el JSON ya leído (o el texto, si no es JSON).
// Va sin tipo a propósito: las pruebas leen sus campos libremente y las aserciones fallan si la
// forma no es la esperada.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Respuesta = { estado: number; cuerpo: any };

let contador = 0;

export async function crearEscenario(falsos: Falsos = {}) {
  // Único entre procesos (process.pid), entre escenarios del mismo archivo (contador) y entre
  // corridas seguidas (la hora).
  contador += 1;
  const s = `${process.pid}_${contador}_${Date.now().toString(36)}`;

  const app: App = crearApp(dependenciasDePrueba(falsos));

  const clienteA = await db.organizacion.create({
    data: { id: `prueba_a_${s}`, nombre: `Cliente A ${s}`, tipo: "CLIENTE", modo: "ATENDIDO" },
  });
  const clienteB = await db.organizacion.create({
    data: { id: `prueba_b_${s}`, nombre: `Cliente B ${s}`, tipo: "CLIENTE", modo: "AUTONOMO" },
  });

  const persona = (clave: string, datos: Pick<Usuario, "organizationId" | "rol"> & Partial<Usuario>) =>
    db.usuario.create({
      data: {
        email: `${clave}.${s}@prueba.proges.cl`,
        clerkUserId: `user_${clave}_${s}`,
        nombre: `${clave} ${s}`,
        ...datos,
      },
    });
  const equipo = await persona("equipo", { organizationId: ORG_PROGES, rol: "EQUIPO" });
  const jefatura = await persona("jefatura", { organizationId: ORG_PROGES, rol: "EQUIPO", jefatura: true });
  const admin = await persona("admin", { organizationId: ORG_PROGES, rol: "EQUIPO", admin: true });
  const usuarioA = await persona("clientea", { organizationId: clienteA.id, rol: "CLIENTE" });
  const usuarioB = await persona("clienteb", { organizationId: clienteB.id, rol: "CLIENTE" });

  const nueva = generarLlave();
  const llaveA = await db.llaveApi.create({
    data: {
      organizationId: clienteA.id,
      nombre: `Llave de prueba ${s}`,
      prefijo: nueva.prefijo,
      huella: nueva.huella,
      creadaPorId: admin.id,
    },
  });

  const tokens: Record<Exclude<Actor, "anonimo">, string> = {
    equipo: tokenDePrueba(equipo.clerkUserId ?? ""),
    jefatura: tokenDePrueba(jefatura.clerkUserId ?? ""),
    admin: tokenDePrueba(admin.clerkUserId ?? ""),
    clienteA: tokenDePrueba(usuarioA.clerkUserId ?? ""),
    clienteB: tokenDePrueba(usuarioB.clerkUserId ?? ""),
    llaveA: nueva.llave,
  };

  // Le pide algo a la API como `quien`. El cuerpo puede ser un objeto (va como JSON) o un
  // FormData (para subir archivos).
  async function pedir(
    quien: Actor | { token: string },
    metodo: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
    ruta: string,
    cuerpo?: unknown,
  ): Promise<Respuesta> {
    const encabezados: Record<string, string> = {};
    const token = typeof quien === "string" ? (quien === "anonimo" ? null : tokens[quien]) : quien.token;
    if (token) encabezados.Authorization = `Bearer ${token}`;
    let body: RequestInit["body"];
    if (cuerpo instanceof FormData) {
      body = cuerpo;
    } else if (cuerpo !== undefined) {
      encabezados["Content-Type"] = "application/json";
      body = JSON.stringify(cuerpo);
    }
    const res = await app.request(ruta, { method: metodo, headers: encabezados, body });
    const esJson = res.headers.get("content-type")?.includes("application/json");
    return { estado: res.status, cuerpo: esJson ? await res.json() : await res.text() };
  }

  // Borra todo lo de los clientes A y B (cualquier tabla con organizationId: propiedades,
  // servicios, tareas…, y sus usuarios y su llave), después las tres personas del equipo y al
  // final los dos clientes. Si tu prueba creó algo en org_proges (un maestro, un servicio del
  // catálogo), bórralo tú antes de llamar a limpiar().
  async function limpiar(): Promise<void> {
    const espacios = [clienteA.id, clienteB.id];
    const filas = await db.$queryRaw<{ tabla: string }[]>`
      SELECT table_name AS tabla FROM information_schema.columns
      WHERE column_name = 'organizationId' AND table_schema = current_schema()`;
    await borrarEnOrden(
      filas.map((f) => f.tabla),
      espacios,
    );
    await db.usuario.deleteMany({ where: { id: { in: [equipo.id, jefatura.id, admin.id] } } });
    await db.organizacion.deleteMany({ where: { id: { in: espacios } } });
  }

  return {
    app,
    pedir,
    limpiar,
    tokens,
    ids: {
      clienteA: clienteA.id,
      clienteB: clienteB.id,
      equipo: equipo.id,
      jefatura: jefatura.id,
      admin: admin.id,
      usuarioA: usuarioA.id,
      usuarioB: usuarioB.id,
      llaveA: llaveA.id,
    },
  };
}

export type Escenario = Awaited<ReturnType<typeof crearEscenario>>;

// Las claves de una respuesta (a cualquier profundidad) cuyo nombre suena a dato interno de
// Proges: costos, márgenes, presupuestos, facturas. Lo que va hacia un dueño o una llave tiene que
// dar []: `assert.deepEqual(clavesInternas(r.cuerpo), [])`. Es un mínimo, no reemplaza revisar el
// contenido: una nota no marcada para el dueño, por ejemplo, se prueba buscando su texto.
const NOMBRES_INTERNOS = /costo|margen|presupuesto|factura|interno|interna/i;

export function clavesInternas(valor: unknown, ruta = ""): string[] {
  if (Array.isArray(valor)) return valor.flatMap((v, i) => clavesInternas(v, `${ruta}[${i}]`));
  if (valor === null || typeof valor !== "object") return [];
  return Object.entries(valor).flatMap(([clave, v]) => [
    ...(NOMBRES_INTERNOS.test(clave) ? [`${ruta}.${clave}`] : []),
    ...clavesInternas(v, `${ruta}.${clave}`),
  ]);
}

// Borra las filas de esos espacios en cada tabla. Algunas tablas apuntan a otras (una tarea
// apunta a su servicio, un contrato a su arrendatario), y Postgres no deja borrar una fila a la
// que otra todavía apunta. En vez de mantener a mano el orden correcto, se intenta cada tabla:
// la que choca con una llave foránea (códigos 23503 y 23001 de Postgres) se reintenta en la
// vuelta siguiente, cuando ya se borró lo que la sujetaba. Cualquier otro error se deja caer.
async function borrarEnOrden(tablas: string[], espacios: string[]): Promise<void> {
  let pendientes = tablas;
  while (pendientes.length > 0) {
    const siguen: string[] = [];
    for (const tabla of pendientes) {
      try {
        await db.$executeRawUnsafe(`DELETE FROM "${tabla}" WHERE "organizationId" = ANY($1::text[])`, espacios);
      } catch (error) {
        if (!esChoqueDeLlaveForanea(error)) throw error;
        siguen.push(tabla);
      }
    }
    if (siguen.length === pendientes.length) {
      throw new Error(
        `limpiar(): no se pudo borrar lo del escenario en ${siguen.join(", ")}. Algo fuera de los clientes A y B (por ejemplo en org_proges) todavía apunta ahí: bórralo antes en tu prueba.`,
      );
    }
    pendientes = siguen;
  }
}

// Prisma envuelve el error de Postgres; el código original viene en meta.driverAdapterError.
// 23503: una fila apunta a la que se borra. 23001: lo mismo, con la regla «Restrict».
function esChoqueDeLlaveForanea(error: unknown): boolean {
  const codigo = (error as { meta?: { driverAdapterError?: { cause?: { originalCode?: string } } } } | null)?.meta
    ?.driverAdapterError?.cause?.originalCode;
  return codigo === "23503" || codigo === "23001";
}
