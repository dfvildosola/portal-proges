// El tablero de servicios: los abiertos agrupados por quién tiene la pelota. Funciones puras.
//
//   NUEVO       viene de un pedido y la jefatura todavía no lo reparte (porRevisar).
//   ESPERANDO   se espera a alguien de afuera (conservador, notaría, maestro…).
//   NOS_TOCA    no se espera a nadie y hay tareas pendientes, o todavía no tiene ninguna tarea:
//               le toca al equipo (un servicio sin tareas nunca se trabajó, no está terminado).
//   POR_ENTREGAR no se espera a nadie, tiene tareas y todas están hechas: falta entregarlo o
//               darlo por terminado.
import type { ServicioTableroItem } from "@proges/contrato";

// Desde cuántos días de espera un servicio se considera «trabado» (Inicio de la jefatura).
export const DIAS_TRABADO = 10;

export type GrupoDelTablero = "nuevo" | "nosToca" | "esperando" | "porEntregar";

export function grupoDelTablero(s: {
  porRevisar: boolean;
  esperando: boolean;
  tareasPendientes: number;
  tareasTotal: number;
}): GrupoDelTablero {
  if (s.porRevisar) return "nuevo";
  if (s.esperando) return "esperando";
  return s.tareasPendientes > 0 || s.tareasTotal === 0 ? "nosToca" : "porEntregar";
}

// `tareasTotal` cuenta las hechas y las pendientes: sirve solo para distinguir «sin tareas»
// de «todas hechas»; no sale hacia la web.
export type FilaDeTablero = { porRevisar: boolean; tareasTotal: number; item: ServicioTableroItem };

export type TableroAgrupado = {
  nuevo: ServicioTableroItem[];
  nosToca: ServicioTableroItem[];
  esperando: ServicioTableroItem[];
  porEntregar: ServicioTableroItem[];
};

// Reparte las filas en los cuatro grupos. Cada grupo sale ordenado: los que más esperan arriba
// en «esperando»; en los demás, los más antiguos primero (llevan más tiempo abiertos).
export function agruparTablero(filas: readonly FilaDeTablero[]): TableroAgrupado {
  const grupos: TableroAgrupado = { nuevo: [], nosToca: [], esperando: [], porEntregar: [] };
  for (const { porRevisar, tareasTotal, item } of filas) {
    const grupo = grupoDelTablero({
      porRevisar,
      esperando: item.esperando !== null,
      tareasPendientes: item.tareasPendientes,
      tareasTotal,
    });
    grupos[grupo].push(item);
  }
  const masAntiguoPrimero = (a: ServicioTableroItem, b: ServicioTableroItem) => a.abiertoEl.localeCompare(b.abiertoEl);
  grupos.nuevo.sort(masAntiguoPrimero);
  grupos.nosToca.sort(masAntiguoPrimero);
  grupos.porEntregar.sort(masAntiguoPrimero);
  grupos.esperando.sort((a, b) => (b.esperando?.dias ?? 0) - (a.esperando?.dias ?? 0) || masAntiguoPrimero(a, b));
  return grupos;
}

// Los servicios esperando hace más de DIAS_TRABADO días.
export function esperandoMasDeLoNormal(items: readonly ServicioTableroItem[]): ServicioTableroItem[] {
  return items.filter((i) => (i.esperando?.dias ?? 0) > DIAS_TRABADO);
}
