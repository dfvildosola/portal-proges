"use client";
// El botón «Ahora esperamos a…» y su ventana: se elige a quién espera Proges (conservador,
// notaría, municipalidad, maestro, dueño, banco u otro con detalle) o «Nos toca» si la pelota
// volvió a nuestro lado. Cada cambio fija el día de hoy como inicio y queda en el historial.
import type { Esperando, EsperandoA } from "@proges/contrato";
import { useState } from "react";
import { CampoFormulario } from "@/componentes/comunes/campo-formulario";
import { ErrorDeFormulario } from "@/componentes/comunes/error-de-formulario";
import { Boton } from "@/componentes/ui/boton";
import { CampoTexto } from "@/componentes/ui/campo-texto";
import {
  Dialogo,
  DialogoCerrar,
  DialogoContenido,
  DialogoDescripcion,
  DialogoDisparador,
  DialogoPie,
  DialogoTitulo,
} from "@/componentes/ui/dialogo";
import { Select } from "@/componentes/ui/select";
import { ETIQUETA_ESPERANDO_A } from "@/lib/etiquetas";
import { useFormulario } from "@/lib/usar-formulario";
import { cambiarEspera } from "@/app/(equipo)/servicios/[id]/acciones";

// `variante`: es el botón principal del aviso de arriba, salvo cuando ahí hay otro más importante
// (confirmar el servicio): entonces este pasa a ser el secundario. `compacto` y `texto` son para la
// tarjeta del tablero (botón más chico y con otro texto); la ventana es la misma.
export function CambiarEspera({
  servicioId,
  esperando,
  variante = "principal",
  compacto = false,
  texto = "Ahora esperamos a…",
}: {
  servicioId: string;
  esperando: Esperando | null;
  variante?: "principal" | "contorno";
  compacto?: boolean;
  texto?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  return (
    <Dialogo open={abierto} onOpenChange={setAbierto}>
      <DialogoDisparador render={<Boton variante={variante} tamano={compacto ? "chico" : "normal"} />}>{texto}</DialogoDisparador>
      <DialogoContenido>
        <DialogoTitulo>¿A quién esperamos?</DialogoTitulo>
        <DialogoDescripcion>
          Elige quién tiene la pelota ahora. Si ya no esperamos a nadie, elige «Nos toca». El cambio queda en el historial.
        </DialogoDescripcion>
        {/* El formulario se monta solo con el diálogo abierto: así siempre parte con la espera de hoy. */}
        <FormularioDeEspera servicioId={servicioId} esperando={esperando} alExito={() => setAbierto(false)} />
      </DialogoContenido>
    </Dialogo>
  );
}

function FormularioDeEspera({
  servicioId,
  esperando,
  alExito,
}: {
  servicioId: string;
  esperando: Esperando | null;
  alExito: () => void;
}) {
  const { formProps, pendiente, errorGeneral, errorDe } = useFormulario(cambiarEspera, { alExito, vaciarAlExito: false });
  const [eleccion, setEleccion] = useState<EsperandoA | "NOS_TOCA">(esperando?.a ?? "NOS_TOCA");
  return (
    <form {...formProps} className="flex flex-col gap-3">
      <input type="hidden" name="servicioId" value={servicioId} />
      <CampoFormulario etiqueta="Esperamos a" error={errorDe("esperandoA")}>
        <Select name="esperandoA" value={eleccion} onChange={(e) => setEleccion(e.target.value as EsperandoA | "NOS_TOCA")}>
          <option value="NOS_TOCA">Nadie: nos toca a nosotros</option>
          {(Object.keys(ETIQUETA_ESPERANDO_A) as EsperandoA[]).map((a) => (
            <option key={a} value={a}>
              {ETIQUETA_ESPERANDO_A[a]}
            </option>
          ))}
        </Select>
      </CampoFormulario>
      {eleccion !== "NOS_TOCA" && (
        <CampoFormulario
          etiqueta={eleccion === "OTRO" ? "¿A quién? (obligatorio)" : "Detalle (opcional)"}
          error={errorDe("esperandoDetalle")}
        >
          <CampoTexto
            name="esperandoDetalle"
            defaultValue={esperando?.a === eleccion ? (esperando.detalle ?? "") : ""}
            placeholder={eleccion === "OTRO" ? "Por ejemplo: la comunidad del edificio" : "Por ejemplo: Diseño y Espacios, para la cocina"}
            maxLength={300}
          />
        </CampoFormulario>
      )}
      <ErrorDeFormulario mensaje={errorGeneral} />
      <DialogoPie>
        <DialogoCerrar render={<Boton variante="contorno" />}>Cancelar</DialogoCerrar>
        <Boton type="submit" disabled={pendiente}>
          {pendiente ? "Guardando…" : "Guardar"}
        </Boton>
      </DialogoPie>
    </form>
  );
}
