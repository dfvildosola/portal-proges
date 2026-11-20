// Mira qué tiene hoy el Odoo de Proges, SIN cambiar nada.
//
// Sirve para diseñar con lo que de verdad se registra (regla 8): qué módulos usan, cómo vienen
// las órdenes de venta por recinto, si las compras a maestros pasan por Odoo, cómo se facturan
// los anticipos. No guarda nada en el portal.
//
// Se corre con:
//   npx tsx scripts/leer-odoo.ts resumen          → módulos instalados y cuántos registros hay
//   npx tsx scripts/leer-odoo.ts orden S00047     → una orden con sus recintos, líneas y lo que cuelga de ella
//
// Lee ODOO_URL, ODOO_DB, ODOO_USERNAME y ODOO_API_KEY del .env. Nunca imprime la clave.
// Solo llama métodos de lectura: si alguien agrega otro, el script se niega (ver LECTURA).

import "dotenv/config";

const LECTURA = new Set(["search_read", "search_count", "read", "fields_get"]);

function variable(nombre: string): string {
  const v = process.env[nombre];
  if (!v) throw new Error(`Falta ${nombre} en el .env de portal-proges.`);
  return v;
}

const URL_ODOO = variable("ODOO_URL").replace(/\/+$/, "");
const DB = variable("ODOO_DB");
const USUARIO = variable("ODOO_USERNAME");
const CLAVE = variable("ODOO_API_KEY");

// Odoo habla JSON-RPC en /jsonrpc: se le dice qué servicio, qué método y con qué argumentos.
async function rpc(service: string, method: string, args: unknown[]): Promise<unknown> {
  const res = await fetch(`${URL_ODOO}/jsonrpc`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", method: "call", params: { service, method, args }, id: 1 }),
  });
  if (!res.ok) throw new Error(`Odoo respondió ${res.status} en ${service}.${method}`);
  const json = (await res.json()) as { result?: unknown; error?: { data?: { message?: string }; message?: string } };
  if (json.error) throw new Error(`Odoo: ${json.error.data?.message ?? json.error.message}`);
  return json.result;
}

let uid: number | null = null;
async function entrar(): Promise<number> {
  if (uid !== null) return uid;
  const r = await rpc("common", "authenticate", [DB, USUARIO, CLAVE, {}]);
  if (!r) throw new Error("Odoo no aceptó el usuario y la clave (revisa ODOO_DB, ODOO_USERNAME y ODOO_API_KEY).");
  uid = r as number;
  return uid;
}

type Fila = Record<string, unknown>;
async function leer(modelo: string, metodo: string, args: unknown[], kw: Record<string, unknown> = {}): Promise<unknown> {
  if (!LECTURA.has(metodo)) throw new Error(`Método ${metodo} no permitido: este script solo lee.`);
  return rpc("object", "execute_kw", [DB, await entrar(), CLAVE, modelo, metodo, args, kw]);
}
const buscar = (modelo: string, dominio: unknown[], campos: string[], kw: Record<string, unknown> = {}) =>
  leer(modelo, "search_read", [dominio], { fields: campos, ...kw }) as Promise<Fila[]>;
const contar = async (modelo: string, dominio: unknown[] = []) => {
  try {
    return (await leer(modelo, "search_count", [dominio])) as number;
  } catch (e) {
    return `sin acceso (${(e as Error).message.split("\n")[0].slice(0, 60)})`;
  }
};

const nombre = (v: unknown) => (Array.isArray(v) ? String(v[1]) : v === false ? "—" : String(v));
const plata = (n: unknown) => `$${Math.round(Number(n)).toLocaleString("es-CL")}`;

async function resumen() {
  const version = (await rpc("common", "version", [])) as { server_version: string };
  console.log(`Odoo ${version.server_version} · usuario #${await entrar()}\n`);

  const modulos = await buscar("ir.module.module", [["state", "=", "installed"], ["application", "=", true]], ["shortdesc", "name"]);
  console.log("Aplicaciones instaladas:");
  for (const m of modulos) console.log(`  - ${m.shortdesc} (${m.name})`);

  console.log("\nCuántos registros hay:");
  const modelos: [string, string, unknown[]][] = [
    ["Órdenes de venta confirmadas", "sale.order", [["state", "=", "sale"]]],
    ["Cotizaciones sin confirmar", "sale.order", [["state", "in", ["draft", "sent"]]]],
    ["Órdenes de compra", "purchase.order", []],
    ["Facturas a clientes", "account.move", [["move_type", "=", "out_invoice"]]],
    ["Facturas de proveedores", "account.move", [["move_type", "=", "in_invoice"]]],
    ["Proyectos", "project.project", []],
    ["Tareas de proyecto", "project.task", []],
    ["Contactos (empresas)", "res.partner", [["is_company", "=", true]]],
    ["Productos RR (reparaciones)", "product.product", [["default_code", "=like", "RR-%"]]],
  ];
  for (const [etiqueta, modelo, dominio] of modelos) console.log(`  ${etiqueta}: ${await contar(modelo, dominio)}`);

  const ordenes = await buscar("sale.order", [["state", "=", "sale"]], ["name", "partner_id", "date_order", "amount_untaxed", "user_id"], { order: "date_order desc", limit: 15 });
  console.log("\nÚltimas 15 órdenes confirmadas:");
  for (const o of ordenes) console.log(`  ${o.name} · ${String(o.date_order).slice(0, 10)} · ${nombre(o.partner_id)} · ${plata(o.amount_untaxed)} · ${nombre(o.user_id)}`);
}

async function orden(numero: string) {
  const [o] = await buscar("sale.order", [["name", "=", numero]], ["name", "state", "partner_id", "partner_shipping_id", "date_order", "user_id", "amount_untaxed", "amount_total", "invoice_ids", "client_order_ref", "note", "origin"]);
  if (!o) throw new Error(`No existe la orden ${numero} en Odoo.`);
  console.log(`${o.name} · estado ${o.state} · ${nombre(o.partner_id)} · dirección de entrega: ${nombre(o.partner_shipping_id)}`);
  console.log(`  fecha ${String(o.date_order).slice(0, 10)} · vendedor ${nombre(o.user_id)} · neto ${plata(o.amount_untaxed)} · total ${plata(o.amount_total)} · ref. cliente ${nombre(o.client_order_ref)}`);

  // Campos propios que alguien haya agregado a la orden (empiezan con x_): pueden decir la propiedad.
  const campos = (await leer("sale.order", "fields_get", [], { attributes: ["string", "type"] })) as Record<string, { string: string; type: string }>;
  const propios = Object.keys(campos).filter((c) => c.startsWith("x_"));
  if (propios.length) {
    const [extra] = await buscar("sale.order", [["id", "=", o.id]], propios);
    console.log("  Campos propios:", propios.map((c) => `${campos[c].string}=${nombre(extra[c])}`).join(" · "));
  }

  const lineas = await buscar("sale.order.line", [["order_id", "=", o.id]], ["sequence", "display_type", "name", "product_id", "product_uom_qty", "product_uom_id", "price_unit", "price_subtotal", "qty_delivered", "qty_invoiced", "is_downpayment"], { order: "sequence asc, id asc" });
  console.log(`\n${lineas.length} filas en la orden:`);
  let recinto = "";
  let suma = 0;
  for (const l of lineas) {
    if (l.display_type === "line_section") {
      recinto = String(l.name);
      console.log(`\n  ■ ${recinto}`);
    } else if (l.display_type === "line_note") {
      console.log(`      (nota) ${String(l.name).replace(/\n/g, " ")}`);
    } else {
      const linea = String(l.name).split("\n")[0];
      const marca = l.is_downpayment ? " [anticipo]" : "";
      console.log(`    ${linea}${marca} · ${l.product_uom_qty} ${nombre(l.product_uom_id)} × ${plata(l.price_unit)} = ${plata(l.price_subtotal)} · entregado ${l.qty_delivered} · facturado ${l.qty_invoiced}`);
      if (!l.is_downpayment) suma += Number(l.price_subtotal);
    }
  }
  console.log(`\n  Suma de líneas de trabajo: ${plata(suma)}`);

  const facturas = await buscar("account.move", [["id", "in", o.invoice_ids as number[]]], ["name", "invoice_date", "amount_untaxed", "payment_state", "state"]);
  console.log(`\nFacturas de esta orden (${facturas.length}):`);
  for (const f of facturas) console.log(`  ${f.name} · ${f.invoice_date} · ${plata(f.amount_untaxed)} neto · ${f.state} · pago: ${f.payment_state}`);

  // ¿Hay compras ligadas? En Odoo una compra puede apuntar a la venta por «origen» o por cuenta analítica.
  const compras = await buscar("purchase.order", ["|", ["origin", "ilike", numero], ["partner_ref", "ilike", numero]], ["name", "partner_id", "amount_untaxed", "state", "date_order"]);
  console.log(`\nCompras que mencionan ${numero} (${compras.length}):`);
  for (const c of compras) console.log(`  ${c.name} · ${nombre(c.partner_id)} · ${plata(c.amount_untaxed)} · ${c.state}`);

  const proyectos = await buscar("project.project", [["sale_line_id.order_id", "=", o.id]], ["name"]).catch(() => [] as Fila[]);
  const tareas = await buscar("project.task", [["sale_order_id", "=", o.id]], ["name", "stage_id", "user_ids"]).catch(() => [] as Fila[]);
  console.log(`\nProyectos ligados: ${proyectos.map((p) => p.name).join(", ") || "ninguno"} · tareas ligadas: ${tareas.length}`);
  for (const t of tareas.slice(0, 20)) console.log(`  ${t.name} · ${nombre(t.stage_id)}`);
}

const [accion, arg] = process.argv.slice(2);
const tarea = accion === "orden" && arg ? orden(arg) : accion === "resumen" ? resumen() : null;
if (!tarea) {
  console.log("Uso: npx tsx scripts/leer-odoo.ts resumen  |  npx tsx scripts/leer-odoo.ts orden S00047");
  process.exit(1);
}
tarea.catch((e) => {
  console.error(`No se pudo leer Odoo: ${(e as Error).message}`);
  process.exit(1);
});
