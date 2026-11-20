// El marco de todas las pantallas del equipo: menú lateral en computador, barra de abajo en celular
// y, arriba, quién está conectado. Es la puerta del equipo: si quien entra no es del equipo de
// Proges (un dueño o una llave), lo manda a su propia pantalla.
import { redirect } from "next/navigation";
import { BarraInferior } from "@/componentes/layout/barra-inferior";
import { Cabecera } from "@/componentes/layout/cabecera";
import { MenuLateral } from "@/componentes/layout/menu-lateral";
import { yo } from "@/lib/api";

export default async function LayoutDelEquipo({ children }: { children: React.ReactNode }) {
  const quien = await yo();
  if (quien.tipo !== "usuario" || quien.rol !== "EQUIPO") redirect("/mi");

  const { jefatura, admin } = quien.marcas;
  const rol = admin ? "Administrador" : jefatura ? "Jefatura" : "Equipo";

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[196px_minmax(0,1fr)]">
      <MenuLateral verResultados={jefatura || admin} verConfiguracion={admin} />
      <div className="flex min-w-0 flex-col">
        <Cabecera nombre={quien.usuario.nombre} rol={rol} />
        <main className="flex-1 px-4 pt-4 pb-28 lg:px-6 lg:pt-5 lg:pb-10">{children}</main>
      </div>
      <BarraInferior />
    </div>
  );
}
