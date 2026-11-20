// Un campo de formulario completo: la etiqueta, el control y, si hace falta, la ayuda y el error de
// ese campo. La etiqueta envuelve al control: tocar el texto de la etiqueta enfoca el campo, sin
// ids ni enlaces que mantener. Si hay `error`, el borde del control se pone rojo solo.
//
//   <CampoFormulario etiqueta="Título" error={errorDe("titulo")}>
//     <CampoTexto name="titulo" required />
//   </CampoFormulario>
//
// Para un grupo de opciones (varias casillas) usa un <fieldset>, no este componente.
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function CampoFormulario({
  etiqueta,
  error,
  ayuda,
  children,
  className,
}: {
  etiqueta: string;
  error?: string;
  ayuda?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("group/campo flex flex-col gap-1.5", className)} data-invalido={error ? "" : undefined}>
      <span className="text-[13px] font-bold">{etiqueta}</span>
      {children}
      {ayuda && !error && <span className="text-xs text-soft">{ayuda}</span>}
      {error && (
        <span role="alert" className="text-xs font-semibold text-bad">
          {error}
        </span>
      )}
    </label>
  );
}
