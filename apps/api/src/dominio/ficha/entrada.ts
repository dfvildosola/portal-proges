// Lo que llega al crear o cambiar una propiedad, revisado y traducido a columnas de la base.
//
// zod (el contrato) ya revisó la FORMA de lo que llegó: que `tipo` sea uno de la lista, que la
// plata sea texto con números. Aquí se revisan las reglas de negocio que zod no sabe: que una
// fecha de compra no sea futura, que un monto no sea negativo, que el saldo de una deuda sea
// mayor que cero. Son funciones puras: no tocan la base.
//
// Un «bloque» de plata (valorComercial, compra, deuda) se guarda en varias columnas. Mandar el
// bloque lo reemplaza entero; mandarlo en null borra todas sus columnas; no mandarlo lo deja
// como estaba.
import type { Currency, PropertyGoal, PropertyStatus, PropertyType, ValorFuente } from "@proges/db/enums";
import type { PropiedadCambios, PropiedadNueva } from "@proges/contrato";
import { ErrorApi } from "../../errores";

export function fechaCivil(texto: string): Date {
  return new Date(`${texto}T00:00:00Z`);
}

// Las columnas de Property que se escriben desde la ficha. Solo aparecen las que se mandaron.
export type CamposPropiedad = {
  rolSII?: string | null;
  tipo?: PropertyType;
  direccion?: string;
  edificio?: string | null;
  comuna?: string;
  region?: string;
  objetivo?: PropertyGoal;
  estado?: PropertyStatus;
  monedaPrincipal?: Currency;
  m2Terreno?: string | null;
  m2Construidos?: string | null;
  anoConstruccion?: number | null;
  valorComercial?: string | null;
  valorComercialMoneda?: Currency;
  valorComercialFecha?: Date | null;
  valorComercialFuente?: ValorFuente | null;
  compraFecha?: Date | null;
  compraPrecio?: string | null;
  compraMoneda?: Currency;
  deudaSaldo?: string | null;
  deudaMoneda?: Currency;
  deudaFecha?: Date | null;
  deudaBanco?: string | null;
  deudaDividendo?: string | null;
  deudaTermino?: Date | null;
  exentaContribuciones?: boolean;
};

// Los números de la base son Decimal(14,2): hasta 12 dígitos antes de la coma.
const MAX_DIGITOS_ENTEROS = 12;

// null si el texto es un monto válido (no negativo, que quepa en la base); si no, qué le pasa.
export function problemaDeMonto(valor: string): string | null {
  if (valor.startsWith("-")) return "No puede ser negativo.";
  const enteros = valor.split(".")[0].replace(/^0+(?=\d)/, "");
  if (enteros.length > MAX_DIGITOS_ENTEROS) return "El monto es demasiado grande.";
  return null;
}

// Revisa las reglas de negocio de lo que se manda. Si algo está mal lanza un 400 con todos los
// campos a arreglar (no solo el primero). `hoy` es hoyChile().
export function validarPropiedad(entrada: PropiedadCambios | PropiedadNueva, hoy: Date): void {
  const campos: Record<string, string> = {};
  const montoOk = (campo: string, valor: string) => {
    const problema = problemaDeMonto(valor);
    if (problema) campos[campo] = problema;
  };
  const noFutura = (campo: string, fecha: string | null | undefined) => {
    if (fecha && fechaCivil(fecha) > hoy) campos[campo] = "No puede ser una fecha futura.";
  };

  const vc = entrada.valorComercial;
  if (vc) {
    montoOk("valorComercial.monto", vc.monto.valor);
    noFutura("valorComercial.fecha", vc.fecha);
  }
  const compra = entrada.compra;
  if (compra) {
    if (compra.precio) montoOk("compra.precio", compra.precio.valor);
    noFutura("compra.fecha", compra.fecha);
  }
  const deuda = entrada.deuda;
  if (deuda) {
    montoOk("deuda.saldo", deuda.saldo.valor);
    if (!campos["deuda.saldo"] && Number(deuda.saldo.valor) <= 0) {
      campos["deuda.saldo"] = "Anota el saldo: sin él, la deuda no se cuenta.";
    }
    if (deuda.dividendo) montoOk("deuda.dividendo", deuda.dividendo);
    noFutura("deuda.fecha", deuda.fecha);
  }
  if (entrada.m2Terreno) montoOk("m2Terreno", entrada.m2Terreno);
  if (entrada.m2Construidos) montoOk("m2Construidos", entrada.m2Construidos);

  if (Object.keys(campos).length > 0) throw new ErrorApi(400, "Revisa los datos enviados.", campos);
}

const textoOpcional = (t: string | null | undefined): string | null | undefined =>
  t === undefined ? undefined : t === null || t.trim() === "" ? null : t.trim();

// De lo que mandó la persona a las columnas de la base. Solo trae las que se mandaron.
export function camposDeLaEntrada(entrada: PropiedadCambios | PropiedadNueva): CamposPropiedad {
  const c: CamposPropiedad = {};
  if (entrada.rolSII !== undefined) c.rolSII = textoOpcional(entrada.rolSII);
  if (entrada.tipo !== undefined) c.tipo = entrada.tipo;
  if (entrada.direccion !== undefined) c.direccion = entrada.direccion;
  if (entrada.edificio !== undefined) c.edificio = textoOpcional(entrada.edificio);
  if (entrada.comuna !== undefined) c.comuna = entrada.comuna;
  if (entrada.region !== undefined) c.region = entrada.region;
  if (entrada.objetivo !== undefined) c.objetivo = entrada.objetivo;
  if (entrada.estado !== undefined) c.estado = entrada.estado;
  if (entrada.monedaPrincipal !== undefined) c.monedaPrincipal = entrada.monedaPrincipal;
  if (entrada.m2Terreno !== undefined) c.m2Terreno = entrada.m2Terreno;
  if (entrada.m2Construidos !== undefined) c.m2Construidos = entrada.m2Construidos;
  if (entrada.anoConstruccion !== undefined) c.anoConstruccion = entrada.anoConstruccion;
  if (entrada.exentaContribuciones !== undefined) c.exentaContribuciones = entrada.exentaContribuciones;

  const vc = entrada.valorComercial;
  if (vc !== undefined) {
    c.valorComercial = vc ? vc.monto.valor : null;
    if (vc) c.valorComercialMoneda = vc.monto.moneda;
    c.valorComercialFecha = vc?.fecha ? fechaCivil(vc.fecha) : null;
    c.valorComercialFuente = vc?.fuente ?? null;
  }
  const compra = entrada.compra;
  if (compra !== undefined) {
    c.compraFecha = compra?.fecha ? fechaCivil(compra.fecha) : null;
    c.compraPrecio = compra?.precio ? compra.precio.valor : null;
    if (compra?.precio) c.compraMoneda = compra.precio.moneda;
  }
  const deuda = entrada.deuda;
  if (deuda !== undefined) {
    c.deudaSaldo = deuda ? deuda.saldo.valor : null;
    if (deuda) c.deudaMoneda = deuda.saldo.moneda;
    c.deudaFecha = deuda?.fecha ? fechaCivil(deuda.fecha) : null;
    c.deudaBanco = textoOpcional(deuda?.banco) ?? null;
    c.deudaDividendo = deuda?.dividendo ?? null;
    c.deudaTermino = deuda?.termino ? fechaCivil(deuda.termino) : null;
  }
  return c;
}
