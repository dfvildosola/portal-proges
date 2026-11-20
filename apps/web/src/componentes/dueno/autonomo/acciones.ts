"use server";
// Las acciones de la cartera del dueño autónomo: cada una recibe un formulario, llama a la API y
// devuelve el resultado para que el formulario muestre el error o se cierre. Los nombres de los
// campos del formulario son los mismos que pide la API, así el error de un campo cae en su lugar.
import { casillaDe, ejecutar, textoDe, type ResultadoAccion } from "@/lib/acciones";
import { llamar } from "@/lib/api";
import { montoDe, montoEnPesosDe } from "./montos";

type Resultado = Promise<ResultadoAccion>;
type Anterior = ResultadoAccion | null;

// Todo lo que se guarda aquí cambia el inicio, los vencimientos y la cartera.
const PANTALLAS = ["/mi", "/mi/cartera", "/mi/vencimientos"];
const REVALIDAR = { revalidar: PANTALLAS };

/** Un número escrito en un formulario. Si no es un número se manda tal cual y la API lo explica. */
function numeroDe(datos: FormData, campo: string): number | string | undefined {
  const texto = textoDe(datos, campo);
  if (texto === undefined) return undefined;
  const numero = Number(texto);
  return Number.isFinite(numero) ? numero : texto;
}

// ---------------------------------------------------------------------------
// Arrendatarios
// ---------------------------------------------------------------------------

function cuerpoDeArrendatario(datos: FormData) {
  return {
    nombre: textoDe(datos, "nombre") ?? "",
    rut: textoDe(datos, "rut") ?? "",
    email: textoDe(datos, "email") ?? null,
    telefono: textoDe(datos, "telefono") ?? null,
  };
}

export async function crearArrendatario(_anterior: Anterior, datos: FormData): Resultado {
  return ejecutar(() => llamar("POST", "/v1/arrendatarios", { cuerpo: cuerpoDeArrendatario(datos) }), REVALIDAR);
}

export async function cambiarArrendatario(_anterior: Anterior, datos: FormData): Resultado {
  const id = textoDe(datos, "id");
  return ejecutar(() => llamar("PATCH", `/v1/arrendatarios/${id}`, { cuerpo: cuerpoDeArrendatario(datos) }), REVALIDAR);
}

// ---------------------------------------------------------------------------
// Contratos de arriendo
// ---------------------------------------------------------------------------

// Lo que se puede cambiar de un contrato ya hecho es lo mismo que se llena al crearlo, salvo la
// propiedad, el arrendatario y la fecha de inicio.
function cuerpoDeContrato(datos: FormData) {
  const reajusteTipo = textoDe(datos, "reajusteTipo") ?? "NINGUNO";
  return {
    monto: montoDe(datos, "monto"),
    reajusteTipo,
    // Sin reajuste, la frecuencia no existe; con reajuste la API exige que venga.
    reajusteFrecuenciaMeses: reajusteTipo === "NINGUNO" ? null : (numeroDe(datos, "reajusteFrecuenciaMeses") ?? null),
    fechaTermino: textoDe(datos, "fechaTermino"),
    diaPago: numeroDe(datos, "diaPago"),
    renovacionAutomatica: casillaDe(datos, "renovacionAutomatica"),
    diasAviso: numeroDe(datos, "diasAviso"),
    garantia: montoDe(datos, "garantia") ?? null,
  };
}

export async function crearContrato(_anterior: Anterior, datos: FormData): Resultado {
  return ejecutar(
    () =>
      llamar("POST", "/v1/contratos", {
        cuerpo: {
          ...cuerpoDeContrato(datos),
          propiedadId: textoDe(datos, "propiedadId"),
          arrendatarioId: textoDe(datos, "arrendatarioId"),
          fechaInicio: textoDe(datos, "fechaInicio"),
        },
      }),
    REVALIDAR,
  );
}

export async function cambiarContrato(_anterior: Anterior, datos: FormData): Resultado {
  const id = textoDe(datos, "id");
  return ejecutar(() => llamar("PATCH", `/v1/contratos/${id}`, { cuerpo: cuerpoDeContrato(datos) }), REVALIDAR);
}

export async function renovarContrato(_anterior: Anterior, datos: FormData): Resultado {
  const id = textoDe(datos, "id");
  return ejecutar(() => llamar("POST", `/v1/contratos/${id}/renovar`), REVALIDAR);
}

export async function terminarContrato(_anterior: Anterior, datos: FormData): Resultado {
  const id = textoDe(datos, "id");
  return ejecutar(
    () => llamar("POST", `/v1/contratos/${id}/terminar`, { cuerpo: { fechaSalida: textoDe(datos, "fechaSalida") } }),
    REVALIDAR,
  );
}

// ---------------------------------------------------------------------------
// Cobros del arriendo
// ---------------------------------------------------------------------------

export async function generarCobros(_anterior: Anterior, datos: FormData): Resultado {
  return ejecutar(() => llamar("POST", "/v1/cobros/generar", { cuerpo: { mes: textoDe(datos, "mes") } }), REVALIDAR);
}

export async function pagarCobro(_anterior: Anterior, datos: FormData): Resultado {
  const id = textoDe(datos, "id");
  return ejecutar(
    () =>
      llamar("POST", `/v1/cobros/${id}/pago`, {
        cuerpo: {
          fechaPago: textoDe(datos, "fechaPago"),
          // La moneda del pago es la del cobro: viaja escondida en el formulario.
          montoPagado: montoDe(datos, "montoPagado"),
          notas: textoDe(datos, "notas") ?? null,
        },
      }),
    REVALIDAR,
  );
}

/** Para un pago mal anotado: borra los pagos del cobro y lo deja pendiente. */
export async function deshacerPagoDeCobro(_anterior: Anterior, datos: FormData): Resultado {
  const id = textoDe(datos, "id");
  return ejecutar(() => llamar("POST", `/v1/cobros/${id}/anular-pago`), REVALIDAR);
}

/** Para un cobro mal generado. La API no lo borra si tiene pagos. */
export async function borrarCobro(_anterior: Anterior, datos: FormData): Resultado {
  const id = textoDe(datos, "id");
  return ejecutar(() => llamar("DELETE", `/v1/cobros/${id}`), REVALIDAR);
}

// ---------------------------------------------------------------------------
// Gastos (cuentas) y contribuciones
// ---------------------------------------------------------------------------

export async function crearGasto(_anterior: Anterior, datos: FormData): Resultado {
  return ejecutar(
    () =>
      llamar("POST", "/v1/gastos", {
        cuerpo: {
          propiedadId: textoDe(datos, "propiedadId"),
          tipo: textoDe(datos, "tipo"),
          periodo: textoDe(datos, "periodo"),
          monto: montoDe(datos, "monto") ?? null,
          fechaVencimiento: textoDe(datos, "fechaVencimiento"),
          notas: textoDe(datos, "notas") ?? null,
        },
      }),
    REVALIDAR,
  );
}

export async function cambiarGasto(_anterior: Anterior, datos: FormData): Resultado {
  const id = textoDe(datos, "id");
  const pagada = casillaDe(datos, "pagada");
  return ejecutar(
    () =>
      llamar("PATCH", `/v1/gastos/${id}`, {
        cuerpo: {
          tipo: textoDe(datos, "tipo"),
          periodo: textoDe(datos, "periodo"),
          monto: montoDe(datos, "monto") ?? null,
          fechaVencimiento: textoDe(datos, "fechaVencimiento"),
          notas: textoDe(datos, "notas") ?? null,
          estado: pagada ? "PAGADA" : "PENDIENTE",
          fechaPago: pagada ? (textoDe(datos, "fechaPago") ?? null) : null,
        },
      }),
    REVALIDAR,
  );
}

export async function crearContribucion(_anterior: Anterior, datos: FormData): Resultado {
  return ejecutar(
    () =>
      llamar("POST", "/v1/contribuciones", {
        cuerpo: {
          propiedadId: textoDe(datos, "propiedadId"),
          anio: numeroDe(datos, "anio"),
          cuota: numeroDe(datos, "cuota"),
          monto: montoEnPesosDe(datos, "monto") ?? null,
        },
      }),
    REVALIDAR,
  );
}

export async function cambiarContribucion(_anterior: Anterior, datos: FormData): Resultado {
  const id = textoDe(datos, "id");
  const pagada = casillaDe(datos, "pagada");
  return ejecutar(
    () =>
      llamar("PATCH", `/v1/contribuciones/${id}`, {
        cuerpo: {
          monto: montoEnPesosDe(datos, "monto") ?? null,
          estado: pagada ? "PAGADA" : "PENDIENTE",
          fechaPago: pagada ? (textoDe(datos, "fechaPago") ?? null) : null,
        },
      }),
    REVALIDAR,
  );
}

/** Pide las cuatro cuotas de un año de una propiedad (sin monto: se completan después). */
export async function generarCuotas(_anterior: Anterior, datos: FormData): Resultado {
  const propiedadId = textoDe(datos, "propiedadId");
  return ejecutar(
    () =>
      llamar("POST", `/v1/propiedades/${propiedadId}/contribuciones/generar`, { cuerpo: { anio: numeroDe(datos, "anio") } }),
    REVALIDAR,
  );
}

// Solo estos dos recursos se pueden tocar con las acciones de abajo: el nombre viene de un campo
// escondido del formulario y nunca se arma una dirección con un texto cualquiera.
const RECURSOS = ["gastos", "contribuciones"] as const;
type Recurso = (typeof RECURSOS)[number];

function recursoDe(datos: FormData): Recurso {
  const recurso = textoDe(datos, "recurso");
  const valido = RECURSOS.find((r) => r === recurso);
  if (!valido) throw new Error(`Recurso no permitido: «${recurso ?? ""}». Se esperaba gastos o contribuciones.`);
  return valido;
}

/** Marca una cuenta o una cuota como pagada, con su fecha. */
export async function marcarPagada(_anterior: Anterior, datos: FormData): Resultado {
  const recurso = recursoDe(datos);
  const id = textoDe(datos, "id");
  return ejecutar(
    () => llamar("PATCH", `/v1/${recurso}/${id}`, { cuerpo: { estado: "PAGADA", fechaPago: textoDe(datos, "fechaPago") } }),
    REVALIDAR,
  );
}

/** Borra una cuenta o una cuota anotada. */
export async function borrarAnotacion(_anterior: Anterior, datos: FormData): Resultado {
  const recurso = recursoDe(datos);
  const id = textoDe(datos, "id");
  return ejecutar(() => llamar("DELETE", `/v1/${recurso}/${id}`), REVALIDAR);
}
