"use client";
// Agregar un maestro. Un maestro no se inventa aquí: es un proveedor que Odoo ya tiene. Se busca
// por nombre, se elige el correcto (el RUT y las facturas ayudan a reconocerlo) y se le agrega lo
// que Odoo no sabe: su especialidad.
import { Search } from "lucide-react";
import { useState, useTransition } from "react";
import type { ProveedorOdoo } from "@proges/contrato";
import { CampoFormulario } from "@/componentes/comunes/campo-formulario";
import { ErrorDeFormulario } from "@/componentes/comunes/error-de-formulario";
import { Boton } from "@/componentes/ui/boton";
import { CampoTexto } from "@/componentes/ui/campo-texto";
import { Insignia } from "@/componentes/ui/insignia";
import { useFormulario } from "@/lib/usar-formulario";
import { cn } from "@/lib/utils";
import { agregarMaestro, buscarProveedores } from "./acciones";
import { useCerrarDialogo } from "./dialogo-de-formulario";

export function FormularioMaestroNuevo() {
  const cerrar = useCerrarDialogo();
  const { formProps, pendiente, errorGeneral, errorDe } = useFormulario(agregarMaestro, { alExito: cerrar });
  const [texto, setTexto] = useState("");
  const [resultados, setResultados] = useState<ProveedorOdoo[] | null>(null);
  const [errorDeBusqueda, setErrorDeBusqueda] = useState<string | null>(null);
  const [elegido, setElegido] = useState<ProveedorOdoo | null>(null);
  const [buscando, empezarBusqueda] = useTransition();

  function buscar() {
    setErrorDeBusqueda(null);
    setElegido(null);
    empezarBusqueda(async () => {
      const respuesta = await buscarProveedores(texto);
      if (respuesta.ok) setResultados(respuesta.items);
      else {
        setResultados(null);
        setErrorDeBusqueda(respuesta.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {/* La búsqueda no es parte del formulario: el Enter busca, no agrega. */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-bold">Buscar el proveedor en Odoo</span>
        <div className="flex gap-2">
          <CampoTexto
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                buscar();
              }
            }}
            placeholder="Parte del nombre"
            aria-label="Nombre del proveedor"
            autoComplete="off"
          />
          <Boton variante="contorno" onClick={buscar} disabled={buscando || texto.trim().length < 2}>
            <Search /> {buscando ? "Buscando…" : "Buscar"}
          </Boton>
        </div>
        {errorDeBusqueda && (
          <p role="alert" className="text-xs font-semibold text-bad">
            {errorDeBusqueda}
          </p>
        )}
      </div>

      {resultados && resultados.length === 0 && <p className="text-sm text-soft">Odoo no tiene proveedores con ese nombre.</p>}
      {resultados && resultados.length > 0 && (
        <ul className="flex max-h-56 flex-col gap-1.5 overflow-y-auto" aria-label="Proveedores encontrados">
          {resultados.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                disabled={p.yaAgregado}
                onClick={() => setElegido(p)}
                aria-pressed={elegido?.id === p.id}
                className={cn(
                  "flex min-h-11 w-full cursor-pointer flex-col items-start gap-0.5 rounded-[10px] border border-line bg-scr px-3 py-2 text-left disabled:cursor-not-allowed disabled:opacity-50",
                  elegido?.id === p.id && "border-ink bg-ink-soft",
                )}
              >
                <span className="text-[13px] font-bold">{p.nombre}</span>
                <span className="text-xs text-soft">
                  {p.rut ?? "Sin RUT"} · {p.facturas} {p.facturas === 1 ? "factura" : "facturas"}
                </span>
                {p.yaAgregado && <Insignia tono="neutro">Ya es maestro</Insignia>}
              </button>
            </li>
          ))}
        </ul>
      )}

      <form {...formProps} className="flex flex-col gap-3">
        <input type="hidden" name="odooPartnerId" value={elegido?.id ?? ""} />
        <p className="text-sm">{elegido ? <>Agregarás a <b>{elegido.nombre}</b>.</> : <span className="text-soft">Elige un proveedor de la lista.</span>}</p>
        <CampoFormulario etiqueta="Especialidad" error={errorDe("especialidad")} ayuda="Lo que hace: gasfíter, electricista, pintor…">
          <CampoTexto name="especialidad" autoComplete="off" />
        </CampoFormulario>
        <CampoFormulario etiqueta="Teléfono" error={errorDe("telefono")} ayuda="Si lo dejas vacío, se usa el que tiene Odoo.">
          <CampoTexto name="telefono" type="tel" defaultValue={elegido?.telefono ?? ""} key={elegido?.id ?? "ninguno"} autoComplete="off" />
        </CampoFormulario>
        <ErrorDeFormulario mensaje={errorGeneral ?? errorDe("odooPartnerId") ?? null} />
        <Boton type="submit" disabled={pendiente || !elegido}>
          {pendiente ? "Agregando…" : "Agregar maestro"}
        </Boton>
      </form>
    </div>
  );
}
