"use client";
// El hook de los formularios del lado del navegador. Va de la mano con `ejecutar` (acciones.ts).
//
// Qué resuelve: mostrar en el formulario el error general y el de cada campo, mostrar «guardando…»
// mientras se espera, y NO vaciar lo que la persona escribió si algo falló (React 19 vacía los
// formularios después de enviarlos, salga bien o mal; aquí el envío se hace a mano para que solo se
// vacíe cuando salió bien).
import { useActionState, useEffect, useEffectEvent, useRef, startTransition } from "react";
import type { FormEvent } from "react";
import type { ResultadoAccion } from "./acciones";

type Accion = (anterior: ResultadoAccion | null, datos: FormData) => Promise<ResultadoAccion>;

export type OpcionesDeFormulario = {
  /** Se llama una vez cuando la acción sale bien (por ejemplo, para cerrar un diálogo). */
  alExito?: () => void;
  /** Si es false, el formulario no se vacía al salir bien (por defecto se vacía). */
  vaciarAlExito?: boolean;
};

export function useFormulario(accion: Accion, opciones: OpcionesDeFormulario = {}) {
  const [estado, enviar, pendiente] = useActionState(accion, null);
  const formulario = useRef<HTMLFormElement>(null);

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const datos = new FormData(evento.currentTarget);
    startTransition(() => enviar(datos));
  }

  // Cuando llega un resultado nuevo y salió bien: vacía el formulario y avisa. `useEffectEvent`
  // deja usar los valores de `opciones` sin que el efecto se repita cada vez que cambian.
  const alTerminarBien = useEffectEvent(() => {
    if (opciones.vaciarAlExito !== false) formulario.current?.reset();
    opciones.alExito?.();
  });
  useEffect(() => {
    if (estado?.ok) alTerminarBien();
  }, [estado]);

  const error = estado && !estado.ok ? estado : null;
  return {
    /** Se esparce en el <form>: `<form {...formProps}>`. */
    formProps: { ref: formulario, onSubmit: alEnviar },
    /** true mientras se espera a la API: sirve para desactivar el botón. */
    pendiente,
    /** El resultado de la última vez (null si todavía no se envió). */
    estado,
    /** El mensaje general («Revisa los datos enviados»), o null. */
    errorGeneral: error?.error ?? null,
    /** El mensaje de un campo puntual, o undefined si ese campo está bien. */
    errorDe: (campo: string): string | undefined => error?.campos[campo],
  };
}
