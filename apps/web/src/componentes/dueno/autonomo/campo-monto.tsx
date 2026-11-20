// Un campo de plata: el valor y su moneda (pesos o UF) lado a lado. Los nombres de los campos del
// formulario son `<nombre>` y `<nombre>Moneda`, que es lo que lee `montoDe` (montos.ts). Con
// `monedaFija` no hay lista: la moneda viaja escondida (los pagos de un cobro van en la del cobro;
// las contribuciones, siempre en pesos).
import type { Moneda } from "@proges/contrato";
import { CampoTexto } from "@/componentes/ui/campo-texto";
import { Select } from "@/componentes/ui/select";

export function CampoMonto({
  etiqueta,
  nombre,
  error,
  ayuda,
  valor,
  moneda = "CLP",
  monedaFija = false,
  obligatorio = false,
}: {
  etiqueta: string;
  nombre: string;
  error?: string;
  ayuda?: string;
  /** El valor con que parte el campo (por ejemplo, al editar). */
  valor?: string;
  moneda?: Moneda;
  monedaFija?: boolean;
  obligatorio?: boolean;
}) {
  return (
    <div className="group/campo flex flex-col gap-1.5" data-invalido={error ? "" : undefined}>
      <label htmlFor={`campo-${nombre}`} className="text-[13px] font-bold">
        {etiqueta}
      </label>
      <div className="flex gap-2">
        <CampoTexto
          id={`campo-${nombre}`}
          name={nombre}
          inputMode="decimal"
          autoComplete="off"
          defaultValue={valor}
          required={obligatorio}
          placeholder={monedaFija && moneda === "CLP" ? "$" : undefined}
        />
        {monedaFija ? (
          <input type="hidden" name={`${nombre}Moneda`} value={moneda} />
        ) : (
          <div className="w-24 shrink-0">
            <Select name={`${nombre}Moneda`} defaultValue={moneda} aria-label={`Moneda de ${etiqueta.toLowerCase()}`}>
              <option value="CLP">Pesos</option>
              <option value="UF">UF</option>
            </Select>
          </div>
        )}
      </div>
      {ayuda && !error && <span className="text-xs text-soft">{ayuda}</span>}
      {error && (
        <span role="alert" className="text-xs font-semibold text-bad">
          {error}
        </span>
      )}
    </div>
  );
}
