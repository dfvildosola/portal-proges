// Configuración: lo que se toca poco y solo lo hace el administrador: quién tiene acceso, los
// clientes, los maestros y las llaves de la API. Cada pestaña es una lista con sus botones.
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
  // La API también lo exige (403), pero aquí se explica en vez de mandar a otra pantalla.
  if (quien.tipo !== "usuario" || !quien.marcas.admin) {
    return (
      <div className="flex flex-col gap-4">
        <EncabezadoDePagina titulo="Configuración" />
        <Vacio texto="Configuración es solo para administradores. Pídele a un administrador lo que necesites cambiar." />
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
