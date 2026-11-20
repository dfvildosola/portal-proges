"use client";
// Los botones de una tarjeta del tablero: mover el servicio de columna sin abrir su ficha. Las
// columnas no se arrastran: salen del estado del servicio, así que cada botón cambia ese estado y
// la tarjeta cambia de columna sola cuando la acción revalida /servicios.
//   Nuevo        pedido del dueño: un enlace a Repartir (ahí se acepta o se rechaza); si no, elegir
//                quién lo lleva y/o «Confirmar», según lo que falte.
//   Nos toca     «Esperamos a…», con la misma ventana de la ficha.
//   Esperando    «Ya respondió», con una pregunta antes: sacar la espera borra desde cuándo se
//                esperaba (si se vuelve a poner, la cuenta parte de cero), y en el celular un
//                toque sin querer al bajar por la lista es fácil.
//   Por entregar nada: cerrar pide un motivo y se hace en la ficha.
import Link from "next/link";
import { useState, useTransition } from "react";
import type { Esperando, ServicioTableroItem } from "@proges/contrato";
import { ErrorDeFormulario } from "@/componentes/comunes/error-de-formulario";
import { Boton, estiloBoton } from "@/componentes/ui/boton";
import { aQuienSeEspera } from "@/lib/etiquetas";
import { yaNoEsperamos } from "@/app/(equipo)/servicios/[id]/acciones";
import { CambiarEspera } from "./cambiar-espera";
import { CambiarResponsable } from "./cambiar-responsable";
import { ConfirmarServicio } from "./confirmar-servicio";
import type { Persona } from "./tipos";
import type { ColumnaDelTablero } from "./tarjeta-de-servicio";

// «Ya respondió»: el primer toque pregunta («¿Ya respondió la notaría?») y el «Sí» deja de esperar.
// Si la API lo rechaza, el mensaje queda debajo.
function YaRespondio({ servicioId, esperando }: { servicioId: string; esperando: Esperando }) {
  const [preguntando, setPreguntando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, empezar] = useTransition();

  function alConfirmar() {
    setError(null);
    empezar(async () => {
      const resultado = await yaNoEsperamos(servicioId);
      if (!resultado.ok) setError(resultado.error);
    });
  }

  if (!preguntando) {
    return (
      <Boton variante="contorno" tamano="compacto" onClick={() => setPreguntando(true)}>
        Ya respondió
      </Boton>
    );
  }
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold">¿Ya respondió {aQuienSeEspera(esperando)}?</span>
      <div className="flex flex-wrap gap-2">
        <Boton tamano="compacto" onClick={alConfirmar} disabled={pendiente}>
          {pendiente ? "Guardando…" : "Sí, ya respondió"}
        </Boton>
        <Boton variante="fantasma" tamano="compacto" onClick={() => setPreguntando(false)} disabled={pendiente}>
          No
        </Boton>
      </div>
      <ErrorDeFormulario mensaje={error} />
    </div>
  );
}

type Datos = { servicio: ServicioTableroItem; columna: ColumnaDelTablero; personas: Persona[] };

// Qué botones van según la columna; null si no hay ninguno (así no se dibuja una fila vacía).
function accionesSegunColumna({ servicio, columna, personas }: Datos): React.ReactNode {
  if (columna === "nuevo") {
    // Un pedido del dueño no se reparte ni se confirma aquí: primero se acepta o se rechaza.
    if (servicio.porRevisar) {
      return (
        <Link href="/repartir" className={estiloBoton({ variante: "contorno", tamano: "compacto" })}>
          Revisar en Repartir
        </Link>
      );
    }
    const sinResponsable = servicio.responsable === null;
    if (!sinResponsable && !servicio.porConfirmar) return null;
    return (
      <>
        {sinResponsable && (
          <CambiarResponsable
            servicioId={servicio.id}
            responsableId={null}
            personas={personas}
            deshabilitado={false}
            compacto
            vacio="¿Quién lo lleva?"
            etiqueta="¿Quién lleva este servicio?"
            className="min-w-40 flex-1"
          />
        )}
        {servicio.porConfirmar && <ConfirmarServicio servicioId={servicio.id} compacto />}
      </>
    );
  }
  if (columna === "nosToca") {
    return <CambiarEspera servicioId={servicio.id} esperando={servicio.esperando} variante="contorno" compacto texto="Esperamos a…" />;
  }
  if (columna === "esperando" && servicio.esperando) return <YaRespondio servicioId={servicio.id} esperando={servicio.esperando} />;
  return null;
}

// `relative z-10` pone la fila encima del enlace que cubre la tarjeta, para que tocar un botón no
// abra la ficha. La fila misma deja pasar los clics (`pointer-events-none`) y solo sus controles
// los toman: así, tocar el espacio libre al lado de un botón sigue abriendo la ficha.
// `tituloId`: el id del título de la tarjeta. Los controles se agrupan con ese nombre, para que un
// lector de pantalla diga de qué servicio es cada «Confirmar».
export function AccionesDeTarjeta({ tituloId, ...props }: Datos & { tituloId: string }) {
  const contenido = accionesSegunColumna(props);
  if (!contenido) return null;
  return (
    <div
      role="group"
      aria-labelledby={tituloId}
      className="pointer-events-none relative z-10 mt-1.5 flex flex-wrap items-start gap-2 [&>*]:pointer-events-auto"
    >
      {contenido}
    </div>
  );
}
