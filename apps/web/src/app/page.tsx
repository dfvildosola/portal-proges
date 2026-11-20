// La raíz «/» no muestra nada: manda a cada uno a su pantalla de inicio.
// - Un dueño o una llave (los del portal del cliente, etapa 3) → /mi.
// - El equipo: en celular abre en «Hoy» (su día en terreno) y en computador en «Inicio».
//   El servidor no ve el tamaño de la pantalla, así que mira el tipo de aparato que pide la página.
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { yo } from "@/lib/api";

export default async function Raiz() {
  const quien = await yo();
  if (quien.tipo !== "usuario" || quien.rol !== "EQUIPO") redirect("/mi");

  const aparato = (await headers()).get("user-agent") ?? "";
  redirect(/Mobi|Android|iPhone/i.test(aparato) ? "/hoy" : "/inicio");
}
