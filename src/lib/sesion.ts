// Quién es la persona que entró, y qué puede hacer.
//
// Clerk solo responde «esta persona es dueña de este correo». Quién tiene permiso de
// entrar al portal y con qué rol (EQUIPO de Proges o CLIENTE de un espacio) lo dice la
// tabla Usuario: la persona que administra los usuarios la llena en /equipo. Es como la
// portería de un edificio: Clerk revisa el carnet, y la lista de residentes autorizados
// está en esta tabla.
//
// Las funciones `exigir*` son para páginas (redirigen); las `*EnAccion` son para
// server actions (lanzan un error, porque una acción no puede redirigir a medio camino).
import { cache } from "react";
import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { COOKIE_CLIENTE_ACTIVO } from "@/lib/org";
import type { Usuario } from "@/generated/prisma/client";

// El último ingreso se anota como máximo una vez por hora, para no escribir en la base
// en cada petición.
const UNA_HORA_MS = 60 * 60 * 1000;

type Sesion = {
  // ¿Hay una sesión de Clerk? (si no, hay que mandar a /entrar)
  hayClerk: boolean;
  // El Usuario de la base, o null si no existe o está desactivado.
  usuario: Usuario | null;
};

// `cache` hace que, dentro de una misma petición, se consulte una sola vez aunque
// el layout y la página pidan la sesión por separado.
const buscarSesion = cache(async (): Promise<Sesion> => {
  const clerk = await currentUser();
  if (!clerk) return { hayClerk: false, usuario: null };

  const correo = clerk.primaryEmailAddress?.emailAddress?.trim().toLowerCase();
  if (!correo) return { hayClerk: true, usuario: null };

  const usuario = await db.usuario.findUnique({ where: { email: correo } });
  if (!usuario || !usuario.activo) return { hayClerk: true, usuario: null };

  const ahora = new Date();
  if (!usuario.ultimoIngreso || ahora.getTime() - usuario.ultimoIngreso.getTime() > UNA_HORA_MS) {
    const actualizado = await db.usuario.update({
      where: { id: usuario.id },
      data: { ultimoIngreso: ahora },
    });
    return { hayClerk: true, usuario: actualizado };
  }
  return { hayClerk: true, usuario };
});

// El Usuario de la base que entró, o null.
export async function usuarioActual(): Promise<Usuario | null> {
  return (await buscarSesion()).usuario;
}

// Para cualquier página del portal. Sin sesión va a /entrar; con sesión de Clerk pero sin
// Usuario activo va a /sin-acceso.
export async function exigirUsuario(): Promise<Usuario> {
  const { hayClerk, usuario } = await buscarSesion();
  if (!hayClerk) redirect("/entrar");
  if (!usuario) redirect("/sin-acceso");
  return usuario;
}

// Para páginas del equipo (Operación, Equipo…). Igual que exigirUsuario, y un cliente
// que llegue acá vuelve al inicio.
export async function exigirEquipo(): Promise<Usuario> {
  const usuario = await exigirUsuario();
  if (usuario.rol === "CLIENTE") redirect("/");
  return usuario;
}

// Igual que exigirEquipo, y además exige la marca de admin (el que crea clientes y usuarios y edita etapas).
export async function exigirAdmin(): Promise<Usuario> {
  const usuario = await exigirEquipo();
  if (!usuario.admin) redirect("/");
  return usuario;
}

// Para server actions: solo un integrante activo del equipo.
export async function equipoEnAccion(): Promise<Usuario> {
  const usuario = await usuarioActual();
  if (!usuario || usuario.rol !== "EQUIPO") throw new Error("Sin permiso");
  return usuario;
}

// Para server actions de administración: equipo y además admin.
export async function adminEnAccion(): Promise<Usuario> {
  const usuario = await equipoEnAccion();
  if (!usuario.admin) throw new Error("Sin permiso");
  return usuario;
}

// Para server actions de la cartera: solo un usuario activo de un cliente.
export async function clienteEnAccion(): Promise<Usuario> {
  const usuario = await usuarioActual();
  if (!usuario || usuario.rol !== "CLIENTE") throw new Error("Sin permiso");
  return usuario;
}

// El cliente que el equipo está mirando, o null si quien entró no es del equipo o todavía no
// hay clientes. Se guarda en una cookie, pero la cookie no se cree: se comprueba contra la
// tabla Organizacion (que sea un cliente y esté activo). Si falta o ya no vale, se usa el
// primer cliente activo por nombre.
// `cache` evita repetir la consulta cuando el layout y la página lo piden en la misma petición.
export const clienteActivo = cache(async (): Promise<{ id: string; nombre: string } | null> => {
  const usuario = await usuarioActual();
  if (!usuario || usuario.rol !== "EQUIPO") return null;

  const elegido = (await cookies()).get(COOKIE_CLIENTE_ACTIVO)?.value;
  if (elegido) {
    const cliente = await db.organizacion.findFirst({
      where: { id: elegido, tipo: "CLIENTE", activa: true },
      select: { id: true, nombre: true },
    });
    if (cliente) return cliente;
  }
  return db.organizacion.findFirst({
    where: { tipo: "CLIENTE", activa: true },
    orderBy: { nombre: "asc" },
    select: { id: true, nombre: true },
  });
});
