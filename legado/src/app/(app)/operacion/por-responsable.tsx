// «Por responsable»: cuántos servicios abiertos lleva cada persona, y los que
// no tienen a nadie. Cada nombre lleva su cuenta; la barra es solo una ayuda
// para comparar de un vistazo.

import { Card } from "@/components/ui/card";

export type CuentaResponsable = {
  clave: string;
  nombre: string;
  abiertos: number;
};

export function PorResponsable({ cuentas }: { cuentas: CuentaResponsable[] }) {
  const mayor = Math.max(1, ...cuentas.map((c) => c.abiertos));
  return (
    <Card className="gap-0 divide-y py-0">
      {cuentas.map((c) => (
        <div key={c.clave} className="flex items-center gap-3 px-4 py-3 text-sm">
          <span className="w-36 shrink-0 truncate sm:w-48">{c.nombre}</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${(c.abiertos / mayor) * 100}%` }}
            />
          </div>
          <span className="w-8 text-right font-medium tabular-nums">
            {c.abiertos}
          </span>
        </div>
      ))}
    </Card>
  );
}
