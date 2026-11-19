// Quién es la persona que entró, y qué puede hacer.
//
// Clerk solo responde «esta persona es dueña de este correo». Quién tiene permiso de
// entrar al portal, con qué rol y con qué alcance lo dice la tabla Usuario: la persona
// que administra los usuarios la llena en /equipo. Es como la portería de un edificio:
// Clerk revisa el carnet, y la lista de residentes autorizados está en esta tabla.
//
// Las funciones `exigir*` son para páginas (redirigen); las `*EnAccion` son para
// server actions (lanzan un error, porque una acción no puede redirigir a medio camino).
import { cache } from "react";
import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
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

// Para páginas del equipo. Sin sesión va a /entrar; con sesión de Clerk pero sin
// Usuario activo va a /sin-acceso; un cliente va a su panel.
export async function exigirEquipo(): Promise<Usuario> {
  const { hayClerk, usuario } = await buscarSesion();
  if (!hayClerk) redirect("/entrar");
  if (!usuario) redirect("/sin-acceso");
  if (usuario.rol === "CLIENTE") redirect("/cliente");
  return usuario;
}

// Igual que exigirEquipo, y además exige la marca de admin (el que crea usuarios y edita etapas).
export async function exigirAdmin(): Promise<Usuario> {
  const usuario = await exigirEquipo();
  if (!usuario.admin) redirect("/");
  return usuario;
}

// Para páginas de /cliente. Un integrante del equipo va a la pantalla del equipo.
export async function exigirCliente(): Promise<Usuario> {
  const { hayClerk, usuario } = await buscarSesion();
  if (!hayClerk) redirect("/entrar");
  if (!usuario) redirect("/sin-acceso");
  if (usuario.rol === "EQUIPO") redirect("/");
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
