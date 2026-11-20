// El contrato de la API de Proges: todo lo que la API recibe y entrega.
//
// La web importa de aquí sus tipos (`import type { Yo } from "@proges/contrato"`) y la API sus
// esquemas para validar. Cada área vive en su archivo; este solo los junta.
export * from "./comun";
export * from "./acceso";
export * from "./propiedades";
export * from "./trabajo";
export * from "./obra";
export * from "./venta";
export * from "./cartera";
export * from "./config";
