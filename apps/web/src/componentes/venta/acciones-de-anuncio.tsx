"use client";
// Lo que el equipo puede hacer con un anuncio: anotar las cifras de una semana (copiadas de
// Nexxos o del portal donde está publicado) y pausarlo, reactivarlo o bajarlo. El menú cambia el
// estado sin borrar la historia: borrar un anuncio se llevaría también sus cifras.
import type { VentaAnuncioEstado } from "@proges/contrato";
import { Ellipsis } from "lucide-react";
import { useState, useTransition } from "react";
import { CampoFormulario } from "@/componentes/comunes/campo-formulario";
import { Boton } from "@/componentes/ui/boton";
import { CampoTexto } from "@/componentes/ui/campo-texto";
import { Menu, MenuContenido, MenuDisparador, MenuItem } from "@/componentes/ui/menu";
import { Select } from "@/componentes/ui/select";
import { fechaCorta } from "@/lib/formato";
import { anotarCifras, cambiarEstadoDeAnuncio } from "./acciones";
import { DialogoFormulario } from "@/componentes/comunes/dialogo-formulario";

export function AccionesDeAnuncio({
  servicioId,
  anuncioId,
  portal,
  estado,
  lunes,
  semanasAnotadas,
}: {
  servicioId: string;
  anuncioId: string;
  portal: string;
  estado: VentaAnuncioEstado;
  /** Los últimos lunes, del más nuevo al más antiguo. */
  lunes: string[];
  /** Los lunes de este anuncio que ya tienen cifras (se avisa para que se corrijan, no se dupliquen). */
  semanasAnotadas: string[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [pendiente, empezar] = useTransition();

  function cambiarEstado(nuevo: VentaAnuncioEstado) {
    setError(null);
    empezar(async () => {
      const resultado = await cambiarEstadoDeAnuncio(servicioId, anuncioId, nuevo);
      if (!resultado.ok) setError(resultado.error);
    });
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      {error && (
        <span role="alert" className="text-xs font-semibold text-bad">
          {error}
        </span>
      )}
      <DialogoFormulario
        boton="Anotar semana"
        titulo={`Cifras de ${portal}`}
        descripcion="Copia las vistas y las consultas que muestra el portal. Si la semana ya estaba anotada, se corrige; lo que dejes vacío queda como estaba."
        accion={anotarCifras}
        textoDeEnvio="Guardar cifras"
        ocultos={{ servicioId, anuncioId }}
      >
        {(errorDe) => (
          <>
            <CampoFormulario etiqueta="Semana (empieza el lunes)" error={errorDe("semana")}>
              <Select name="semana" defaultValue={lunes[1] ?? lunes[0]}>
                {lunes.map((l) => (
                  <option key={l} value={l}>
                    {`Lunes ${fechaCorta(l)}${semanasAnotadas.includes(l) ? " (ya anotada)" : ""}`}
                  </option>
                ))}
              </Select>
            </CampoFormulario>
            <div className="grid grid-cols-2 gap-2">
              <CampoFormulario etiqueta="Vistas" error={errorDe("vistas")}>
                <CampoTexto name="vistas" inputMode="numeric" placeholder="0" />
              </CampoFormulario>
              <CampoFormulario etiqueta="Consultas" error={errorDe("consultas")}>
                <CampoTexto name="consultas" inputMode="numeric" placeholder="0" />
              </CampoFormulario>
            </div>
          </>
        )}
      </DialogoFormulario>
      <Menu>
        <MenuDisparador
          render={<Boton variante="fantasma" tamano="chico" aria-label={`Más acciones de ${portal}`} disabled={pendiente} />}
        >
          <Ellipsis />
        </MenuDisparador>
        <MenuContenido>
          {estado !== "ACTIVO" && <MenuItem onClick={() => cambiarEstado("ACTIVO")}>Reactivar</MenuItem>}
          {estado === "ACTIVO" && <MenuItem onClick={() => cambiarEstado("PAUSADO")}>Pausar</MenuItem>}
          {estado !== "BAJADO" && <MenuItem onClick={() => cambiarEstado("BAJADO")}>Bajar el anuncio</MenuItem>}
        </MenuContenido>
      </Menu>
    </div>
  );
}
