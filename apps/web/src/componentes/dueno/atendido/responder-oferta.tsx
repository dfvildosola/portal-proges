"use client";
// Los tres botones con que el dueño responde una oferta: aceptar, contraofertar o rechazar. Cada
// uno abre un diálogo de la página (nunca el cuadro feo del navegador) que pide confirmar antes de
// enviar. Al enviar, el diálogo dice que se avisó al corredor; recién al cerrarlo la pantalla se
// actualiza.
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Monto } from "@proges/contrato";
import { CampoFormulario } from "@/componentes/comunes/campo-formulario";
import { ErrorDeFormulario } from "@/componentes/comunes/error-de-formulario";
import { Boton } from "@/componentes/ui/boton";
import { CampoTexto } from "@/componentes/ui/campo-texto";
import { Dialogo, DialogoCerrar, DialogoContenido, DialogoDescripcion, DialogoPie, DialogoTitulo } from "@/componentes/ui/dialogo";
import { formatearMonto } from "@/lib/formato";
import { useFormulario } from "@/lib/usar-formulario";
import { responderOferta } from "./acciones";

type Respuesta = "ACEPTA" | "CONTRAOFERTA" | "RECHAZA";

type Datos = { ofertaId: string; monto: Monto; palabra: "oferta" | "postulación" };

function textos(respuesta: Respuesta, { monto, palabra }: Pick<Datos, "monto" | "palabra">) {
  const de = formatearMonto(monto);
  if (respuesta === "ACEPTA") {
    return {
      titulo: `¿Aceptar la ${palabra} de ${de}?`,
      detalle: "Le avisamos a tu corredor para que se lo comunique a quien la hizo.",
      enviar: "Sí, aceptar",
    };
  }
  if (respuesta === "CONTRAOFERTA") {
    return {
      titulo: "¿Cuánto quieres pedir?",
      detalle: `Tu corredor le comunica tu contraoferta a quien hizo la ${palabra} de ${de}.`,
      enviar: "Enviar contraoferta",
    };
  }
  return {
    titulo: `¿Rechazar la ${palabra} de ${de}?`,
    detalle: "Le avisamos a tu corredor para que se lo comunique a quien la hizo. No se puede deshacer.",
    enviar: "Sí, rechazar",
  };
}

// El contenido vive en su propio componente para que cada vez que se abre el diálogo parta limpio:
// sin el monto ni el error de la vez anterior.
function Contenido({ respuesta, datos, alAvisar }: { respuesta: Respuesta; datos: Datos; alAvisar: () => void }) {
  const { formProps, pendiente, errorGeneral, errorDe, estado } = useFormulario(responderOferta, {
    alExito: alAvisar,
    vaciarAlExito: false,
  });
  const t = textos(respuesta, datos);

  if (estado?.ok) {
    return (
      <>
        <DialogoTitulo>Listo, avisamos a tu corredor</DialogoTitulo>
        <DialogoDescripcion>
          Él le comunica tu respuesta a quien hizo la {datos.palabra}. Si hay novedades, las verás aquí.
        </DialogoDescripcion>
        <DialogoPie>
          <DialogoCerrar render={<Boton />}>Cerrar</DialogoCerrar>
        </DialogoPie>
      </>
    );
  }

  return (
    <>
      <DialogoTitulo>{t.titulo}</DialogoTitulo>
      <DialogoDescripcion>{t.detalle}</DialogoDescripcion>
      <form {...formProps} className="flex flex-col gap-3">
        <input type="hidden" name="ofertaId" value={datos.ofertaId} />
        <input type="hidden" name="respuesta" value={respuesta} />
        <input type="hidden" name="moneda" value={datos.monto.moneda} />
        {respuesta === "CONTRAOFERTA" && (
          <CampoFormulario
            etiqueta={`Tu contraoferta, en ${datos.monto.moneda === "UF" ? "UF" : "pesos"}`}
            error={errorDe("monto")}
          >
            <CampoTexto name="monto" inputMode="decimal" placeholder={datos.monto.moneda === "UF" ? "14.900" : "150.000.000"} required autoFocus />
          </CampoFormulario>
        )}
        <ErrorDeFormulario mensaje={errorGeneral} />
        <DialogoPie>
          <DialogoCerrar render={<Boton variante="contorno" />}>Cancelar</DialogoCerrar>
          <Boton type="submit" variante={respuesta === "RECHAZA" ? "peligro" : "principal"} disabled={pendiente}>
            {pendiente ? "Enviando…" : t.enviar}
          </Boton>
        </DialogoPie>
      </form>
    </>
  );
}

export function ResponderOferta(datos: Datos) {
  const router = useRouter();
  const [respuesta, setRespuesta] = useState<Respuesta | null>(null);
  const [avisado, setAvisado] = useState(false);

  function alCambiar(abierto: boolean) {
    if (abierto) return;
    setRespuesta(null);
    // Ya se avisó: ahora sí se actualiza la pantalla (la oferta deja de estar «por responder»).
    if (avisado) {
      setAvisado(false);
      router.refresh();
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-2 pt-1">
        <Boton onClick={() => setRespuesta("ACEPTA")}>Aceptar</Boton>
        <Boton variante="contorno" onClick={() => setRespuesta("CONTRAOFERTA")}>
          Contraofertar
        </Boton>
        <Boton variante="peligro" onClick={() => setRespuesta("RECHAZA")}>
          Rechazar
        </Boton>
      </div>
      <Dialogo open={respuesta !== null} onOpenChange={alCambiar}>
        <DialogoContenido>
          {respuesta && <Contenido respuesta={respuesta} datos={datos} alAvisar={() => setAvisado(true)} />}
        </DialogoContenido>
      </Dialogo>
    </>
  );
}
