"use client";
// Anotar una cuota de las contribuciones (el impuesto territorial: son cuatro al año) o corregir
// una ya anotada. El vencimiento lo calcula la API con el calendario del SII, y el monto siempre
// es en pesos. Al corregir también se puede marcar que ya se pagó.
import type { Contribucion } from "@proges/contrato";
import { CampoFormulario } from "@/componentes/comunes/campo-formulario";
import { DialogoFormulario } from "@/componentes/comunes/dialogo-formulario";
import { CampoTexto } from "@/componentes/ui/campo-texto";
import { Casilla } from "@/componentes/ui/casilla";
import { Select } from "@/componentes/ui/select";
import { cambiarContribucion, crearContribucion } from "./acciones";
import { CampoMonto } from "./campo-monto";

export function FormularioContribucion({
  cuota,
  propiedades = [],
  hoy,
}: {
  cuota?: Contribucion;
  propiedades?: { id: string; nombre: string }[];
  hoy: string;
}) {
  return (
    <DialogoFormulario
      boton={cuota ? "Editar" : "Anotar una cuota"}
      variante={cuota ? "fantasma" : "contorno"}
      titulo={cuota ? `Contribuciones ${cuota.anio}, cuota ${cuota.cuota}` : "Anotar una cuota de contribuciones"}
      descripcion={cuota ? undefined : "El vencimiento se calcula solo con el calendario del SII (abril, junio, septiembre y noviembre)."}
      accion={cuota ? cambiarContribucion : crearContribucion}
      textoDeEnvio={cuota ? "Guardar cambios" : "Anotar"}
      ocultos={cuota ? { id: cuota.id } : {}}
    >
      {(errorDe) => (
        <>
          {!cuota && (
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
              <CampoFormulario etiqueta="Año" error={errorDe("anio")}>
                <CampoTexto name="anio" type="number" min={2000} max={2100} defaultValue={hoy.slice(0, 4)} required />
              </CampoFormulario>
              <CampoFormulario etiqueta="Cuota" error={errorDe("cuota")}>
                <Select name="cuota" defaultValue="1">
                  <option value="1">1ª (abril)</option>
                  <option value="2">2ª (junio)</option>
                  <option value="3">3ª (septiembre)</option>
                  <option value="4">4ª (noviembre)</option>
                </Select>
              </CampoFormulario>
            </>
          )}
          <CampoMonto
            etiqueta="Monto (opcional)"
            nombre="monto"
            error={errorDe("monto")}
            valor={cuota?.monto?.valor}
            monedaFija
            ayuda="En pesos. Déjalo vacío si todavía no lo sabes."
          />
          {cuota && (
            <>
              <Casilla name="pagada" defaultChecked={cuota.estado === "PAGADA"}>
                Ya está pagada
              </Casilla>
              <CampoFormulario etiqueta="Día en que se pagó" error={errorDe("fechaPago")}>
                <CampoTexto name="fechaPago" type="date" defaultValue={cuota.fechaPago ?? hoy} />
              </CampoFormulario>
            </>
          )}
        </>
      )}
    </DialogoFormulario>
  );
}
