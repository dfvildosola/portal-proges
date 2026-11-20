"use client";
// Los botones de una tarjeta del tablero: mover el servicio de columna sin abrir su ficha. Las
// columnas no se arrastran: salen del estado del servicio, así que cada botón cambia ese estado y
// la tarjeta cambia de columna sola cuando la acción revalida /servicios.
//   Nuevo        pedido del dueño: un enlace a Repartir (ahí se acepta o se rechaza); si no, elegir
//                quién lo lleva y/o «Confirmar», según lo que falte.
//   Nos toca     «Esperamos a…», con la misma ventana de la ficha.
//   Esperando    «Ya respondió»: un toque y la pelota vuelve a nosotros.
//   Por entregar nada: cerrar pide un motivo y se hace en la ficha.
import Link from "next/link";
import { useState, useTransition } from "react";
import type { ServicioTableroItem } from "@proges/contrato";
import { ErrorDeFormulario } from "@/componentes/comunes/error-de-formulario";
import { Boton, estiloBoton } from "@/componentes/ui/boton";
import { yaNoEsperamos } from "@/app/(equipo)/servicios/[id]/acciones";
import { CambiarEspera } from "./cambiar-espera";
import { CambiarResponsable } from "./cambiar-responsable";
import { ConfirmarServicio } from "./confirmar-servicio";
import type { Persona } from "./tipos";
import type { ColumnaDelTablero } from "./tarjeta-de-servicio";

// «Ya respondió»: deja de esperar a quien fuera. Si la API lo rechaza, el mensaje queda debajo.
function YaRespondio({ servicioId }: { servicioId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pendiente, empezar] = useTransition();

  function alTocar() {
    setError(null);
    empezar(async () => {
      const resultado = await yaNoEsperamos(servicioId);
      if (!resultado.ok) setError(resultado.error);
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <Boton variante="contorno" tamano="chico" onClick={alTocar} disabled={pendiente}>
        {pendiente ? "Guardando…" : "Ya respondió"}
      </Boton>
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
        <Link href="/repartir" className={estiloBoton({ variante: "contorno", tamano: "chico" })}>
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
  if (columna === "esperando") return <YaRespondio servicioId={servicio.id} />;
  return null;
}

// `relative z-10` pone la fila encima del enlace que cubre la tarjeta, para que tocar un botón no
// abra la ficha.
export function AccionesDeTarjeta(props: Datos) {
  const contenido = accionesSegunColumna(props);
  if (!contenido) return null;
  return <div className="relative z-10 mt-1.5 flex flex-wrap items-start gap-2">{contenido}</div>;
}
