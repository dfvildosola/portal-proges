// A qué tipos de servicio sirve cada familia del catálogo. Funciones puras.
//
// El catálogo trae una «familia» por prefijo del código (NV, RR, ADMP…). Cada tipo de servicio
// ofrece ciertas familias (ver TIPOS_SERVICIO en servicios.ts); una familia puede servir a varios
// tipos (NV sirve a venta y arriendo).
import type { ServicioTipo } from "@proges/db/enums";
import { familiasDelTipo, TIPOS_SERVICIO } from "./servicios";

const TODOS = Object.keys(TIPOS_SERVICIO) as ServicioTipo[];

// Los tipos de servicio en que se puede ofrecer un servicio de esa familia.
export function tiposDeFamilia(familia: string): ServicioTipo[] {
  return TODOS.filter((tipo) => familiasDelTipo(tipo).includes(familia));
}

// El tipo que corresponde a la familia, si es uno solo. Si sirve a varios (NV, ADMP, SC) devuelve
// null: quien abre el servicio tiene que elegir el tipo, y la API no adivina.
export function tipoUnicoDeFamilia(familia: string): ServicioTipo | null {
  const tipos = tiposDeFamilia(familia);
  return tipos.length === 1 ? tipos[0] : null;
}
