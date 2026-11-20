"use client";
// Hacer un contrato de arriendo nuevo, o corregir uno que ya existe. Al corregir no se cambia la
// propiedad, el arrendatario ni el día en que empezó: eso es otro contrato. Para que se vaya el
// arrendatario existe «Terminar» (acciones-contrato.tsx), y para seguir un plazo más, «Renovar».
import { useState } from "react";
import type { Contrato } from "@proges/contrato";
import { CampoFormulario } from "@/componentes/comunes/campo-formulario";
import { DialogoFormulario } from "@/componentes/comunes/dialogo-formulario";
import { CampoTexto } from "@/componentes/ui/campo-texto";
import { Casilla } from "@/componentes/ui/casilla";
import { Select } from "@/componentes/ui/select";
import { cambiarContrato, crearContrato } from "./acciones";
import { CampoMonto } from "./campo-monto";
import { ETIQUETA_REAJUSTE } from "./etiquetas";

type Opcion = { id: string; nombre: string };

export function FormularioContrato({
  contrato,
  propiedades = [],
  arrendatarios = [],
  hoy,
}: {
  /** Si viene, se corrige ese contrato; si no, se hace uno nuevo. */
  contrato?: Contrato;
  propiedades?: Opcion[];
  arrendatarios?: Opcion[];
  /** «AAAA-MM-DD» de hoy en Chile: el día de inicio con que parte un contrato nuevo. */
  hoy: string;
}) {
  const [reajuste, setReajuste] = useState<string>(contrato?.reajusteTipo ?? "NINGUNO");
  const moneda = contrato?.monto.moneda ?? "CLP";

  return (
    <DialogoFormulario
      boton={contrato ? "Editar" : "Nuevo contrato"}
      variante={contrato ? "fantasma" : "principal"}
      titulo={contrato ? "Corregir contrato" : "Nuevo contrato de arriendo"}
      descripcion={contrato ? `${contrato.propiedadDireccion}, con ${contrato.arrendatarioNombre}.` : undefined}
      accion={contrato ? cambiarContrato : crearContrato}
      textoDeEnvio={contrato ? "Guardar cambios" : "Crear contrato"}
      ocultos={contrato ? { id: contrato.id } : {}}
    >
      {(errorDe) => (
        <>
          {!contrato && (
            <>
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
              <CampoFormulario etiqueta="Arrendatario" error={errorDe("arrendatarioId")}>
                <Select name="arrendatarioId" defaultValue="" required>
                  <option value="" disabled>
                    Elige un arrendatario
                  </option>
                  {arrendatarios.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nombre}
                    </option>
                  ))}
                </Select>
              </CampoFormulario>
              <CampoFormulario etiqueta="Desde cuándo arrienda" error={errorDe("fechaInicio")}>
                <CampoTexto name="fechaInicio" type="date" defaultValue={hoy} required />
              </CampoFormulario>
            </>
          )}

          <CampoMonto
            etiqueta="Arriendo mensual"
            nombre="monto"
            error={errorDe("monto")}
            valor={contrato?.monto.valor}
            moneda={moneda}
            obligatorio
          />
          <CampoFormulario etiqueta="Hasta cuándo dura" error={errorDe("fechaTermino")} ayuda="El término del primer plazo, como lo firmaron.">
            <CampoTexto name="fechaTermino" type="date" defaultValue={contrato?.fechaTermino} required />
          </CampoFormulario>
          <CampoFormulario etiqueta="Día del mes en que se paga" error={errorDe("diaPago")}>
            <CampoTexto name="diaPago" type="number" min={1} max={31} defaultValue={contrato?.diaPago ?? 5} required />
          </CampoFormulario>

          <CampoFormulario etiqueta="Cómo se reajusta el arriendo" error={errorDe("reajusteTipo")}>
            <Select name="reajusteTipo" value={reajuste} onChange={(e) => setReajuste(e.target.value)}>
              {Object.entries(ETIQUETA_REAJUSTE).map(([valor, texto]) => (
                <option key={valor} value={valor}>
                  {texto}
                </option>
              ))}
            </Select>
          </CampoFormulario>
          {reajuste !== "NINGUNO" && (
            <CampoFormulario etiqueta="Cada cuántos meses" error={errorDe("reajusteFrecuenciaMeses")}>
              <CampoTexto
                name="reajusteFrecuenciaMeses"
                type="number"
                min={1}
                defaultValue={contrato?.reajusteFrecuenciaMeses ?? 12}
                required
              />
            </CampoFormulario>
          )}

          <Casilla name="renovacionAutomatica" defaultChecked={contrato?.renovacionAutomatica ?? true}>
            Se renueva sola por el mismo plazo, salvo que alguien avise
          </Casilla>
          <CampoFormulario etiqueta="Días de aviso antes del término" error={errorDe("diasAviso")} ayuda="Con cuántos días de anticipación hay que avisar que no se renueva.">
            <CampoTexto name="diasAviso" type="number" min={0} defaultValue={contrato?.diasAviso ?? 60} required />
          </CampoFormulario>
          <CampoMonto
            etiqueta="Garantía (opcional)"
            nombre="garantia"
            error={errorDe("garantia")}
            valor={contrato?.garantia?.valor}
            moneda={contrato?.garantia?.moneda ?? moneda}
            ayuda="En la misma moneda del arriendo."
          />
        </>
      )}
    </DialogoFormulario>
  );
}
