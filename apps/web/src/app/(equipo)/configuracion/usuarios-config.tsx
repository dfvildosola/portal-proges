// La pestaña «Usuarios»: el equipo de Proges y las personas de cada cliente. Se entra solo por
// invitación, así que dar acceso es crear a la persona con su correo.
import type { ClienteConfig, UsuarioConfig } from "@proges/contrato";
import { Fecha } from "@/componentes/comunes/fecha";
import { Seccion } from "@/componentes/comunes/seccion";
import { Vacio } from "@/componentes/comunes/vacio";
import { Insignia } from "@/componentes/ui/insignia";
import { DialogoDeFormulario } from "./dialogo-de-formulario";
import { FilaDeConfig } from "./fila-de-config";
import { FormularioUsuario } from "./formulario-usuario";

function FilaDeUsuario({ usuario, clientes }: { usuario: UsuarioConfig; clientes: ClienteConfig[] }) {
  return (
    <FilaDeConfig
      titulo={usuario.nombre}
      apagada={!usuario.activo}
      detalle={
        <>
          {usuario.correo}
          {usuario.clienteNombre && <> · {usuario.clienteNombre}</>}
          {usuario.haEntrado && usuario.ultimoIngreso && (
            <>
              {" "}
              · entró <Fecha valor={usuario.ultimoIngreso} formato="relativa" />
            </>
          )}
        </>
      }
      etiquetas={
        <>
          {usuario.admin && <Insignia tono="ink">Administrador</Insignia>}
          {usuario.jefatura && <Insignia tono="ink">Jefatura</Insignia>}
          {!usuario.haEntrado && <Insignia tono="warn">Invitado, aún no entra</Insignia>}
          {!usuario.activo && <Insignia tono="neutro">Desactivado</Insignia>}
        </>
      }
      acciones={
        <DialogoDeFormulario etiqueta="Editar" titulo={`Editar a ${usuario.nombre}`}>
          <FormularioUsuario usuario={usuario} clientes={clientes} />
        </DialogoDeFormulario>
      }
    />
  );
}

export function UsuariosConfig({ usuarios, clientes }: { usuarios: UsuarioConfig[]; clientes: ClienteConfig[] }) {
  const equipo = usuarios.filter((u) => u.rol === "EQUIPO");
  const deClientes = usuarios.filter((u) => u.rol === "CLIENTE");

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-soft">
        Se entra solo por invitación: da acceso a una persona con su correo y, cuando ingrese con él, queda enlazada. Nadie se borra: se desactiva y su historial queda.
      </p>
      <Seccion
        titulo={`Equipo de Proges (${equipo.length})`}
        derecha={
          <DialogoDeFormulario etiqueta="Dar acceso a una persona" titulo="Dar acceso a una persona" variante="principal">
            <FormularioUsuario clientes={clientes.filter((c) => c.activa)} />
          </DialogoDeFormulario>
        }
      >
        {equipo.length === 0 ? <Vacio texto="Todavía no hay nadie del equipo." /> : <ul className="flex flex-col gap-2">{equipo.map((u) => <FilaDeUsuario key={u.id} usuario={u} clientes={clientes} />)}</ul>}
      </Seccion>
      <Seccion titulo={`Personas de clientes (${deClientes.length})`}>
        {deClientes.length === 0 ? (
          <Vacio texto="Todavía no hay personas de clientes con acceso." />
        ) : (
          <ul className="flex flex-col gap-2">{deClientes.map((u) => <FilaDeUsuario key={u.id} usuario={u} clientes={clientes} />)}</ul>
        )}
      </Seccion>
    </div>
  );
}
