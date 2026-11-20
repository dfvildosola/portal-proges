"use client";
// Anotar una cuenta de una propiedad (gasto común, luz, agua, gas…) o corregir una ya anotada. El
// monto es opcional: a veces la cuenta se anota antes de saber cuánto llegó. Al corregir también se
// puede marcar que ya se pagó.
import type { Gasto } from "@proges/contrato";
import { CampoFormulario } from "@/componentes/comunes/campo-formulario";
import { DialogoFormulario } from "@/componentes/comunes/dialogo-formulario";
import { AreaTexto } from "@/componentes/ui/area-texto";
import { CampoTexto } from "@/componentes/ui/campo-texto";
import { Casilla } from "@/componentes/ui/casilla";
import { Select } from "@/componentes/ui/select";
import { cambiarGasto, crearGasto } from "./acciones";
import { CampoMonto } from "./campo-monto";
import { ETIQUETA_CUENTA } from "./etiquetas";

export function FormularioGasto({
  gasto,
  propiedades = [],
  hoy,
}: {
  gasto?: Gasto;
  propiedades?: { id: string; nombre: string }[];
  hoy: string;
}) {
  return (
    <DialogoFormulario
      boton={gasto ? "Editar" : "Anotar una cuenta"}
      variante={gasto ? "fantasma" : "principal"}
      titulo={gasto ? "Corregir cuenta" : "Anotar una cuenta"}
      descripcion="Gasto común, luz, agua, gas u otra cuenta que pagas por una propiedad."
      accion={gasto ? cambiarGasto : crearGasto}
      textoDeEnvio={gasto ? "Guardar cambios" : "Anotar"}
      ocultos={gasto ? { id: gasto.id } : {}}
    >
      {(errorDe) => (
        <>
          {!gasto && (
            <CampoFormulario etiqueta="Propiedad" error={errorDe("propiedadId")}>
              <Select name="propiedadId" defaultValue="" required>
                <option value="" disabled>
                  Elige una propiedad
                </option>
                {propiedades.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </Select>
            </CampoFormulario>
          )}
          <CampoFormulario etiqueta="Qué cuenta es" error={errorDe("tipo")}>
            <Select name="tipo" defaultValue={gasto?.tipo ?? "GASTO_COMUN"}>
              {Object.entries(ETIQUETA_CUENTA).map(([valor, texto]) => (
                <option key={valor} value={valor}>
                  {texto}
                </option>
              ))}
            </Select>
          </CampoFormulario>
          <CampoFormulario etiqueta="De qué mes es" error={errorDe("periodo")} ayuda="Si tu teléfono no muestra un selector, escribe AAAA-MM (por ejemplo 2026-11).">
            <CampoTexto name="periodo" type="month" defaultValue={gasto?.periodo ?? hoy.slice(0, 7)} placeholder="AAAA-MM" required />
          </CampoFormulario>
          <CampoMonto
            etiqueta="Monto (opcional)"
            nombre="monto"
            error={errorDe("monto")}
            valor={gasto?.monto?.valor}
            moneda={gasto?.monto?.moneda}
            ayuda="Déjalo vacío si todavía no sabes cuánto es."
          />
          <CampoFormulario etiqueta="Vence el" error={errorDe("fechaVencimiento")}>
            <CampoTexto name="fechaVencimiento" type="date" defaultValue={gasto?.fechaVencimiento} required />
          </CampoFormulario>
          <CampoFormulario etiqueta="Nota (opcional)" error={errorDe("notas")}>
            <AreaTexto name="notas" rows={2} defaultValue={gasto?.notas ?? ""} />
          </CampoFormulario>
          {gasto && (
            <>
              <Casilla name="pagada" defaultChecked={gasto.estado === "PAGADA"}>
                Ya está pagada
              </Casilla>
              <CampoFormulario etiqueta="Día en que se pagó" error={errorDe("fechaPago")}>
                <CampoTexto name="fechaPago" type="date" defaultValue={gasto.fechaPago ?? hoy} />
              </CampoFormulario>
            </>
          )}
        </>
      )}
    </DialogoFormulario>
  );
}
