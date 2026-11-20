// El mensaje general de un formulario que falló («Revisa los datos enviados.»). Es el `errorGeneral`
// de `useFormulario`; si es null no muestra nada. Los errores de cada campo los muestra su
// `CampoFormulario`.
import { cn } from "@/lib/utils";

export function ErrorDeFormulario({ mensaje, className }: { mensaje: string | null; className?: string }) {
  if (!mensaje) return null;
  return (
    <p role="alert" className={cn("rounded-[10px] bg-bad-soft px-3 py-2 text-sm font-semibold text-bad", className)}>
      {mensaje}
    </p>
  );
}
