// Pantalla de entrar. Nadie se registra solo: los usuarios los crea el admin en /equipo,
// por eso aquí hay SignIn y no SignUp. Si alguien entra con un correo que no está
// en la lista, Clerk lo deja pasar pero el portal lo manda a /sin-acceso.
import { SignIn } from "@clerk/nextjs";

export default function EntrarPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 p-4">
      <div className="flex items-center gap-3">
        {/* Mismo símbolo de la barra lateral: una propiedad (el cuadrado) y alguien que la cuida (el punto arena). */}
        <div className="relative size-6 rounded-[6px] bg-primary">
          <div className="absolute -right-1 -bottom-1 size-2.5 rounded-full bg-arena" />
        </div>
        <span className="text-2xl font-bold tracking-[-0.035em]">Proges</span>
      </div>
      <SignIn path="/entrar" />
    </main>
  );
}
