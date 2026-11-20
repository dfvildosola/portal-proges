"use client";
// Los formularios del equipo para el corretaje: cambiar el precio, anotar un anuncio, una visita y
// una oferta. Cada uno es un botón que abre un diálogo (DialogoFormulario).
import { CampoFormulario } from "@/componentes/comunes/campo-formulario";
import { AreaTexto } from "@/componentes/ui/area-texto";
import { CampoTexto } from "@/componentes/ui/campo-texto";
import { Select } from "@/componentes/ui/select";
import { anotarVisita, cambiarPrecio, crearAnuncio, registrarOferta } from "./acciones";
import { CampoMonto } from "./campo-monto";
import { DialogoFormulario } from "@/componentes/comunes/dialogo-formulario";

type Moneda = "CLP" | "UF";

export function FormularioPrecio({
  servicioId,
  monedaPorDefecto,
  hayPrecio,
}: {
  servicioId: string;
  monedaPorDefecto: Moneda;
  /** Si ya hay un precio publicado, hay que contar por qué cambia. */
  hayPrecio: boolean;
}) {
  return (
    <DialogoFormulario
      boton={hayPrecio ? "Cambiar precio" : "Fijar precio"}
      titulo={hayPrecio ? "Cambiar el precio publicado" : "Fijar el precio publicado"}
      descripcion={hayPrecio ? "Queda anotado en la historia del precio, con el motivo, para explicárselo al propietario." : undefined}
      accion={cambiarPrecio}
      textoDeEnvio="Guardar precio"
      ocultos={{ servicioId }}
    >
      {(errorDe) => (
        <>
          <CampoMonto etiqueta="Nuevo precio" nombre="monto" monedaPorDefecto={monedaPorDefecto} error={errorDe("monto")} />
          <CampoFormulario etiqueta="Quién lo fijó" error={errorDe("origen")}>
            <Select name="origen" defaultValue="PROPIETARIO">
              <option value="PROPIETARIO">El propietario</option>
              <option value="SUGERIDO_PROGES">Lo sugirió Proges</option>
            </Select>
          </CampoFormulario>
          <CampoFormulario etiqueta={hayPrecio ? "Por qué cambia" : "Nota (opcional)"} error={errorDe("motivo")}>
            <AreaTexto name="motivo" rows={2} required={hayPrecio} placeholder="Ej.: pocas visitas, el precio es la objeción más repetida" />
          </CampoFormulario>
        </>
      )}
    </DialogoFormulario>
  );
}

export function FormularioAnuncio({ servicioId, hoy }: { servicioId: string; hoy: string }) {
  return (
    <DialogoFormulario
      boton="Anotar anuncio"
      titulo="Anotar un anuncio"
      descripcion="Dónde está publicada la propiedad."
      accion={crearAnuncio}
      textoDeEnvio="Guardar anuncio"
      ocultos={{ servicioId }}
    >
      {(errorDe) => (
        <>
          <CampoFormulario etiqueta="Portal" error={errorDe("portal")}>
            <CampoTexto name="portal" placeholder="Portal Inmobiliario, Nexxos, letrero…" required />
          </CampoFormulario>
          <CampoFormulario etiqueta="Enlace (opcional)" error={errorDe("url")}>
            <CampoTexto name="url" type="url" inputMode="url" placeholder="https://" />
          </CampoFormulario>
          <CampoFormulario etiqueta="Publicado desde" error={errorDe("desde")}>
            <CampoTexto name="desde" type="date" defaultValue={hoy} max={hoy} required />
          </CampoFormulario>
        </>
      )}
    </DialogoFormulario>
  );
}

export function FormularioVisita({
  servicioId,
  hoy,
  equipo,
  yoId,
}: {
  servicioId: string;
  hoy: string;
  /** Las personas del equipo para elegir quién mostró; null si no se pudo cargar la lista. */
  equipo: { id: string; nombre: string }[] | null;
  yoId: string | null;
}) {
  return (
    <DialogoFormulario
      boton="Anotar visita"
      titulo="Anotar una visita"
      descripcion="Los datos del interesado los ve solo el equipo: el dueño ve la fecha, la evaluación y el comentario."
      accion={anotarVisita}
      textoDeEnvio="Guardar visita"
      ocultos={{ servicioId }}
    >
      {(errorDe) => (
        <>
          <CampoFormulario etiqueta="Fecha" error={errorDe("fecha")}>
            <CampoTexto name="fecha" type="date" defaultValue={hoy} max={hoy} required />
          </CampoFormulario>
          {equipo && (
            <CampoFormulario etiqueta="Quién mostró" error={errorDe("realizadaPorId")}>
              <Select name="realizadaPorId" defaultValue={yoId ?? ""}>
                {equipo.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </Select>
            </CampoFormulario>
          )}
          <CampoFormulario etiqueta="Interesado" error={errorDe("interesadoNombre")}>
            <CampoTexto name="interesadoNombre" placeholder="Nombre" autoComplete="off" />
          </CampoFormulario>
          <CampoFormulario etiqueta="Contacto" error={errorDe("interesadoContacto")}>
            <CampoTexto name="interesadoContacto" placeholder="Teléfono o correo" autoComplete="off" />
          </CampoFormulario>
          <CampoFormulario etiqueta="Interés del visitante" error={errorDe("evaluacion")}>
            <Select name="evaluacion" defaultValue="">
              <option value="">Sin evaluar</option>
              <option value="5">5 · muy interesado</option>
              <option value="4">4</option>
              <option value="3">3</option>
              <option value="2">2</option>
              <option value="1">1 · poco interesado</option>
            </Select>
          </CampoFormulario>
          <CampoFormulario etiqueta="Comentario" error={errorDe("comentario")}>
            <AreaTexto name="comentario" rows={3} placeholder="Qué le gustó, qué objetó" />
          </CampoFormulario>
        </>
      )}
    </DialogoFormulario>
  );
}

export function FormularioOferta({
  servicioId,
  hoy,
  monedaPorDefecto,
  textoDelBoton,
}: {
  servicioId: string;
  hoy: string;
  monedaPorDefecto: Moneda;
  /** «Registrar oferta» en una venta, «Registrar postulación» en una búsqueda de arriendo. */
  textoDelBoton: string;
}) {
  return (
    <DialogoFormulario
      boton={textoDelBoton}
      titulo={textoDelBoton}
      descripcion="Queda guardada solo para el equipo hasta que se la muestres al dueño."
      accion={registrarOferta}
      textoDeEnvio="Guardar"
      ocultos={{ servicioId }}
    >
      {(errorDe) => (
        <>
          <CampoMonto etiqueta="Monto" nombre="monto" monedaPorDefecto={monedaPorDefecto} error={errorDe("monto")} />
          <CampoFormulario etiqueta="Quién ofertó" error={errorDe("oferente")}>
            <CampoTexto name="oferente" autoComplete="off" required />
          </CampoFormulario>
          <CampoFormulario etiqueta="Fecha en que llegó" error={errorDe("fecha")}>
            <CampoTexto name="fecha" type="date" defaultValue={hoy} max={hoy} />
          </CampoFormulario>
          <CampoFormulario etiqueta="Condiciones (opcional)" error={errorDe("nota")}>
            <AreaTexto name="nota" rows={3} placeholder="Ej.: crédito preaprobado 80 %, contado…" />
          </CampoFormulario>
        </>
      )}
    </DialogoFormulario>
  );
}
