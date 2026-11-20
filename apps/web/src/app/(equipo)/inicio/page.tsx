// El Inicio del equipo en el computador: la mirada de la jefatura cada mañana. Una sola llamada a
// la API (GET /v1/inicio) trae todo: las cifras, lo nuevo, lo trabado, la carga del equipo y las
// últimas notas con foto.
import type { Metadata } from "next";
import Link from "next/link";
import type { InicioEquipo } from "@proges/contrato";
import { EncabezadoDePagina } from "@/componentes/comunes/encabezado-de-pagina";
import { estiloBoton } from "@/componentes/ui/boton";
import { pedir, yo } from "@/lib/api";
import { fechaDelDia } from "@/lib/formato";
import { Cifras } from "./cifras";
import { PanelEquipo } from "./panel-equipo";
import { PanelNotas } from "./panel-notas";
import { PanelNuevo } from "./panel-nuevo";
import { PanelTrabado } from "./panel-trabado";

export const metadata: Metadata = { title: "Inicio" };

export default async function Pagina() {
  const [inicio, quien] = await Promise.all([pedir<InicioEquipo>("/v1/inicio"), yo()]);
  const nombre = quien.tipo === "usuario" ? quien.usuario.nombre.split(" ")[0] : null;
  const fecha = fechaDelDia(inicio.fecha);

  return (
    <div className="flex flex-col gap-4">
      <EncabezadoDePagina titulo={nombre ? `Hola, ${nombre}` : "Inicio"} subtitulo={fecha}>
        <Link href="/repartir" className={estiloBoton({ variante: "contorno" })}>
          Repartir
        </Link>
      </EncabezadoDePagina>

      <Cifras cifras={inicio.cifras} />

      <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-3">
        <PanelNuevo servicios={inicio.nuevo} total={inicio.cifras.nuevosSinRepartir} />
        <PanelTrabado trabado={inicio.trabado} hoy={inicio.fecha} />
        <div className="flex flex-col gap-3">
          <PanelEquipo carga={inicio.carga} />
          <PanelNotas notas={inicio.ultimasNotasConFoto} />
        </div>
      </div>
    </div>
  );
}
