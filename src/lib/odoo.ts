// Lectura de Odoo, SOLO lectura: el portal mira lo que Odoo ya tiene y nunca escribe.
//
// Piensa en una ventanilla de vidrio: se puede mirar lo que hay adentro (órdenes de venta,
// proveedores, facturas de proveedor) pero no hay forma de tocarlo. Esa garantía no depende de
// que nadie se acuerde: `leer` se niega a llamar cualquier método que no esté en LECTURA.
//
// Es de SERVIDOR: lee la clave de Odoo del .env, así que solo se importa desde Server
// Components, server actions y rutas del servidor; nunca desde un componente "use client".
// (No usa `import "server-only"` para poder correr en los scripts con tsx.)
//
// Parte de scripts/leer-odoo.ts (mismo patrón de JSON-RPC). Las variables ODOO_URL, ODOO_DB,
// ODOO_USERNAME y ODOO_API_KEY se leen al USAR una función, no al importar el archivo, para que
// importarlo nunca rompa una página. La clave no se imprime ni se guarda en ningún mensaje.

// Los únicos métodos que se pueden llamar. Agregar uno que escriba (create, write, unlink,
// action_*) rompe la promesa de arriba y tiene que pasar por revisión.
const LECTURA = new Set(["search_read", "search_count", "read", "fields_get"]);

function variable(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor) throw new Error(`Falta ${nombre} en el .env: no se puede leer Odoo.`);
  return valor;
}

// Odoo habla JSON-RPC en /jsonrpc: se le dice qué servicio, qué método y con qué argumentos.
async function rpc(service: string, method: string, args: unknown[]): Promise<unknown> {
  const url = variable("ODOO_URL").replace(/\/+$/, "");
  const res = await fetch(`${url}/jsonrpc`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", method: "call", params: { service, method, args }, id: 1 }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Odoo respondió ${res.status} en ${service}.${method}`);
  const json = (await res.json()) as {
    result?: unknown;
    error?: { data?: { message?: string }; message?: string };
  };
  if (json.error) throw new Error(`Odoo: ${json.error.data?.message ?? json.error.message}`);
  return json.result;
}

// El número de usuario de Odoo, que se pide una vez y se guarda mientras viva el servidor.
let uid: number | null = null;
async function entrar(): Promise<number> {
  if (uid !== null) return uid;
  const r = await rpc("common", "authenticate", [
    variable("ODOO_DB"),
    variable("ODOO_USERNAME"),
    variable("ODOO_API_KEY"),
    {},
  ]);
  if (!r) {
    throw new Error("Odoo no aceptó el usuario y la clave (revisa ODOO_DB, ODOO_USERNAME y ODOO_API_KEY).");
  }
  uid = r as number;
  return uid;
}

type Fila = Record<string, unknown>;

async function leer(modelo: string, metodo: string, args: unknown[], kw: Record<string, unknown> = {}) {
  if (!LECTURA.has(metodo)) throw new Error(`Método ${metodo} no permitido: el portal solo lee Odoo.`);
  return rpc("object", "execute_kw", [
    variable("ODOO_DB"),
    await entrar(),
    variable("ODOO_API_KEY"),
    modelo,
    metodo,
    args,
    kw,
  ]);
}

const buscar = (modelo: string, dominio: unknown[], campos: string[], kw: Record<string, unknown> = {}) =>
  leer(modelo, "search_read", [dominio], { fields: campos, ...kw }) as Promise<Fila[]>;

const contar = (modelo: string, dominio: unknown[]) => leer(modelo, "search_count", [dominio]) as Promise<number>;

// Odoo entrega un many2one como [id, "nombre"] o false si está vacío.
const nombreDe = (v: unknown): string | null => (Array.isArray(v) ? String(v[1]) : null);
const idDe = (v: unknown): number | null => (Array.isArray(v) ? Number(v[0]) : null);
// Un texto vacío en Odoo viene como false.
const texto = (v: unknown): string | null => (typeof v === "string" && v.trim() !== "" ? v : null);

// Una fecha de Odoo («2026-08-12») como fecha civil: medianoche UTC (convención de fechas.ts).
function fechaCivil(v: unknown): Date | null {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v) ? new Date(`${v.slice(0, 10)}T00:00:00Z`) : null;
}

// ----------------------------------------------------------------------------
// Órdenes de venta (lo que el dueño aprobó)
// ----------------------------------------------------------------------------

export type LineaOrden = {
  id: number; // id de la línea en Odoo: así se reconoce al volver a traer la orden
  posicion: number; // orden en que aparece en Odoo, desde 0
  recinto: string | null; // la sección bajo la que está, si hay
  codigo: string | null; // código del producto («RR-001»)
  descripcion: string;
  detalle: string | null; // el resto del texto de la línea y las notas que la siguen
  cantidad: number;
  unidad: string | null;
  precioUnitario: number;
};

export type AnticipoOrden = {
  id: number;
  descripcion: string; // «Anticipo (ref: FAC 000826 el 12/08/2026)»
  monto: number; // lo facturado al dueño con ese anticipo
};

export type OrdenOdoo = {
  id: number;
  numero: string;
  estado: string; // draft, sent, sale, cancel…
  cliente: string | null;
  total: number; // sin impuesto
  moneda: string; // «CLP»
  cuentaAnalitica: { codigo: string | null; nombre: string } | null;
  recintos: string[]; // las secciones de trabajo, en orden (sin la de anticipos)
  lineas: LineaOrden[]; // solo las líneas de trabajo, en orden
  anticipos: AnticipoOrden[];
};

// Odoo escribe «[RR-001] Cambio de piso» como nombre de la línea cuando hay producto.
// Se separa el código del texto y se deja la primera línea como descripción.
function partirNombre(nombre: string): { descripcion: string; detalle: string | null } {
  const [primera, ...resto] = nombre.split("\n");
  const descripcion = primera.replace(/^\[[^\]]*\]\s*/, "").trim();
  const detalle = resto.join("\n").trim();
  return { descripcion, detalle: detalle || null };
}

// Lee una orden de venta por su número («S00047»): cabecera, recintos, líneas y anticipos.
export async function leerOrden(numero: string): Promise<OrdenOdoo> {
  const limpio = numero.trim().toUpperCase();
  if (!limpio) throw new Error("Escribe el número de la orden (por ejemplo S00047).");

  const [o] = await buscar("sale.order", [["name", "=", limpio]], [
    "name",
    "state",
    "partner_id",
    "amount_untaxed",
    "currency_id",
    "project_account_id", // Odoo 19: la cuenta analítica de la orden
  ]);
  if (!o) throw new Error(`No existe la orden ${limpio} en Odoo.`);

  let cuentaAnalitica: OrdenOdoo["cuentaAnalitica"] = null;
  const cuentaId = idDe(o.project_account_id);
  if (cuentaId !== null) {
    const [c] = await buscar("account.analytic.account", [["id", "=", cuentaId]], ["code", "name"]);
    if (c) cuentaAnalitica = { codigo: texto(c.code), nombre: String(c.name) };
  }

  const filas = await buscar(
    "sale.order.line",
    [["order_id", "=", o.id]],
    ["display_type", "name", "product_id", "product_uom_qty", "product_uom_id", "price_unit", "is_downpayment"],
    { order: "sequence asc, id asc" },
  );

  // Los códigos viven en el producto, no en la línea: se piden todos juntos.
  const productoIds = [...new Set(filas.map((f) => idDe(f.product_id)).filter((id): id is number => id !== null))];
  const codigos = new Map<number, string | null>();
  if (productoIds.length > 0) {
    for (const p of await buscar("product.product", [["id", "in", productoIds]], ["default_code"])) {
      codigos.set(Number(p.id), texto(p.default_code));
    }
  }

  // Se recorre en orden: una sección abre un recinto; las líneas siguientes son suyas hasta
  // la próxima sección. La sección de anticipos no es un recinto de trabajo.
  const lineas: LineaOrden[] = [];
  const anticipos: AnticipoOrden[] = [];
  const seccionesConTrabajo = new Set<string>();
  const seccionesConAnticipo = new Set<string>();
  const secciones: string[] = []; // en orden, con repetidos por si dos secciones se llaman igual
  let recinto: string | null = null;
  let ultima: LineaOrden | null = null;

  for (const f of filas) {
    const nombre = String(f.name ?? "");
    if (f.display_type === "line_section") {
      recinto = nombre.trim();
      secciones.push(recinto);
      ultima = null;
    } else if (f.display_type === "line_note") {
      // Una nota explica la línea anterior: se suma a su detalle.
      if (ultima) ultima.detalle = [ultima.detalle, nombre.trim()].filter(Boolean).join("\n");
    } else if (f.is_downpayment) {
      if (recinto) seccionesConAnticipo.add(recinto);
      // En un anticipo la cantidad es 0: el monto está en el precio unitario.
      anticipos.push({ id: Number(f.id), descripcion: nombre.split("\n")[0].trim(), monto: Number(f.price_unit) });
      ultima = null;
    } else {
      if (recinto) seccionesConTrabajo.add(recinto);
      const { descripcion, detalle } = partirNombre(nombre);
      const productoId = idDe(f.product_id);
      ultima = {
        id: Number(f.id),
        posicion: lineas.length,
        recinto,
        codigo: productoId !== null ? (codigos.get(productoId) ?? null) : null,
        descripcion,
        detalle,
        cantidad: Number(f.product_uom_qty),
        unidad: nombreDe(f.product_uom_id),
        precioUnitario: Number(f.price_unit),
      };
      lineas.push(ultima);
    }
  }

  // Una sección que solo tiene anticipos (la de «Anticipos») no es un recinto.
  const recintos = secciones.filter((s) => seccionesConTrabajo.has(s) || !seccionesConAnticipo.has(s));

  return {
    id: Number(o.id),
    numero: String(o.name),
    estado: String(o.state),
    cliente: nombreDe(o.partner_id),
    total: Number(o.amount_untaxed),
    moneda: nombreDe(o.currency_id) ?? "CLP",
    cuentaAnalitica,
    recintos,
    lineas,
    anticipos,
  };
}

// ----------------------------------------------------------------------------
// Proveedores (los maestros) y sus facturas
// ----------------------------------------------------------------------------

export type ProveedorOdoo = {
  id: number; // res.partner: es el `odooPartnerId` del Maestro
  nombre: string;
  rut: string | null;
  telefono: string | null;
  correo: string | null;
  facturas: number; // cuántas facturas de proveedor tiene: ayuda a reconocer al correcto
};

// «Diseño» → «Diseno»: Odoo a veces guarda los nombres sin tilde y a veces con.
const sinTildes = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "");

// Busca proveedores por nombre. Cada palabra tiene que aparecer (en cualquier orden, con o sin
// tilde): «diseño espacios» encuentra «SOCIEDAD DISENO Y ESPACIOS LIMITADA». Muestra primero a
// los que tienen más facturas de proveedor.
export async function buscarProveedores(textoBuscado: string): Promise<ProveedorOdoo[]> {
  const palabras = textoBuscado.trim().split(/\s+/).filter((p) => p.length >= 2);
  if (palabras.length === 0) return [];

  const dominio: unknown[] = [["parent_id", "=", false]]; // los contactos sueltos de una empresa no
  for (const p of palabras) {
    const alternativa = sinTildes(p);
    if (alternativa === p) dominio.push(["name", "ilike", p]);
    else dominio.push("|", ["name", "ilike", p], ["name", "ilike", alternativa]);
  }

  const socios = await buscar("res.partner", dominio, ["name", "vat", "phone", "email"], {
    limit: 15,
    order: "name asc",
  });
  const proveedores = await Promise.all(
    socios.map(async (s) => ({
      id: Number(s.id),
      nombre: String(s.name),
      rut: texto(s.vat),
      telefono: texto(s.phone),
      correo: texto(s.email),
      facturas: await contar("account.move", [
        ["move_type", "=", "in_invoice"],
        ["commercial_partner_id", "=", Number(s.id)],
      ]),
    })),
  );
  return proveedores.sort((a, b) => b.facturas - a.facturas);
}

export type EstadoFactura = "borrador" | "publicada" | "anulada";

export type FacturaOdoo = {
  id: number; // account.move: es el `odooMoveId` de FacturaMaestro
  numero: string; // «FAC 000209»; un borrador sin número usa la referencia o «Borrador»
  fecha: Date | null; // fecha civil de la factura
  total: number;
  estado: EstadoFactura;
  pendiente: number; // lo que falta pagar; un borrador no tiene nada pagado: pendiente = total
};

const ESTADOS: Record<string, EstadoFactura> = { draft: "borrador", posted: "publicada", cancel: "anulada" };

const CAMPOS_FACTURA = ["name", "ref", "invoice_date", "amount_total", "amount_residual", "state"];

function aFactura(f: Fila): FacturaOdoo {
  const estado = ESTADOS[String(f.state)];
  if (!estado) throw new Error(`Odoo entregó la factura ${f.id} con un estado desconocido: ${String(f.state)}`);
  const total = Number(f.amount_total);
  const nombre = texto(f.name);
  return {
    id: Number(f.id),
    numero: nombre && nombre !== "/" ? nombre : (texto(f.ref) ?? "Borrador"),
    fecha: fechaCivil(f.invoice_date),
    total,
    estado,
    // Solo una factura publicada puede estar pagada en parte; en las demás no se pagó nada.
    pendiente: estado === "publicada" ? Number(f.amount_residual) : total,
  };
}

// Las facturas de proveedor de un maestro (res.partner), la más reciente primero. Incluye
// las de sus contactos hijos (commercial_partner_id).
export async function facturasDeProveedor(odooPartnerId: number): Promise<FacturaOdoo[]> {
  const filas = await buscar(
    "account.move",
    [
      ["move_type", "=", "in_invoice"],
      ["commercial_partner_id", "=", odooPartnerId],
    ],
    CAMPOS_FACTURA,
    { order: "invoice_date desc, id desc" },
  );
  return filas.map(aFactura);
}

// Las facturas de proveedor con esos ids (las que ya están asignadas a un proyecto): para
// mostrar su estado y su pago al día cada vez que se mira.
export async function leerFacturas(ids: number[]): Promise<FacturaOdoo[]> {
  if (ids.length === 0) return [];
  const filas = await buscar(
    "account.move",
    [
      ["move_type", "=", "in_invoice"],
      ["id", "in", ids],
    ],
    CAMPOS_FACTURA,
  );
  return filas.map(aFactura);
}
