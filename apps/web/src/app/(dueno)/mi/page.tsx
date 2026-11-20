// El inicio del dueño: según cómo lo atiende Proges, ve una cosa u otra.
// - ATENDIDO (un cliente grande al que Proges le hace los servicios): el avance de lo que se le hace.
// - AUTONOMO (el dueño que lleva su cartera): sus propiedades y lo que vence.
import { InicioAtendido } from "@/componentes/dueno/inicio-atendido";
import { InicioAutonomo } from "@/componentes/dueno/inicio-autonomo";
import { yo } from "@/lib/api";

export const metadata = { title: "Inicio" };

export default async function InicioDelDueno() {
  const quien = await yo();
  return quien.cliente?.modo === "AUTONOMO" ? <InicioAutonomo /> : <InicioAtendido />;
}
