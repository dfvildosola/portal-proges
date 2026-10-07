"use client";

import { startTransition, useActionState, useRef, type FormEvent } from "react";

// Igual que useActionState, pero el formulario no se vacía cuando el servidor responde con un error.
// React 19 limpia un <form action={…}> cada vez que corre la acción, haya salido bien o no, y obliga
// a escribir todo de nuevo. Enviando desde onSubmit no lo limpia; aquí se limpia a mano solo si no hubo error.
// Uso: const [state, formProps, pending] = useFormAction(accion, {}); <form {...formProps}>
export function useFormAction<S extends { error?: string }>(
  action: (state: Awaited<S>, formData: FormData) => Promise<S>,
  initialState: Awaited<S>,
) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, dispatch, pending] = useActionState(
    async (prev: Awaited<S>, formData: FormData) => {
      const next = await action(prev, formData);
      if (!next?.error) formRef.current?.reset();
      return next;
    },
    initialState,
  );

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // El submitter mantiene el name/value del botón que envió, como un envío normal.
    const formData = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
    startTransition(() => dispatch(formData));
  }

  return [state, { ref: formRef, onSubmit }, pending] as const;
}
