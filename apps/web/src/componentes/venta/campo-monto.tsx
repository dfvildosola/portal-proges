"use client";
// El campo de un monto con su moneda al lado (UF o pesos). Lo usan el precio y las ofertas.
import { CampoFormulario } from "@/componentes/comunes/campo-formulario";
import { CampoTexto } from "@/componentes/ui/campo-texto";
import { Select } from "@/componentes/ui/select";

export function CampoMonto({
  etiqueta,
  nombre,
  monedaPorDefecto,
  error,
}: {
  etiqueta: string;
  nombre: string;
  monedaPorDefecto: "CLP" | "UF";
  error?: string;
}) {
  return (
    <div className="grid grid-cols-[1fr_6rem] items-start gap-2">
      <CampoFormulario etiqueta={etiqueta} error={error}>
        <CampoTexto name={nombre} inputMode="decimal" placeholder="14.900" required />
      </CampoFormulario>
      <CampoFormulario etiqueta="Moneda">
        <Select name={`${nombre}Moneda`} defaultValue={monedaPorDefecto}>
          <option value="UF">UF</option>
          <option value="CLP">Pesos</option>
        </Select>
      </CampoFormulario>
    </div>
  );
}
