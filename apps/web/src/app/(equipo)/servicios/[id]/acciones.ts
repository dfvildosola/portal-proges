"use server";
// Lo que se puede hacer desde la ficha de un servicio. Cada acción llama a la API (que revisa el
// permiso) y devuelve { ok } o el mensaje de la API; nunca lanza por un rechazo de la API.
// Las que se llaman con un toque (marcar una tarea, cambiar responsable) reciben argumentos
// sueltos; las de formulario reciben el FormData.
import type { EsperandoA } from "@proges/contrato";
import { ejecutar, textoDe, type ResultadoAccion } from "@/lib/acciones";
import { llamar } from "@/lib/api";

const ESPERA_VALIDA = new Set<string>(["CONSERVADOR", "NOTARIA", "MUNICIPALIDAD", "MAESTRO", "DUENO", "BANCO", "OTRO"]);

const pantalla = (servicioId: string) => `/servicios/${servicioId}`;
// El tablero también muestra responsable, espera y tareas: se refresca junto con la ficha.
const pantallas = (servicioId: string) => [pantalla(servicioId), "/servicios", "/inicio", "/hoy"];
const rutaDe = (servicioId: string) => `/v1/servicios/${encodeURIComponent(servicioId)}`;

/** Cambia quién lleva el servicio. `responsableId` null lo deja sin responsable. */
export async function cambiarResponsable(servicioId: string, responsableId: string | null): Promise<ResultadoAccion> {
  return ejecutar(() => llamar("PATCH", rutaDe(servicioId), { cuerpo: { responsableId } }), {
    revalidar: pantallas(servicioId),
  });
}

/** Cambia a quién se espera. El valor «NOS_TOCA» del formulario significa que ya no se espera a nadie. */
export async function cambiarEspera(_anterior: ResultadoAccion | null, datos: FormData): Promise<ResultadoAccion> {
  const servicioId = textoDe(datos, "servicioId");
  if (!servicioId) throw new Error("Falta servicioId en el formulario de «esperando a».");
  const eleccion = textoDe(datos, "esperandoA");
  if (eleccion !== "NOS_TOCA" && (!eleccion || !ESPERA_VALIDA.has(eleccion))) {
    return { ok: false, error: "Elige a quién se espera, o «Nos toca».", campos: { esperandoA: "Elige una opción." } };
  }
  const esperandoA: EsperandoA | null = eleccion === "NOS_TOCA" ? null : (eleccion as EsperandoA);
  return ejecutar(
    () =>
      llamar("PATCH", rutaDe(servicioId), {
        cuerpo: { esperandoA, esperandoDetalle: esperandoA ? (textoDe(datos, "esperandoDetalle") ?? null) : null },
      }),
    { revalidar: pantallas(servicioId) },
  );
}

/** Deja de esperar a otro: la pelota vuelve a nuestro lado («Nos toca»). Es lo mismo que elegir «Nos toca» en la ventana de espera, pero con un toque. */
export async function yaNoEsperamos(servicioId: string): Promise<ResultadoAccion> {
  return ejecutar(() => llamar("PATCH", rutaDe(servicioId), { cuerpo: { esperandoA: null, esperandoDetalle: null } }), {
    revalidar: pantallas(servicioId),
  });
}

/** Confirma un servicio de la carga inicial: desde ahí el dueño lo ve en su portal. */
export async function confirmarServicio(servicioId: string): Promise<ResultadoAccion> {
  return ejecutar(() => llamar("POST", `${rutaDe(servicioId)}/confirmar`), { revalidar: pantallas(servicioId) });
}

/** Da el servicio por terminado o lo cancela, con su motivo. */
export async function cerrarServicio(_anterior: ResultadoAccion | null, datos: FormData): Promise<ResultadoAccion> {
  const servicioId = textoDe(datos, "servicioId");
  if (!servicioId) throw new Error("Falta servicioId en el formulario de cierre.");
  return ejecutar(
    () =>
      llamar("POST", `${rutaDe(servicioId)}/cerrar`, {
        cuerpo: { resultado: textoDe(datos, "resultado"), motivo: textoDe(datos, "motivo") ?? "" },
      }),
    { revalidar: pantallas(servicioId) },
  );
}

/** Marca o desmarca que el dueño vea una nota (y sus fotos). */
export async function cambiarVisibilidadDeNota(
  servicioId: string,
  notaId: string,
  paraDueno: boolean,
): Promise<ResultadoAccion> {
  return ejecutar(() => llamar("PATCH", `/v1/notas/${encodeURIComponent(notaId)}`, { cuerpo: { paraDueno } }), {
    revalidar: [pantalla(servicioId)],
  });
}
