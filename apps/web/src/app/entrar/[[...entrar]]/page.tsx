// La pantalla de entrar. Nadie se registra solo: a cada persona la invita Diego, por eso aquí hay
// SignIn y no SignUp. Si alguien entra con un correo que no está en la lista, Clerk lo deja pasar
// pero la API responde 403 y la web lo manda a /sin-acceso.
//
// Si ya hay una sesión abierta no se muestra el formulario (Clerk intentaría mandar a la persona a
// «/», y si ahí algo falla volvería aquí, en círculo): se ofrece seguir o cerrar la sesión.
import { SignIn, SignOutButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { Boton, estiloBoton } from "@/componentes/ui/boton";
import { Tarjeta } from "@/componentes/ui/tarjeta";

export const metadata = { title: "Entrar" };

function Marca() {
  return <p className="text-3xl font-extrabold tracking-tight">Proges</p>;
}

export default async function Entrar() {
  const { userId } = await auth();

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 py-10">
      <Marca />
      {userId ? (
        <Tarjeta className="w-full max-w-sm gap-4 p-5">
          <p className="text-sm">Ya tienes una sesión abierta.</p>
          <div className="flex flex-col gap-2">
            <Link href="/" className={estiloBoton()}>
              Seguir al portal
            </Link>
            <SignOutButton redirectUrl="/entrar">
              <Boton variante="contorno">Cerrar sesión</Boton>
            </SignOutButton>
          </div>
        </Tarjeta>
      ) : (
        <SignIn
          path="/entrar"
          appearance={{
            variables: {
              colorPrimary: "var(--ink)",
              colorPrimaryForeground: "var(--card)",
              colorDanger: "var(--bad)",
              colorForeground: "var(--fg)",
              colorMutedForeground: "var(--soft)",
              colorMuted: "var(--scr)",
              colorBackground: "var(--card)",
              colorInput: "var(--card)",
              colorInputForeground: "var(--fg)",
              colorBorder: "var(--line)",
              fontFamily: "var(--font-sans)",
              borderRadius: "10px",
            },
          }}
        />
      )}
    </main>
  );
}
