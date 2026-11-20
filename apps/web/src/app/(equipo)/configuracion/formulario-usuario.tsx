"use client";
// El formulario de una persona con acceso, para crearla o para editarla. Se entra solo por
// invitación: crear el usuario con su correo basta, y cuando la persona ingresa con ese correo
// queda enlazada. Jefatura (cierra obras y mira Resultados) y administrador (configura todo esto)
// solo existen para el equipo de Proges; una persona de un cliente nunca los tiene.
import { useState } from "react";
import type { ClienteConfig, Rol, UsuarioConfig } from "@proges/contrato";
import { CampoFormulario } from "@/componentes/comunes/campo-formulario";
import { ErrorDeFormulario } from "@/componentes/comunes/error-de-formulario";
import { Boton } from "@/componentes/ui/boton";
import { CampoTexto } from "@/componentes/ui/campo-texto";
import { Casilla } from "@/componentes/ui/casilla";
import { Select } from "@/componentes/ui/select";
import { useFormulario } from "@/lib/usar-formulario";
import { cambiarUsuario, crearUsuario } from "./acciones";
import { useCerrarDialogo } from "./dialogo-de-formulario";

export function FormularioUsuario({ usuario, clientes }: { usuario?: UsuarioConfig; clientes: ClienteConfig[] }) {
  const cerrar = useCerrarDialogo();
  const { formProps, pendiente, errorGeneral, errorDe } = useFormulario(usuario ? cambiarUsuario : crearUsuario, { alExito: cerrar });
  const [rol, setRol] = useState<Rol>(usuario?.rol ?? "EQUIPO");

  return (
    <form {...formProps} className="flex flex-col gap-3">
      {usuario && <input type="hidden" name="id" value={usuario.id} />}
      {/* Al editar, el tipo de persona no cambia: solo viaja para que la acción sepa si mandar las marcas. */}
      {usuario && <input type="hidden" name="rol" value={usuario.rol} />}

      <CampoFormulario etiqueta="Nombre" error={errorDe("nombre")}>
        <CampoTexto name="nombre" defaultValue={usuario?.nombre} autoComplete="off" />
      </CampoFormulario>
      <CampoFormulario etiqueta="Correo" error={errorDe("correo")} ayuda="Con este correo entra al portal.">
        <CampoTexto name="correo" type="email" defaultValue={usuario?.correo} autoComplete="off" />
      </CampoFormulario>

      {!usuario && (
        <>
          <CampoFormulario etiqueta="Es parte de" error={errorDe("rol")}>
            <Select name="rol" value={rol} onChange={(e) => setRol(e.target.value as Rol)}>
              <option value="EQUIPO">El equipo de Proges</option>
              <option value="CLIENTE">Un cliente de Proges</option>
            </Select>
          </CampoFormulario>
          {rol === "CLIENTE" && (
            <CampoFormulario etiqueta="Cliente" error={errorDe("clienteId")}>
              <Select name="clienteId" defaultValue="">
                <option value="" disabled>
                  Elige un cliente
                </option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </Select>
            </CampoFormulario>
          )}
        </>
      )}
      {usuario?.clienteNombre && <p className="text-sm text-soft">Persona del cliente {usuario.clienteNombre}.</p>}

      {rol === "EQUIPO" && (
        <fieldset className="flex flex-col">
          <legend className="mb-1 text-[13px] font-bold">Permisos</legend>
          <Casilla name="jefatura" defaultChecked={usuario?.jefatura}>
            Jefatura: aprueba presupuestos de maestros, cierra obras y mira Resultados
          </Casilla>
          <Casilla name="admin" defaultChecked={usuario?.admin}>
            Administrador: crea clientes, usuarios y llaves
          </Casilla>
          {(errorDe("jefatura") || errorDe("admin")) && <p className="text-xs font-semibold text-bad">{errorDe("jefatura") ?? errorDe("admin")}</p>}
        </fieldset>
      )}

      {usuario && (
        <Casilla name="activo" defaultChecked={usuario.activo}>
          Activo (si lo desmarcas, no puede entrar; su historial queda)
        </Casilla>
      )}

      <ErrorDeFormulario mensaje={errorGeneral} />
      <Boton type="submit" disabled={pendiente}>
        {pendiente ? "Guardando…" : usuario ? "Guardar cambios" : "Dar acceso"}
      </Boton>
    </form>
  );
}
