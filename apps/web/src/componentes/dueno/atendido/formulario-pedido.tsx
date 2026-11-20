"use client";
// El formulario para pedirle un servicio a Proges: qué propiedad (una que ya tiene o una nueva),
// qué necesita y una descripción. Después de enviar dice «Proges lo revisa y te avisa».
import { useState } from "react";
import type { ServicioTipo } from "@proges/contrato";
import { CampoFormulario } from "@/componentes/comunes/campo-formulario";
import { ErrorDeFormulario } from "@/componentes/comunes/error-de-formulario";
import { ETIQUETA_TIPO_PROPIEDAD } from "@/componentes/ficha/etiquetas-ficha";
import { AreaTexto } from "@/componentes/ui/area-texto";
import { Boton } from "@/componentes/ui/boton";
import { CampoTexto } from "@/componentes/ui/campo-texto";
import { Select } from "@/componentes/ui/select";
import { Tarjeta } from "@/componentes/ui/tarjeta";
import { useFormulario } from "@/lib/usar-formulario";
import { pedirServicio } from "./acciones";
import { SERVICIOS_QUE_SE_PUEDEN_PEDIR } from "./etiquetas-atendido";

export type PropiedadParaElegir = { id: string; direccion: string; comuna: string };

const NUEVA = "nueva";

export function FormularioPedido({
  propiedades,
  propiedadInicial,
  tipoInicial,
}: {
  propiedades: PropiedadParaElegir[];
  /** Llega por la dirección (?propiedad=): la ficha de una propiedad y los vencimientos la usan. */
  propiedadInicial?: string;
  tipoInicial?: ServicioTipo;
}) {
  // Sin propiedades todavía, lo único posible es pedir para una nueva.
  const [propiedad, setPropiedad] = useState(propiedadInicial ?? (propiedades.length === 0 ? NUEVA : ""));
  const [tipo, setTipo] = useState<ServicioTipo | "">(tipoInicial ?? "");
  const [enviado, setEnviado] = useState(false);
  const { formProps, pendiente, errorGeneral, errorDe } = useFormulario(pedirServicio, { alExito: () => setEnviado(true) });
  const ayuda = SERVICIOS_QUE_SE_PUEDEN_PEDIR.find((s) => s.tipo === tipo)?.ayuda;

  if (enviado) {
    return (
      <Tarjeta className="max-w-xl gap-3 p-5">
        <h2 className="text-lg font-extrabold">Listo, recibimos tu pedido</h2>
        <p className="text-sm">Proges lo revisa y te avisa. Lo verás abajo, en «Tus pedidos», y en tu inicio cuando lo tomemos.</p>
        <Boton
          variante="contorno"
          className="self-start"
          onClick={() => {
            setEnviado(false);
            setTipo("");
            setPropiedad(propiedades.length === 0 ? NUEVA : "");
          }}
        >
          Hacer otro pedido
        </Boton>
      </Tarjeta>
    );
  }

  return (
    <Tarjeta className="max-w-xl p-5">
      <form {...formProps} className="flex flex-col gap-4">
        <CampoFormulario etiqueta="¿Para qué propiedad?" error={errorDe("propiedadId")}>
          <Select name="propiedad" value={propiedad} onChange={(e) => setPropiedad(e.target.value)} required>
            <option value="" disabled>
              Elige una propiedad…
            </option>
            {propiedades.map((p) => (
              <option key={p.id} value={p.id}>
                {p.direccion}, {p.comuna}
              </option>
            ))}
            <option value={NUEVA}>Otra propiedad (nueva)…</option>
          </Select>
        </CampoFormulario>

        {propiedad === NUEVA && (
          <div className="flex flex-col gap-3 rounded-xl bg-scr p-3">
            <CampoFormulario etiqueta="Dirección" error={errorDe("propiedadNueva.direccion")}>
              <CampoTexto name="direccion" placeholder="Agustinas 715, oficina 706" required />
            </CampoFormulario>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <CampoFormulario etiqueta="Comuna" error={errorDe("propiedadNueva.comuna")}>
                <CampoTexto name="comuna" required />
              </CampoFormulario>
              <CampoFormulario etiqueta="Qué es" error={errorDe("propiedadNueva.tipo")}>
                <Select name="tipoPropiedad" defaultValue="DEPARTAMENTO">
                  {Object.entries(ETIQUETA_TIPO_PROPIEDAD).map(([clave, nombre]) => (
                    <option key={clave} value={clave}>
                      {nombre}
                    </option>
                  ))}
                </Select>
              </CampoFormulario>
            </div>
          </div>
        )}

        <CampoFormulario etiqueta="¿Qué necesitas?" ayuda={ayuda} error={errorDe("tipo")}>
          <Select name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value as ServicioTipo)} required>
            <option value="" disabled>
              Elige un servicio…
            </option>
            {SERVICIOS_QUE_SE_PUEDEN_PEDIR.map((s) => (
              <option key={s.tipo} value={s.tipo}>
                {s.nombre}
              </option>
            ))}
          </Select>
        </CampoFormulario>

        <CampoFormulario etiqueta="Cuéntanos qué necesitas" ayuda="Entre más detalle, más rápido lo organizamos." error={errorDe("descripcion")}>
          <AreaTexto name="descripcion" rows={5} placeholder="Por ejemplo: hay una filtración en el baño y queremos renovar la cocina." required />
        </CampoFormulario>

        <ErrorDeFormulario mensaje={errorGeneral} />
        <Boton type="submit" disabled={pendiente} className="self-start">
          {pendiente ? "Enviando…" : "Enviar pedido"}
        </Boton>
      </form>
    </Tarjeta>
  );
}
