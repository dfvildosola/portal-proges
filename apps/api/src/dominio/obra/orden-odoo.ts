// Qué hacer con una orden de Odoo al traerla al proyecto: funciones puras, sin base ni Odoo.
//
// Piensa en una lista de compras que alguien te vuelve a pasar actualizada. No tiras la tuya:
// la comparas línea por línea. Lo que ya tenías se queda con tus marcas (avance, recepción,
// maestro); lo nuevo se agrega; lo que ya no viene en la lista nueva se marca «quitada en Odoo»
// pero no se borra, porque pudo haber avance o fotos colgando de esa línea (R13 de la v6).
//
// Las líneas se reconocen por `odooLineId` (el id de la línea en Odoo). El recinto de una línea
// es la última sección anterior (eso ya lo resuelve `leerOrden`); los anticipos no son partidas:
// su suma es lo «facturado» al dueño.
//
// Va aparte de las acciones para poder probarla con la S00047 sin tocar la base.

import type { OrdenOdoo } from "../../integraciones/odoo";

// ----------------------------------------------------------------------------
// Qué crear, qué actualizar y qué marcar quitada
// ----------------------------------------------------------------------------

// Lo que viene de Odoo en una partida (nunca avance, recepción ni maestro).
export type DatosPartidaOdoo = {
  recinto: string | null;
  codigo: string | null;
  descripcion: string;
  cantidad: number;
  unidad: string | null;
  precioDueno: number;
  posicion: number;
};

export type PartidaNueva = DatosPartidaOdoo & { odooLineId: number };

// Las partidas que el proyecto ya tiene guardadas (la parte que se compara con Odoo).
export type PartidaExistente = {
  id: string;
  odooLineId: number | null; // null: una partida anotada a mano, que Odoo nunca toca
  quitadaEnOdoo: boolean;
  recinto: string | null;
  codigo: string | null;
  descripcion: string;
  cantidad: number | null;
  unidad: string | null;
  precioDueno: number | null;
  posicion: number;
};

export type PartidaActualizada = {
  id: string;
  datos: DatosPartidaOdoo & { quitadaEnOdoo: false };
};

export type PlanDeOrden = {
  nuevas: PartidaNueva[];
  // Solo las que cambiaron de verdad (o que Odoo volvió a traer después de quitarlas).
  actualizadas: PartidaActualizada[];
  // Ids de las partidas que Odoo ya no tiene: se marcan, nunca se borran.
  quitadas: string[];
  sinCambios: number;
  reaparecidas: number; // estaban «quitadas» y volvieron a aparecer en Odoo
  recintos: number;
  totalPartidas: number; // las de la orden en Odoo (nuevas + las que ya estaban y siguen)
  total: number;
  moneda: "CLP" | "UF";
  facturado: number; // suma de los anticipos
  anticipos: number; // cuántos anticipos
};

// La moneda de la orden como la guarda el portal. Otra moneda (dólar…) no se acepta callada:
// el portal solo sabe de pesos y UF.
export function monedaDeOrden(moneda: string): "CLP" | "UF" {
  const m = moneda.trim().toUpperCase();
  if (m === "CLP" || m === "UF") return m;
  throw new Error(`La orden está en ${moneda} y el portal solo maneja CLP y UF.`);
}

// Dos números de la base (Decimal) que pueden diferir en el último decimal por redondeo.
const casiIgual = (a: number | null, b: number | null, tolerancia: number) =>
  a === null || b === null ? a === b : Math.abs(a - b) < tolerancia;

function cambio(existente: PartidaExistente, nueva: DatosPartidaOdoo): boolean {
  return (
    existente.recinto !== nueva.recinto ||
    existente.codigo !== nueva.codigo ||
    existente.descripcion !== nueva.descripcion ||
    existente.unidad !== nueva.unidad ||
    existente.posicion !== nueva.posicion ||
    !casiIgual(existente.cantidad, nueva.cantidad, 0.0005) || // la base guarda 3 decimales
    !casiIgual(existente.precioDueno, nueva.precioDueno, 0.005) // y 2 en el precio
  );
}

export function planDeOrden(orden: OrdenOdoo, existentes: PartidaExistente[]): PlanDeOrden {
  const porLinea = new Map<number, PartidaExistente>();
  for (const e of existentes) if (e.odooLineId !== null) porLinea.set(e.odooLineId, e);

  const nuevas: PartidaNueva[] = [];
  const actualizadas: PartidaActualizada[] = [];
  const vistas = new Set<number>();
  let sinCambios = 0;
  let reaparecidas = 0;

  for (const l of orden.lineas) {
    vistas.add(l.id);
    const datos: DatosPartidaOdoo = {
      recinto: l.recinto,
      codigo: l.codigo,
      descripcion: l.descripcion,
      cantidad: l.cantidad,
      unidad: l.unidad,
      // El total de la línea (cantidad × precio, con descuento), no el precio de una unidad: todo lo
      // que lee `precioDueno` (cobrado, avance ponderado, total por recinto) lo trata como total.
      precioDueno: l.subtotal,
      posicion: l.posicion,
    };
    const existente = porLinea.get(l.id);
    if (!existente) {
      nuevas.push({ ...datos, odooLineId: l.id });
    } else if (existente.quitadaEnOdoo || cambio(existente, datos)) {
      if (existente.quitadaEnOdoo) reaparecidas++;
      actualizadas.push({ id: existente.id, datos: { ...datos, quitadaEnOdoo: false } });
    } else {
      sinCambios++;
    }
  }

  // Lo que el proyecto tenía de Odoo y la orden ya no trae. Las ya marcadas no se vuelven a marcar.
  const quitadas = existentes
    .filter((e) => e.odooLineId !== null && !vistas.has(e.odooLineId) && !e.quitadaEnOdoo)
    .map((e) => e.id);

  return {
    nuevas,
    actualizadas,
    quitadas,
    sinCambios,
    reaparecidas,
    recintos: orden.recintos.length,
    totalPartidas: orden.lineas.length,
    total: orden.total,
    moneda: monedaDeOrden(orden.moneda),
    facturado: orden.anticipos.reduce((suma, a) => suma + a.monto, 0),
    anticipos: orden.anticipos.length,
  };
}

// ----------------------------------------------------------------------------
// ¿La cuenta analítica de la orden calza con la propiedad del proyecto?
// ----------------------------------------------------------------------------

// Lo mínimo de una propiedad para comparar la cuenta.
export type PropiedadParaCuenta = {
  id: string;
  direccion: string;
  rolSII: string | null;
  odooCuentaAnalitica: string | null;
};

export type VeredictoCuenta = {
  // calza: es la propiedad del proyecto · otra: es de otra propiedad del mismo cliente ·
  // ninguna: no calza con ninguna · sin-cuenta: la orden no trae cuenta analítica.
  tipo: "calza" | "otra" | "ninguna" | "sin-cuenta";
  mensaje: string;
  // Otras propiedades del cliente con la misma cuenta (una cuenta puede cubrir dos deptos).
  otras: { id: string; direccion: string }[];
};

const limpiar = (t: string | null) => (t ?? "").trim().toUpperCase();

// La cuenta de Odoo guarda el rol de la propiedad como código («4390-15»): se compara con el
// código analítico guardado en la propiedad y con su ROL. En cualquiera de los dos casos el
// equipo igual confirma: la cuenta sola no basta (decisión de la v6).
export function compararCuenta(
  cuenta: OrdenOdoo["cuentaAnalitica"],
  propiedadDelProyecto: PropiedadParaCuenta,
  propiedadesDelCliente: PropiedadParaCuenta[],
): VeredictoCuenta {
  const codigo = limpiar(cuenta?.codigo ?? null);
  if (!cuenta || !codigo) {
    return {
      tipo: "sin-cuenta",
      mensaje: "La orden no trae cuenta analítica en Odoo: no hay cómo comprobar que sea de esta propiedad.",
      otras: [],
    };
  }

  const calzaCon = (p: PropiedadParaCuenta) => limpiar(p.odooCuentaAnalitica) === codigo || limpiar(p.rolSII) === codigo;
  const otras = propiedadesDelCliente
    .filter((p) => p.id !== propiedadDelProyecto.id && calzaCon(p))
    .map((p) => ({ id: p.id, direccion: p.direccion }));

  if (calzaCon(propiedadDelProyecto)) {
    return {
      tipo: "calza",
      mensaje:
        otras.length > 0
          ? `La cuenta ${cuenta.codigo} calza con esta propiedad, pero también con ${nombres(otras)}: confirma que la orden es de esta unidad.`
          : `La cuenta ${cuenta.codigo} calza con esta propiedad.`,
      otras,
    };
  }
  if (otras.length > 0) {
    return {
      tipo: "otra",
      mensaje: `La cuenta ${cuenta.codigo} es de ${nombres(otras)}, no de esta propiedad. Confirma solo si la orden es de esta unidad.`,
      otras,
    };
  }
  return {
    tipo: "ninguna",
    mensaje: `La cuenta ${cuenta.codigo} no calza con ninguna propiedad de este cliente. Confirma solo si la orden es de esta unidad.`,
    otras: [],
  };
}

function nombres(propiedades: { direccion: string }[]): string {
  return propiedades.map((p) => p.direccion).join(" y ");
}
