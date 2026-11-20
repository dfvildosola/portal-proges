// El tablero de servicios: los abiertos agrupados por quién tiene la pelota. Funciones puras.
//
//   NUEVO       falta confirmarlo o repartirlo: es un pedido del dueño sin aceptar (porRevisar), o
//               se dedujo de la carga inicial y nadie lo confirma (porConfirmar), o no tiene
//               responsable. Es la misma idea en el Inicio, en Repartir y aquí: antes cada
//               pantalla contaba «nuevo» distinto y se contradecían.
//   ESPERANDO   ya tiene responsable y se espera a alguien de afuera (conservador, notaría,
//               maestro…).
//   NOS_TOCA    ya tiene responsable, no se espera a nadie y hay tareas pendientes, o todavía no
//               tiene ninguna tarea: le toca al equipo (un servicio sin tareas nunca se trabajó,
//               no está terminado).
//   POR_ENTREGAR ya tiene responsable, no se espera a nadie, tiene tareas y todas están hechas:
//               falta entregarlo o darlo por terminado.
// NUEVO manda sobre lo demás: un servicio sin responsable no tiene a quién tocarle la pelota.
import type { ServicioTableroItem } from "@proges/contrato";

// Desde cuántos días de espera un servicio se considera «trabado» (Inicio de la jefatura).
export const DIAS_TRABADO = 10;

export type GrupoDelTablero = "nuevo" | "nosToca" | "esperando" | "porEntregar";

// Un servicio es «nuevo» mientras nadie lo ha tomado: un pedido del dueño sin aceptar, uno de la
// carga inicial sin confirmar, o uno sin responsable. Es la columna «Nuevo» del tablero, y la misma
// regla usan la lista de propiedades y la ficha, para que ninguna pantalla diga otra cosa.
export function esNuevo(s: { porRevisar: boolean; porConfirmar: boolean; sinResponsable: boolean }): boolean {
  return s.porRevisar || s.porConfirmar || s.sinResponsable;
}

export function grupoDelTablero(s: {
  porRevisar: boolean;
  porConfirmar: boolean;
  sinResponsable: boolean;
  esperando: boolean;
  tareasPendientes: number;
  tareasTotal: number;
}): GrupoDelTablero {
  if (esNuevo(s)) return "nuevo";
  if (s.esperando) return "esperando";
  return s.tareasPendientes > 0 || s.tareasTotal === 0 ? "nosToca" : "porEntregar";
}

// `tareasTotal` cuenta las hechas y las pendientes: sirve solo para distinguir «sin tareas»
// de «todas hechas»; no sale hacia la web.
export type FilaDeTablero = { tareasTotal: number; item: ServicioTableroItem };

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
  for (const { tareasTotal, item } of filas) {
    const grupo = grupoDelTablero({
      porRevisar: item.porRevisar,
      porConfirmar: item.porConfirmar,
      sinResponsable: item.responsable === null,
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

// Los abiertos menos los pedidos del dueño que todavía no se aceptan (esos aún no son un servicio
// en curso). Es la cifra «servicios en curso» del Inicio.
export function enCurso(g: TableroAgrupado): number {
  const todos = g.nuevo.length + g.nosToca.length + g.esperando.length + g.porEntregar.length;
  return todos - g.nuevo.filter((i) => i.porRevisar).length;
}

// Los servicios esperando hace más de DIAS_TRABADO días.
export function esperandoMasDeLoNormal(items: readonly ServicioTableroItem[]): ServicioTableroItem[] {
  return items.filter((i) => (i.esperando?.dias ?? 0) > DIAS_TRABADO);
}

// Todo lo que espera a alguien de afuera, esté en la columna que esté. Un servicio por confirmar o
// sin responsable va a «Nuevo», pero igual puede llevar días esperando al conservador: si se mirara
// solo la columna «Esperando», esa espera no saldría en «Trabado» ni en las cifras del Inicio.
// (Las columnas «Nos toca» y «Por entregar» nunca tienen espera, por definición.) Los que más
// esperan, primero.
export function conEspera(g: TableroAgrupado): ServicioTableroItem[] {
  return [...g.esperando, ...g.nuevo.filter((i) => i.esperando !== null)].sort(
    (a, b) => (b.esperando?.dias ?? 0) - (a.esperando?.dias ?? 0),
  );
}
