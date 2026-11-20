"use client";
// Los dos pasos de Anotar.
//   Paso 1, «Qué anotar»: fotos y texto.
//   Paso 2, «Dónde guardarla»: el servicio (ya viene uno sugerido), si la ve el dueño y Guardar.
// Los dos pasos quedan siempre montados y se esconde el que no toca: así lo que se escribió y las
// fotos sacadas no se pierden al ir y volver.
//
// Si no hay señal o el servidor falla, lo escrito y las fotos se quedan en pantalla y se avisa:
// se puede volver a intentar sin sacar todo de nuevo.
import { ArrowLeft } from "lucide-react";
import { useState, useTransition } from "react";
import { CampoFormulario } from "@/componentes/comunes/campo-formulario";
import { ErrorDeFormulario } from "@/componentes/comunes/error-de-formulario";
import { Boton } from "@/componentes/ui/boton";
import { AreaTexto } from "@/componentes/ui/area-texto";
import { Casilla } from "@/componentes/ui/casilla";
import { guardarNota } from "./acciones";
import { ElegirServicio } from "./elegir-servicio";
import { FotosDeNota, type FotoElegida } from "./fotos-de-nota";
import type { OpcionDeServicio } from "./tipos";

export function PasosDeNota({
  opciones,
  elegidoAlInicio,
  errorDeBusqueda,
  alGuardar,
}: {
  opciones: OpcionDeServicio[];
  elegidoAlInicio: string | null;
  errorDeBusqueda: string | null;
  alGuardar: (guardada: { donde: string; servicioId: string; aviso: string | null }) => void;
}) {
  const [paso, setPaso] = useState<1 | 2>(1);
  const [fotos, setFotos] = useState<FotoElegida[]>([]);
  const [texto, setTexto] = useState("");
  const [servicioId, setServicioId] = useState<string | null>(elegidoAlInicio);
  const [paraDueno, setParaDueno] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDeTexto, setErrorDeTexto] = useState<string | undefined>();
  const [pendiente, empezar] = useTransition();

  const hayAlgo = texto.trim() !== "" || fotos.length > 0;
  const elegido = opciones.find((o) => o.id === servicioId);

  function siguiente() {
    if (!hayAlgo) {
      setErrorDeTexto("Escribe algo o saca una foto.");
      return;
    }
    setErrorDeTexto(undefined);
    setPaso(2);
  }

  function guardar() {
    if (!elegido) {
      setError("Elige en qué servicio se guarda la nota.");
      return;
    }
    setError(null);
    const datos = new FormData();
    datos.set("servicioId", elegido.id);
    datos.set("texto", texto);
    if (paraDueno) datos.set("paraDueno", "on");
    for (const foto of fotos) datos.append("fotos", foto.archivo, foto.archivo.name);

    empezar(async () => {
      try {
        const resultado = await guardarNota(datos);
        if (resultado.ok) {
          alGuardar({ donde: `${elegido.titulo}`, servicioId: elegido.id, aviso: resultado.aviso });
        } else {
          setError(resultado.error);
        }
      } catch (causa) {
        // Sin señal, la llamada al servidor ni siquiera llega: se avisa y todo queda como estaba.
        console.error("[anotar] No se pudo guardar la nota:", causa);
        setError("No se pudo enviar la nota. Revisa tu señal e intenta de nuevo: lo que escribiste y las fotos siguen aquí.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs font-bold tracking-[0.07em] text-soft uppercase">Paso {paso} de 2</p>

      <section hidden={paso !== 1} className="flex flex-col gap-4">
        <FotosDeNota fotos={fotos} alCambiar={setFotos} />
        <CampoFormulario etiqueta="Qué viste o qué pasó" error={errorDeTexto}>
          <AreaTexto
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={4}
            maxLength={4000}
            placeholder="Ej.: Fui, faltaba la llave del medidor. Vuelvo el lunes."
          />
        </CampoFormulario>
        <Boton onClick={siguiente} className="h-12 text-base">
          Siguiente
        </Boton>
      </section>

      <section hidden={paso !== 2} className="flex flex-col gap-4">
        <ElegirServicio opciones={opciones} elegidoId={servicioId} alElegir={setServicioId} errorDeBusqueda={errorDeBusqueda} />
        <Casilla checked={paraDueno} onChange={(e) => setParaDueno(e.target.checked)}>
          Que la vea el dueño
        </Casilla>
        <ErrorDeFormulario mensaje={error} />
        <div className="flex flex-col gap-2">
          <Boton onClick={guardar} disabled={pendiente} className="h-12 text-base">
            {pendiente ? "Guardando…" : "Guardar nota"}
          </Boton>
          <Boton variante="fantasma" onClick={() => setPaso(1)} disabled={pendiente}>
            <ArrowLeft aria-hidden /> Volver a la nota
          </Boton>
        </div>
      </section>
    </div>
  );
}
