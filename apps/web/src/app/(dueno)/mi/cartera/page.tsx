// La cartera del dueño autónomo: sus arriendos (contratos, arrendatarios y cobros), sus gastos y
// contribuciones, y los documentos de sus propiedades. Cada pestaña pide sus datos a la API desde
// el servidor y guarda con formularios (componentes/dueno/autonomo).
import { redirect } from "next/navigation";
import { EncabezadoDePagina } from "@/componentes/comunes/encabezado-de-pagina";
import { Arriendos } from "@/componentes/dueno/autonomo/arriendos";
import { Documentos } from "@/componentes/dueno/autonomo/documentos";
import { Gastos } from "@/componentes/dueno/autonomo/gastos";
import { Pestana, PestanaPanel, Pestanas, PestanasLista } from "@/componentes/ui/pestanas";
import { yo } from "@/lib/api";
import { hoyChile } from "@/lib/formato";

export const metadata = { title: "Cartera" };

const SECCIONES = ["arriendos", "gastos", "documentos"] as const;

export default async function Cartera({ searchParams }: { searchParams: Promise<{ seccion?: string }> }) {
  const quien = await yo();
  // La cartera es del dueño que la lleva solo; el cliente atendido no la tiene en su menú.
  if (quien.cliente?.modo !== "AUTONOMO") redirect("/mi");

  const { seccion } = await searchParams;
  const abierta = SECCIONES.find((s) => s === seccion) ?? "arriendos";
  const hoy = hoyChile();

  return (
    <div className="flex flex-col gap-4">
      <EncabezadoDePagina titulo="Cartera" subtitulo="Tus arriendos, cuentas, contribuciones y documentos, al día." />
      <Pestanas defaultValue={abierta}>
        <PestanasLista>
          <Pestana value="arriendos">Arriendos</Pestana>
          <Pestana value="gastos">Gastos y contribuciones</Pestana>
          <Pestana value="documentos">Documentos</Pestana>
        </PestanasLista>
        <PestanaPanel value="arriendos">
          <Arriendos hoy={hoy} />
        </PestanaPanel>
        <PestanaPanel value="gastos">
          <Gastos hoy={hoy} />
        </PestanaPanel>
        <PestanaPanel value="documentos">
          <Documentos />
        </PestanaPanel>
      </Pestanas>
    </div>
  );
}
