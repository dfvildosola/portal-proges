// La tabla (para el computador). En el celular se desliza de lado dentro de su cuadro, sin
// ensanchar la página. Las cifras van con `className="text-right font-mono tabular-nums"`.
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Tabla({ className, ...props }: ComponentProps<"table">) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn("w-full border-collapse text-[13px]", className)} {...props} />
    </div>
  );
}

export const TablaCabecera = (props: ComponentProps<"thead">) => <thead {...props} />;
export const TablaCuerpo = (props: ComponentProps<"tbody">) => <tbody {...props} />;

export function TablaFila({ className, ...props }: ComponentProps<"tr">) {
  return <tr className={cn("hover:bg-ink-soft/60", className)} {...props} />;
}

export function TablaTitulo({ className, ...props }: ComponentProps<"th">) {
  return (
    <th
      className={cn(
        "border-b border-line px-2 py-1.5 text-left text-[11px] font-bold tracking-[0.06em] whitespace-nowrap text-soft uppercase",
        className,
      )}
      {...props}
    />
  );
}

export function TablaCelda({ className, ...props }: ComponentProps<"td">) {
  return <td className={cn("border-b border-line px-2 py-2 align-middle", className)} {...props} />;
}
