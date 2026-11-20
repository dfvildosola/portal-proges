// La lista de clientes para el filtro de la lista y para elegir de quién es una propiedad nueva.
// Sale de GET /v1/clientes/activos, que ve todo el equipo (la lista completa de configuración es
// solo del administrador).
import "server-only";
import type { ClientesActivos } from "@proges/contrato";
import { pedir } from "@/lib/api";

export type ClienteElegible = { id: string; nombre: string };

export async function clientesParaElegir(): Promise<{ clientes: ClienteElegible[] }> {
  const { items } = await pedir<ClientesActivos>("/v1/clientes/activos");
  return { clientes: items };
}
