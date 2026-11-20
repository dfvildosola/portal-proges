"use client";
// Crear una llave de la API: elige de qué cliente es y para qué sirve. Cuando sale bien, el
// formulario se reemplaza por la llave completa (`LlaveCreada`). Aquí no se usa `useFormulario`
// porque la acción devuelve, además del «salió bien», la llave misma.
import { startTransition, useActionState, type FormEvent } from "react";
import type { ClienteConfig } from "@proges/contrato";
import { CampoFormulario } from "@/componentes/comunes/campo-formulario";
import { ErrorDeFormulario } from "@/componentes/comunes/error-de-formulario";
import { Boton } from "@/componentes/ui/boton";
import { CampoTexto } from "@/componentes/ui/campo-texto";
import { Select } from "@/componentes/ui/select";
import { crearLlave } from "./acciones";
import { LlaveCreada } from "./llave-creada";

export function FormularioLlaveNueva({ clientes }: { clientes: ClienteConfig[] }) {
  const [estado, enviar, pendiente] = useActionState(crearLlave, null);

  if (estado?.ok) return <LlaveCreada llave={estado.llave} />;

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const datos = new FormData(evento.currentTarget);
    startTransition(() => enviar(datos));
  }
  const error = estado && !estado.ok ? estado : null;

  return (
    <form onSubmit={alEnviar} className="flex flex-col gap-3">
      <CampoFormulario etiqueta="Cliente" error={error?.campos.clienteId}>
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
      <CampoFormulario etiqueta="Para qué es" error={error?.campos.nombre} ayuda="Por ejemplo: «Sistema de NPL». Ayuda a reconocerla después.">
        <CampoTexto name="nombre" autoComplete="off" />
      </CampoFormulario>
      <ErrorDeFormulario mensaje={error?.error ?? null} />
      <Boton type="submit" disabled={pendiente}>
        {pendiente ? "Creando…" : "Crear llave"}
      </Boton>
    </form>
  );
}
