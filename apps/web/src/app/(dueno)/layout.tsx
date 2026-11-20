// El marco de todas las pantallas del dueño: nombre del cliente arriba, menú lateral en computador
// y barra de abajo en celular. Es la puerta del dueño: si quien entra es del equipo de Proges, lo
// manda a su inicio. (Una llave de sistema no tiene pantallas: solo lee por la API; si llega
// aquí, ve el portal de su cliente igual que un dueño y la API ya recorta lo que sale.)
import { redirect } from "next/navigation";
import { BarraInferiorDueno } from "@/componentes/dueno/barra-inferior-dueno";
import { CabeceraDueno } from "@/componentes/dueno/cabecera-dueno";
import { MenuLateralDueno } from "@/componentes/dueno/menu-lateral-dueno";
import { yo } from "@/lib/api";

export default async function LayoutDelDueno({ children }: { children: React.ReactNode }) {
  const quien = await yo();
  if (quien.tipo === "usuario" && quien.rol === "EQUIPO") redirect("/inicio");
  if (!quien.cliente) redirect("/sin-acceso");

  const autonomo = quien.cliente.modo === "AUTONOMO";
  const persona = quien.tipo === "usuario" ? quien.usuario.nombre : quien.llave.nombre;

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[196px_minmax(0,1fr)]">
      <MenuLateralDueno cliente={quien.cliente.nombre} autonomo={autonomo} />
      <div className="flex min-w-0 flex-col">
        <CabeceraDueno cliente={quien.cliente.nombre} persona={persona} />
        <main className="flex-1 px-4 pt-4 pb-28 lg:px-6 lg:pt-5 lg:pb-10">{children}</main>
      </div>
      <BarraInferiorDueno autonomo={autonomo} />
    </div>
  );
}
