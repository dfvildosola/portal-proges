// Cabecera y marco del panel del cliente. Está FUERA del grupo (app): el cliente
// no ve el menú lateral del equipo, solo una barra simple con su nombre de grupo.
//
// `exigirCliente` manda a /entrar a quien no tiene sesión y al equipo a su propia
// pantalla; los datos de la cabecera salen de la puerta del cliente (src/lib/cliente.ts).
export const dynamic = "force-dynamic";

import { UserButton } from "@clerk/nextjs";
import { ThemeToggle } from "@/components/theme-toggle";
import { grupoDelCliente } from "@/lib/cliente";
import { exigirCliente } from "@/lib/sesion";

export default async function ClienteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const usuario = await exigirCliente();
  const grupo = await grupoDelCliente(usuario);

  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-3 px-4">
          <span className="text-lg font-semibold tracking-tight">Proges</span>
          {grupo && (
            <span className="min-w-0 truncate text-sm text-muted-foreground">
              {grupo.nombre}
            </span>
          )}
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            {/* Foto de la persona; al tocarla ofrece salir. */}
            <UserButton />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl min-w-0 flex-1 p-4 md:py-8">
        {children}
      </main>
    </div>
  );
}
