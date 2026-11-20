// Lo que varias pantallas del dueño autónomo necesitan pedir a la API. Solo corre en el servidor.
// `cache` de React hace que, aunque tres bloques de una misma pantalla pidan las propiedades, la
// API se consulte una sola vez por visita.
import "server-only";
import { cache } from "react";
import type { PropiedadesPagina } from "@proges/contrato";
import { pedir } from "@/lib/api";

/** Una página de cualquier lista de la API (el contrato la arma con una función y no trae su tipo). */
export type ListaDeApi<T> = { items: T[]; paginacion: { pagina: number; porPagina: number; total: number } };

/** Todas las propiedades del dueño (hasta 100: un dueño que lleva su cartera solo tiene pocas). */
export const propiedadesDelDueno = cache(() =>
  pedir<PropiedadesPagina>("/v1/propiedades", { consulta: { porPagina: 100 } }),
);
