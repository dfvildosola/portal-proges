"use server";

// Cambiar qué cliente está mirando el equipo (el selector de la cabecera).
// Es como cambiar de piso en el ascensor: el equipo elige, y desde ese momento ve la
// cartera de ese cliente. El valor queda en una cookie, pero se comprueba contra la tabla
// Organizacion cada vez que se usa (ver clienteActivo en src/lib/sesion.ts).

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { COOKIE_CLIENTE_ACTIVO } from "@/lib/org";
import { equipoEnAccion } from "@/lib/sesion";

const UN_ANO_EN_SEGUNDOS = 60 * 60 * 24 * 365;

export async function cambiarClienteActivo(id: string): Promise<{ error?: string }> {
  await equipoEnAccion();

  const cliente = await db.organizacion.findFirst({
    where: { id, tipo: "CLIENTE", activa: true },
    select: { id: true },
  });
  if (!cliente) return { error: "Ese cliente no existe o está desactivado." };

  (await cookies()).set(COOKIE_CLIENTE_ACTIVO, cliente.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: UN_ANO_EN_SEGUNDOS,
  });

  // El layout lleva el nombre del cliente y el contador del menú: se vuelve a calcular todo.
  revalidatePath("/", "layout");
  return {};
}
