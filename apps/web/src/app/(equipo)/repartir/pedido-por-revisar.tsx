"use client";
// Un pedido de un cliente que el equipo todavía no revisa. Se acepta eligiendo el servicio del
// catálogo y quién lo lleva, o se rechaza dando el motivo (lo ve quien lo pidió). Si otra persona
// lo revisó antes, la API avisa y el mensaje aparece en el formulario.
import { useState } from "react";
import type { CatalogoServicio, EquipoPersona, PedidoEquipo } from "@proges/contrato";
import { CampoFormulario } from "@/componentes/comunes/campo-formulario";
import { ErrorDeFormulario } from "@/componentes/comunes/error-de-formulario";
import { Boton } from "@/componentes/ui/boton";
import { AreaTexto } from "@/componentes/ui/area-texto";
import { Dialogo, DialogoCerrar, DialogoContenido, DialogoDisparador, DialogoPie, DialogoTitulo } from "@/componentes/ui/dialogo";
import { Select } from "@/componentes/ui/select";
import { Tarjeta } from "@/componentes/ui/tarjeta";
import { ETIQUETA_TIPO_SERVICIO } from "@/lib/etiquetas";
import { diaChile, haceCuanto } from "@/lib/formato";
import { useFormulario } from "@/lib/usar-formulario";
import { aceptarPedido, rechazarPedido } from "./acciones";
import { OpcionesDePersonas } from "./opciones-de-personas";

function Rechazar({ pedido }: { pedido: PedidoEquipo }) {
  const [abierto, setAbierto] = useState(false);
  const { formProps, pendiente, errorGeneral, errorDe } = useFormulario(rechazarPedido, { alExito: () => setAbierto(false) });
  return (
    <Dialogo open={abierto} onOpenChange={setAbierto}>
      <DialogoDisparador render={<Boton variante="peligro" tamano="chico" />}>Rechazar</DialogoDisparador>
      <DialogoContenido>
        <DialogoTitulo>Rechazar el pedido</DialogoTitulo>
        <form {...formProps} className="flex flex-col gap-3">
          <input type="hidden" name="pedidoId" value={pedido.id} />
          <p className="text-sm text-soft">
            {pedido.propiedad.direccion} · {pedido.cliente.nombre}. El motivo lo ve quien hizo el pedido.
          </p>
          <CampoFormulario etiqueta="Por qué se rechaza" error={errorDe("motivo")}>
            <AreaTexto name="motivo" required />
          </CampoFormulario>
          <ErrorDeFormulario mensaje={errorGeneral} />
          <DialogoPie>
            <DialogoCerrar render={<Boton variante="contorno" />}>Cancelar</DialogoCerrar>
            <Boton type="submit" variante="peligro" disabled={pendiente}>
              {pendiente ? "Rechazando…" : "Rechazar pedido"}
            </Boton>
          </DialogoPie>
        </form>
      </DialogoContenido>
    </Dialogo>
  );
}

export function PedidoPorRevisar({
  pedido,
  catalogo,
  personas,
}: {
  pedido: PedidoEquipo;
  catalogo: CatalogoServicio[];
  personas: EquipoPersona[];
}) {
  const { formProps, pendiente, errorGeneral, errorDe } = useFormulario(aceptarPedido);
  // Solo los servicios del catálogo que se pueden ofrecer para el tipo que pidió el cliente.
  const opciones = catalogo.filter((s) => s.tipos.includes(pedido.tipo));
  return (
    <Tarjeta tono="item" className="gap-2.5 bg-card">
      <div className="flex flex-col gap-0.5">
        <span className="text-[13px] leading-snug font-bold">
          {ETIQUETA_TIPO_SERVICIO[pedido.tipo]} · {pedido.propiedad.direccion}
        </span>
        <span className="text-xs text-soft">
          {pedido.cliente.nombre} · pidió {pedido.pedidoPor.nombre} · {haceCuanto(diaChile(pedido.creadoEl))}
        </span>
      </div>
      <p className="text-[13px] whitespace-pre-line">{pedido.descripcion}</p>
      <form {...formProps} className="flex flex-col gap-2.5">
        <input type="hidden" name="pedidoId" value={pedido.id} />
        <CampoFormulario etiqueta="Servicio del catálogo" error={errorDe("servicioId")}>
          <Select name="servicioId" defaultValue="" required>
            <option value="" disabled>
              Elige el servicio…
            </option>
            {opciones.map((s) => (
              <option key={s.id} value={s.id}>
                {s.codigo} · {s.nombre}
              </option>
            ))}
          </Select>
        </CampoFormulario>
        <CampoFormulario etiqueta="Quién lo lleva" error={errorDe("responsableId")}>
          <Select name="responsableId" defaultValue="">
            <OpcionesDePersonas personas={personas} sinNadie="Sin responsable por ahora" />
          </Select>
        </CampoFormulario>
        <CampoFormulario etiqueta="Nota para quien lo lleva (opcional)" error={errorDe("nota")}>
          <AreaTexto name="nota" rows={2} />
        </CampoFormulario>
        <ErrorDeFormulario mensaje={errorGeneral} />
        <div className="flex flex-wrap items-center gap-2">
          <Boton type="submit" disabled={pendiente}>
            {pendiente ? "Aceptando…" : "Aceptar y repartir"}
          </Boton>
          <Rechazar pedido={pedido} />
        </div>
      </form>
    </Tarjeta>
  );
}
