export const dynamic = "force-dynamic";

import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { clientesActivos, getOrgId } from "@/lib/org";
import { clienteActivo, exigirUsuario } from "@/lib/sesion";
import { agenda, resumenAgenda } from "@/lib/agenda";
import { contarSolicitudesNuevas } from "@/lib/operacion";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Primero la sesión: sin ella, getOrgId lanzaría un error en vez de mandar a /entrar.
  const usuario = await exigirUsuario();
  const esEquipo = usuario.rol === "EQUIPO";

  // El equipo mira la cartera de un cliente a la vez (el «cliente activo»). Si todavía no
  // existe ninguno, no hay cartera que mirar: se avisa en la franja y no se calcula nada.
  const clientes = esEquipo ? await clientesActivos() : [];
  const cliente = esEquipo ? await clienteActivo() : null;
  const hayCartera = !esEquipo || cliente !== null;

  const pendientes = hayCartera ? resumenAgenda(await agenda(await getOrgId())).urgentes : 0;

  // Las solicitudes de los clientes que esperan respuesta: el número rojo de «Operación».
  // Solo el equipo las ve (y la consulta misma exige ser del equipo).
  const solicitudes = esEquipo ? await contarSolicitudesNuevas() : 0;

  return (
    <SidebarProvider>
      <AppSidebar
        rol={usuario.rol}
        esAdmin={usuario.admin}
        contadores={{ pendientes, solicitudes }}
      />
      <SidebarInset>
        <AppHeader clientes={esEquipo ? clientes : undefined} clienteActivoId={cliente?.id} />
        {esEquipo && (
          // La franja recuerda que el equipo mira, no edita: la cartera es del cliente.
          <div
            role="status"
            className="border-b border-warning/30 bg-warning-soft px-4 py-2 text-sm text-warning-soft-foreground"
          >
            {cliente ? (
              <>
                Estás viendo la cartera de <strong>{cliente.nombre}</strong>: solo lectura. Proges
                gestiona sus servicios.
              </>
            ) : (
              <>
                Todavía no hay clientes: crea el primero en{" "}
                <Link href="/equipo" className="font-medium underline underline-offset-2">
                  Equipo
                </Link>
                . Sin un cliente no hay cartera que ver, y las pantallas de la cartera no se pueden abrir.
              </>
            )}
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
