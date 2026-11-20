// Todas las rutas de /v1, juntas. Cada área tiene su archivo y su router; aquí solo se montan.
//
// Las rutas de cada archivo escriben su dirección completa después de /v1 («/propiedades/{id}»),
// y se montan en "/". Así una pieza puede tener rutas bajo otra área (los documentos cuelgan de
// /propiedades/{id}/documentos) sin tocar este archivo.
//
// Este archivo es de la pieza B: las piezas C a H no lo editan (sus routers ya están aquí).
import { nuevoRouter } from "../entorno";
import { salud } from "./salud";
import { yo } from "./yo";
import { equipo } from "./equipo";
import { propiedades } from "./propiedades";
import { documentos } from "./documentos";
import { vencimientos } from "./vencimientos";
import { servicios } from "./servicios";
import { tareas } from "./tareas";
import { notas } from "./notas";
import { pedidos } from "./pedidos";
import { inicio } from "./inicio";
import { catalogo } from "./catalogo";
import { obra } from "./obra";
import { maestros } from "./maestros";
import { venta } from "./venta";
import { cartera } from "./cartera";
import { administracion } from "./administracion";
import { config } from "./config";
import { llaves } from "./llaves";
import { resultados } from "./resultados";

export const rutasV1 = nuevoRouter();

for (const router of [
  salud,
  yo,
  equipo,
  propiedades, // pieza C
  documentos, // pieza C
  vencimientos, // pieza C
  servicios, // pieza D
  tareas, // pieza D
  notas, // pieza D
  pedidos, // pieza D
  inicio, // pieza D
  catalogo, // pieza D
  obra, // pieza E
  maestros, // pieza E
  venta, // pieza F
  cartera, // pieza G
  administracion, // pieza G
  config, // pieza H
  llaves, // pieza H
  resultados, // pieza H
]) {
  rutasV1.route("/", router);
}
