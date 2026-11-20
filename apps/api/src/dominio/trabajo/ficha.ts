// La ficha de un servicio: lo que se lee para GET /v1/servicios/{id} y para responder después de
// cambiarlo. El equipo ve la ficha completa; un dueño o una llave, la versión recortada.
import { db, type Prisma } from "@proges/db";
import type { ServicioDueno, ServicioEquipo } from "@proges/contrato";
import type { Quien } from "../../acceso/quien";
import { ErrorApi } from "../../errores";
import { esDueno, legible } from "../../permisos";
import { clientesPorId } from "./consultas";
import { servicioParaDueno, servicioParaEquipo } from "./recorte";
import { seleccionFichaDueno, seleccionFichaEquipo } from "./selecciones";

// Lo que un dueño puede ver de sus servicios: abiertos y terminados, y ninguno «por confirmar»
// (una suposición de la carga inicial) ni «por revisar» (un pedido que la jefatura todavía no
// reparte: el dueño lo ve como pedido, no como servicio). Los cancelados tampoco.
export const VISIBLE_PARA_DUENO: Prisma.ServicioEnCursoWhereInput = {
  estado: { in: ["ABIERTO", "TERMINADO"] },
  porConfirmar: false,
  porRevisar: false,
};

export function visibleParaDueno(s: { estado: string; porConfirmar: boolean; porRevisar: boolean }): boolean {
  return s.estado !== "CANCELADO" && !s.porConfirmar && !s.porRevisar;
}

export const SERVICIO_NO_ENCONTRADO = "No se encontró lo que buscas.";

export async function fichaParaEquipo(id: string, hoy: Date): Promise<ServicioEquipo> {
  const s = await db.servicioEnCurso.findUnique({ where: { id }, select: seleccionFichaEquipo });
  if (!s) throw new ErrorApi(404, SERVICIO_NO_ENCONTRADO);
  const clienteDe = await clientesPorId([s.organizationId]);
  return servicioParaEquipo(s, hoy, clienteDe(s.organizationId));
}

// Lanza 404 si el servicio no existe o no es legible para quien pregunta (de otro cliente, o uno
// que el dueño no puede ver).
export async function fichaDelServicio(quien: Quien, id: string, hoy: Date): Promise<ServicioEquipo | ServicioDueno> {
  if (esDueno(quien)) {
    const s = await legible(quien, await db.servicioEnCurso.findUnique({ where: { id }, select: seleccionFichaDueno }));
    if (!visibleParaDueno(s)) throw new ErrorApi(404, SERVICIO_NO_ENCONTRADO);
    return servicioParaDueno(s, hoy);
  }
  // El equipo lee a todos los clientes activos: se comprueba que este lo sea antes de armar nada.
  const previa = await db.servicioEnCurso.findUnique({ where: { id }, select: { organizationId: true } });
  await legible(quien, previa);
  return fichaParaEquipo(id, hoy);
}
