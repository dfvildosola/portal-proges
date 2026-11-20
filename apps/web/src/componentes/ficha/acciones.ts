"use server";
// Lo que se guarda desde la ficha de una propiedad: cada función de aquí lee el formulario, llama a
// la API y devuelve { ok } o el mensaje que la API escribió (ver lib/acciones.ts).
//
// Las que empiezan con «quitar» o «borrar» no son formularios: se les pasa el id ya incluido (con
// `.bind`) y las llama un botón de confirmar.
import type { PropiedadCambios, PropiedadDuenoNuevo, PropiedadUnidadNueva, PropiedadValorFuente } from "@proges/contrato";
import { archivoDe, casillaDe, ejecutar, textoDe, type ResultadoAccion } from "@/lib/acciones";
import { llamar } from "@/lib/api";

type Moneda = "CLP" | "UF";

// Las pantallas que muestran los datos de una propiedad y hay que refrescar al guardar.
const refrescar = (propiedadId: string) => [`/propiedades/${propiedadId}`, "/propiedades"];

const falla = (error: string, campos: Record<string, string>): ResultadoAccion => ({ ok: false, error, campos });
const REVISA = "Revisa los datos enviados.";

// Un número escrito por una persona («1.500.000», «12,5») como lo pide la API («1500000», «12.5»).
// En pesos el punto separa miles; en UF y en metros el punto es el decimal.
function numeroDe(texto: string | undefined, moneda: Moneda | "otro" = "otro"): string | undefined {
  if (!texto) return undefined;
  let limpio = texto.replace(/[\s$]/g, "").replace(",", ".");
  if (moneda === "CLP" && /^\d{1,3}(\.\d{3})+$/.test(limpio)) limpio = limpio.replaceAll(".", "");
  return limpio;
}

function monedaDe(datos: FormData, campo: string): Moneda {
  return textoDe(datos, campo) === "UF" ? "UF" : "CLP";
}

// Un monto de un par de campos (cantidad + moneda); undefined si la cantidad quedó vacía.
function montoDe(datos: FormData, campo: string, campoMoneda: string) {
  const moneda = monedaDe(datos, campoMoneda);
  const valor = numeroDe(textoDe(datos, campo), moneda);
  return valor === undefined ? undefined : { valor, moneda };
}

// ---------------------------------------------------------------------------
// Datos de la propiedad
// ---------------------------------------------------------------------------

export async function actualizarDatos(_anterior: ResultadoAccion | null, datos: FormData): Promise<ResultadoAccion> {
  const id = textoDe(datos, "propiedadId");
  const ano = textoDe(datos, "anoConstruccion");
  if (ano !== undefined && !/^\d{4}$/.test(ano)) return falla(REVISA, { anoConstruccion: "Escribe un año de cuatro cifras." });
  const cambios = {
    direccion: textoDe(datos, "direccion") ?? "",
    comuna: textoDe(datos, "comuna") ?? "",
    region: textoDe(datos, "region") ?? "",
    tipo: textoDe(datos, "tipo"),
    estado: textoDe(datos, "estado"),
    objetivo: textoDe(datos, "objetivo"),
    monedaPrincipal: textoDe(datos, "monedaPrincipal"),
    edificio: textoDe(datos, "edificio") ?? null,
    rolSII: textoDe(datos, "rolSII") ?? null,
    m2Terreno: numeroDe(textoDe(datos, "m2Terreno")) ?? null,
    m2Construidos: numeroDe(textoDe(datos, "m2Construidos")) ?? null,
    anoConstruccion: ano === undefined ? null : Number(ano),
    exentaContribuciones: casillaDe(datos, "exentaContribuciones"),
  } as PropiedadCambios;
  return ejecutar(() => llamar("PATCH", `/v1/propiedades/${encodeURIComponent(id ?? "")}`, { cuerpo: cambios }), {
    revalidar: refrescar(id ?? ""),
  });
}

// Los tres bloques de plata van enteros: lo que se deja vacío queda vacío, y un bloque entero
// vacío se borra (la API lo entiende como null).
export async function actualizarValores(_anterior: ResultadoAccion | null, datos: FormData): Promise<ResultadoAccion> {
  const id = textoDe(datos, "propiedadId");
  const campos: Record<string, string> = {};

  const vcMonto = montoDe(datos, "vcMonto", "vcMoneda");
  const vcFecha = textoDe(datos, "vcFecha");
  const vcFuente = textoDe(datos, "vcFuente");
  let valorComercial: PropiedadCambios["valorComercial"] = null;
  if (vcMonto || vcFecha || vcFuente) {
    if (!vcMonto) campos["valorComercial.monto"] = "Anota cuánto vale, o borra la fecha y la fuente.";
    else valorComercial = { monto: vcMonto, fecha: vcFecha ?? null, fuente: (vcFuente as PropiedadValorFuente | undefined) ?? null };
  }

  const precio = montoDe(datos, "compraPrecio", "compraMoneda");
  const compraFecha = textoDe(datos, "compraFecha");
  const compra: PropiedadCambios["compra"] = precio || compraFecha ? { fecha: compraFecha ?? null, precio: precio ?? null } : null;

  const saldo = montoDe(datos, "deudaSaldo", "deudaMoneda");
  const deudaBanco = textoDe(datos, "deudaBanco");
  const deudaFecha = textoDe(datos, "deudaFecha");
  const deudaTermino = textoDe(datos, "deudaTermino");
  const dividendo = numeroDe(textoDe(datos, "deudaDividendo"), monedaDe(datos, "deudaMoneda"));
  let deuda: PropiedadCambios["deuda"] = null;
  if (saldo || deudaBanco || deudaFecha || deudaTermino || dividendo) {
    if (!saldo) campos["deuda.saldo"] = "Anota el saldo, o deja vacía toda la deuda.";
    else deuda = { saldo, banco: deudaBanco ?? null, fecha: deudaFecha ?? null, dividendo: dividendo ?? null, termino: deudaTermino ?? null };
  }

  if (Object.keys(campos).length > 0) return falla(REVISA, campos);
  return ejecutar(
    () => llamar("PATCH", `/v1/propiedades/${encodeURIComponent(id ?? "")}`, { cuerpo: { valorComercial, compra, deuda } }),
    { revalidar: refrescar(id ?? "") },
  );
}

// La carpeta de Drive: la API revisa que la cuenta de servicio de Proges la pueda abrir.
export async function enlazarCarpeta(_anterior: ResultadoAccion | null, datos: FormData): Promise<ResultadoAccion> {
  const id = textoDe(datos, "propiedadId");
  const carpeta = textoDe(datos, "driveCarpetaId");
  if (!carpeta) return falla(REVISA, { driveCarpetaId: "Pega el enlace de la carpeta de Drive." });
  return ejecutar(
    () => llamar("PATCH", `/v1/propiedades/${encodeURIComponent(id ?? "")}`, { cuerpo: { driveCarpetaId: carpeta } }),
    { revalidar: refrescar(id ?? "") },
  );
}

// ---------------------------------------------------------------------------
// Unidades anexas, avalúos y dueños
// ---------------------------------------------------------------------------

export async function agregarUnidad(_anterior: ResultadoAccion | null, datos: FormData): Promise<ResultadoAccion> {
  const id = textoDe(datos, "propiedadId") ?? "";
  const cuerpo: PropiedadUnidadNueva = {
    tipo: textoDe(datos, "tipo") === "BODEGA" ? "BODEGA" : "ESTACIONAMIENTO",
    numero: textoDe(datos, "numero") ?? "",
    rolSII: textoDe(datos, "rolSII") ?? null,
    avaluoFiscal: numeroDe(textoDe(datos, "avaluoFiscal"), "CLP") ?? null,
  };
  return ejecutar(() => llamar("POST", `/v1/propiedades/${encodeURIComponent(id)}/unidades`, { cuerpo }), {
    revalidar: refrescar(id),
  });
}

export async function quitarUnidad(propiedadId: string, unidadId: string): Promise<ResultadoAccion> {
  return ejecutar(
    () => llamar("DELETE", `/v1/propiedades/${encodeURIComponent(propiedadId)}/unidades/${encodeURIComponent(unidadId)}`),
    { revalidar: refrescar(propiedadId) },
  );
}

export async function agregarAvaluo(_anterior: ResultadoAccion | null, datos: FormData): Promise<ResultadoAccion> {
  const id = textoDe(datos, "propiedadId") ?? "";
  const anio = textoDe(datos, "anio");
  const valor = numeroDe(textoDe(datos, "valor"), "CLP");
  const campos: Record<string, string> = {};
  if (!anio || !/^\d{4}$/.test(anio)) campos.anio = "Escribe un año de cuatro cifras.";
  if (!valor) campos.valor = "Anota el avalúo en pesos.";
  if (Object.keys(campos).length > 0) return falla(REVISA, campos);
  return ejecutar(
    () => llamar("POST", `/v1/propiedades/${encodeURIComponent(id)}/avaluos`, { cuerpo: { anio: Number(anio), valor } }),
    { revalidar: refrescar(id) },
  );
}

export async function quitarAvaluo(propiedadId: string, avaluoId: string): Promise<ResultadoAccion> {
  return ejecutar(
    () => llamar("DELETE", `/v1/propiedades/${encodeURIComponent(propiedadId)}/avaluos/${encodeURIComponent(avaluoId)}`),
    { revalidar: refrescar(propiedadId) },
  );
}

export async function agregarDueno(_anterior: ResultadoAccion | null, datos: FormData): Promise<ResultadoAccion> {
  const id = textoDe(datos, "propiedadId") ?? "";
  const duenoId = textoDe(datos, "duenoId");
  const cuerpo: PropiedadDuenoNuevo = {
    porcentaje: numeroDe(textoDe(datos, "porcentaje")) ?? "",
    ...(duenoId
      ? { duenoId }
      : {
          nombre: textoDe(datos, "nombre"),
          rut: textoDe(datos, "rut"),
          tipo: textoDe(datos, "tipoDueno") === "SOCIEDAD" ? "SOCIEDAD" : "PERSONA",
        }),
  };
  return ejecutar(() => llamar("POST", `/v1/propiedades/${encodeURIComponent(id)}/duenos`, { cuerpo }), {
    revalidar: refrescar(id),
  });
}

export async function quitarDueno(propiedadId: string, relacionId: string): Promise<ResultadoAccion> {
  return ejecutar(
    () => llamar("DELETE", `/v1/propiedades/${encodeURIComponent(propiedadId)}/duenos/${encodeURIComponent(relacionId)}`),
    { revalidar: refrescar(propiedadId) },
  );
}

// ---------------------------------------------------------------------------
// Documentos
// ---------------------------------------------------------------------------

export async function subirDocumento(_anterior: ResultadoAccion | null, datos: FormData): Promise<ResultadoAccion> {
  const id = textoDe(datos, "propiedadId") ?? "";
  const archivo = archivoDe(datos, "file");
  if (!archivo) return falla(REVISA, { file: "Elige el PDF que quieres subir." });
  // El formulario que va a la API es otro: solo lleva los campos que la API conoce y que se llenaron.
  const cuerpo = new FormData();
  cuerpo.set("file", archivo);
  for (const campo of ["papel", "tipo", "nombre", "fechaEmision", "fechaVencimiento"]) {
    const valor = textoDe(datos, campo);
    if (valor !== undefined) cuerpo.set(campo, valor);
  }
  return ejecutar(() => llamar("POST", `/v1/propiedades/${encodeURIComponent(id)}/documentos`, { cuerpo }), {
    revalidar: refrescar(id),
  });
}

export async function borrarDocumento(propiedadId: string, documentoId: string): Promise<ResultadoAccion> {
  return ejecutar(() => llamar("DELETE", `/v1/documentos/${encodeURIComponent(documentoId)}`), {
    revalidar: refrescar(propiedadId),
  });
}
