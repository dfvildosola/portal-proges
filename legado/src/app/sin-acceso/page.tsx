// A esta pantalla llega quien entró con Clerk pero no está en la lista de usuarios del portal
// (o fue desactivado). No pide permisos propios: solo exige la sesión de Clerk, que ya
// la pide el proxy.
import { SignOutButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export default function SinAccesoPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-5 p-4 text-center">
      <h1 className="text-xl font-semibold tracking-tight">Sin acceso</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Tu correo no tiene acceso al portal de Proges. Pídele a Proges que te lo dé.
      </p>
      <SignOutButton>
        <Button variant="outline">Salir</Button>
      </SignOutButton>
    </main>
  );
}
