// El portal del dueño y del cliente llega en la etapa 3. Mientras tanto, quien entra como cliente
// ve este aviso. Si por error llega aquí alguien del equipo, se le manda a su inicio.
import { SignOutButton } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { Boton } from "@/componentes/ui/boton";
import { Tarjeta } from "@/componentes/ui/tarjeta";
import { yo } from "@/lib/api";

export const metadata = { title: "Tu portal" };

export default async function MiPortal() {
  const quien = await yo();
  if (quien.tipo === "usuario" && quien.rol === "EQUIPO") redirect("/");

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 py-10">
      <p className="text-3xl font-extrabold tracking-tight">Proges</p>
      <Tarjeta className="w-full max-w-sm gap-4 p-5">
        <h1 className="text-lg font-extrabold tracking-tight">Tu portal está en construcción</h1>
        <p className="text-sm text-soft">
          Muy pronto vas a poder ver aquí tus propiedades, el avance de cada servicio y pedirle a Proges lo que necesites.
        </p>
        <SignOutButton redirectUrl="/entrar">
          <Boton variante="contorno">Cerrar sesión</Boton>
        </SignOutButton>
      </Tarjeta>
    </main>
  );
}
