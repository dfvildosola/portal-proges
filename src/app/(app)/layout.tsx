export const dynamic = "force-dynamic";

import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { clientesParaElegir, espaciosQueLee } from "@/lib/org";
import { exigirUsuario } from "@/lib/sesion";
import { agenda, resumenAgenda } from "@/lib/agenda";
import { contarPorRevisar } from "@/lib/operacion";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Primero la sesión: sin ella, espaciosQueLee lanzaría un error en vez de mandar a /entrar.
  const usuario = await exigirUsuario();
  const esEquipo = usuario.rol === "EQUIPO";

  // El equipo ve la cartera de todos los clientes a la vez. Si todavía no existe ninguno, no
  // hay cartera que mirar: se avisa en la franja.
  const clientes = esEquipo ? await clientesParaElegir() : null;
  const sinClientes = esEquipo && clientes?.length === 0;

  const pendientes = sinClientes ? 0 : resumenAgenda(await agenda(await espaciosQueLee())).urgentes;

  // Los proyectos que nacieron de un pedido de cliente y esperan revisión: el número rojo de
  // «Trabajo del equipo». Solo el equipo los ve (y la consulta misma exige ser del equipo).
  const porRevisar = esEquipo ? await contarPorRevisar() : 0;

  return (
    <SidebarProvider>
      <AppSidebar
        rol={usuario.rol}
        esAdmin={usuario.admin}
        contadores={{ pendientes, porRevisar }}
      />
      <SidebarInset>
        <AppHeader />
        {sinClientes && (
          <div
            role="status"
            className="border-b border-warning/30 bg-warning-soft px-4 py-2 text-sm text-warning-soft-foreground"
          >
            Todavía no hay clientes: crea el primero en{" "}
            <Link href="/equipo" className="font-medium underline underline-offset-2">
              Equipo
            </Link>
            . Sin un cliente no hay cartera que ver.
          </div>
        )}
        {/* Ancho máximo: en pantallas anchas las líneas no se estiran de borde a borde. */}
        <div className="mx-auto w-full max-w-7xl min-w-0 flex-1 p-4 md:p-6 lg:p-8">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
