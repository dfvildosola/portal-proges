// A donde va quien tiene sesión de Clerk pero la API no lo deja entrar (403): su correo no está
// invitado, o su cuenta está desactivada. Muestra el mensaje que escribió la API. Si la API ya sí lo
// deja pasar (le dieron acceso mientras tanto), lo manda al inicio.
import { SignOutButton } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { Boton } from "@/componentes/ui/boton";
import { Tarjeta } from "@/componentes/ui/tarjeta";
import { ErrorDeApi, llamar } from "@/lib/api";

export const metadata = { title: "Sin acceso" };

export default async function SinAcceso() {
  let mensaje: string | null = null;
  try {
    await llamar("GET", "/v1/yo");
  } catch (error) {
    if (!(error instanceof ErrorDeApi)) throw error;
    if (error.status === 401) redirect("/entrar");
    if (error.status !== 403) throw error;
    mensaje = error.mensaje;
  }
  // La API respondió bien: esta persona sí tiene acceso, no tiene nada que hacer aquí.
  if (mensaje === null) redirect("/");

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 py-10">
      <p className="text-3xl font-extrabold tracking-tight">Proges</p>
      <Tarjeta className="w-full max-w-sm gap-4 p-5">
        <h1 className="text-lg font-extrabold tracking-tight">No tienes acceso</h1>
        <p className="text-sm text-soft">{mensaje}</p>
        <SignOutButton redirectUrl="/entrar">
          <Boton variante="contorno">Entrar con otra cuenta</Boton>
        </SignOutButton>
      </Tarjeta>
    </main>
  );
}
