// La insignia: una etiqueta chica de color («conforme», «13 d», «nuevo»). El color dice el
// significado: `ok` bien, `warn` ojo, `bad` urgente o atrasado, `ink` informativo, `neutro` sin carga.
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const estiloInsignia = cva(
  "inline-flex w-fit items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[10.5px] leading-snug font-bold",
  {
    variants: {
      tono: {
        neutro: "bg-line text-soft",
        ink: "bg-ink-soft text-ink",
        ok: "bg-ok-soft text-ok",
        warn: "bg-warn-soft text-warn",
        bad: "bg-bad-soft text-bad",
      },
    },
    defaultVariants: { tono: "neutro" },
  },
);

export type TonoDeInsignia = NonNullable<VariantProps<typeof estiloInsignia>["tono"]>;

export function Insignia({
  className,
  tono,
  ...props
}: ComponentProps<"span"> & VariantProps<typeof estiloInsignia>) {
  return <span className={cn(estiloInsignia({ tono }), className)} {...props} />;
}
