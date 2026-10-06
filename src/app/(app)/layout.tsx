export const dynamic = "force-dynamic";

import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getOrgId } from "@/lib/org";
import { agenda, resumenAgenda } from "@/lib/agenda";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const orgId = await getOrgId();
  const pendientes = resumenAgenda(await agenda(orgId)).urgentes;

  return (
    <SidebarProvider>
      <AppSidebar pendientes={pendientes} />
      <SidebarInset>
        <AppHeader />
        {/* Ancho máximo: en pantallas anchas las líneas no se estiran de borde a borde. */}
        <div className="mx-auto w-full max-w-7xl min-w-0 flex-1 p-4 md:p-6 lg:p-8">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
