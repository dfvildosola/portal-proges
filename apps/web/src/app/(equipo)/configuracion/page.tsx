// Configuración: lo que se toca poco. Los maestros los puede registrar todo el equipo; los accesos
// de las personas, los clientes y las llaves de la API son solo del administrador. Cada pestaña es
// una lista con sus botones.
import type { Metadata } from "next";
import type { ClientesLista, LlavesLista, MaestrosRespuesta, UsuariosLista } from "@proges/contrato";
import { EncabezadoDePagina } from "@/componentes/comunes/encabezado-de-pagina";
import { Vacio } from "@/componentes/comunes/vacio";
import { Pestana, PestanaPanel, Pestanas, PestanasLista } from "@/componentes/ui/pestanas";
import { pedir, yo } from "@/lib/api";
import { ClientesConfig } from "./clientes-config";
import { LlavesConfig } from "./llaves-config";
import { MaestrosConfig } from "./maestros-config";
import { UsuariosConfig } from "./usuarios-config";

export const metadata: Metadata = { title: "Configuración" };

export default async function Pagina() {
  const quien = await yo();
  // La API también lo exige (403), pero aquí se muestra solo lo que cada uno puede usar.
  if (quien.tipo !== "usuario") {
    return (
      <div className="flex flex-col gap-4">
        <EncabezadoDePagina titulo="Configuración" />
        <Vacio texto="Esta pantalla es solo para el equipo de Proges." />
      </div>
    );
  }

  // Quien no es administrador ve solo los maestros, que es lo que puede registrar.
  if (!quien.marcas.admin) {
    const maestros = await pedir<MaestrosRespuesta>("/v1/maestros");
    return (
      <div className="flex flex-col gap-4">
        <EncabezadoDePagina titulo="Configuración" subtitulo="Los maestros que hacen los trabajos de las obras." />
        <Pestanas defaultValue="maestros">
          <PestanasLista>
            <Pestana value="maestros">Maestros</Pestana>
          </PestanasLista>
          <PestanaPanel value="maestros">
            <MaestrosConfig maestros={maestros.items} />
          </PestanaPanel>
        </Pestanas>
      </div>
    );
  }

  const [usuarios, clientes, maestros, llaves] = await Promise.all([
    pedir<UsuariosLista>("/v1/usuarios"),
    pedir<ClientesLista>("/v1/clientes"),
    pedir<MaestrosRespuesta>("/v1/maestros"),
    pedir<LlavesLista>("/v1/llaves"),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <EncabezadoDePagina titulo="Configuración" subtitulo="Accesos, clientes, maestros y llaves de la API." />
      <Pestanas defaultValue="usuarios">
        <PestanasLista>
          <Pestana value="usuarios">Usuarios</Pestana>
          <Pestana value="clientes">Clientes</Pestana>
          <Pestana value="maestros">Maestros</Pestana>
          <Pestana value="llaves">Llaves de la API</Pestana>
        </PestanasLista>
        <PestanaPanel value="usuarios">
          <UsuariosConfig usuarios={usuarios.items} clientes={clientes.items} />
        </PestanaPanel>
        <PestanaPanel value="clientes">
          <ClientesConfig clientes={clientes.items} />
        </PestanaPanel>
        <PestanaPanel value="maestros">
          <MaestrosConfig maestros={maestros.items} />
        </PestanaPanel>
        <PestanaPanel value="llaves">
          <LlavesConfig llaves={llaves.items} clientes={clientes.items} />
        </PestanaPanel>
      </Pestanas>
    </div>
  );
}
