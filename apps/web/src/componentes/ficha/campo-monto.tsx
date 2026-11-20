// Un monto en un formulario: la cantidad y su moneda lado a lado. La acción (acciones.ts) los lee
// por sus dos nombres y arma el { valor, moneda } que pide la API. La cantidad se escribe tal cual
// («1500000», o «1.500.000» en pesos); no se convierte a número en el navegador.
import type { Monto } from "@proges/contrato";
import { CampoFormulario } from "@/componentes/comunes/campo-formulario";
import { CampoTexto } from "@/componentes/ui/campo-texto";
import { Select } from "@/componentes/ui/select";

type Props = {
  etiqueta: string;
  /** El nombre del campo de la cantidad; el de la moneda es `nombreMoneda`. */
  nombre: string;
  nombreMoneda: string;
  /** Lo que ya tiene la propiedad, si algo. */
  actual?: Monto | null;
  error?: string;
  ayuda?: string;
};

export function CampoMonto({ etiqueta, nombre, nombreMoneda, actual, error, ayuda }: Props) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_6rem] items-start gap-2">
      <CampoFormulario etiqueta={etiqueta} error={error} ayuda={ayuda}>
        <CampoTexto name={nombre} inputMode="decimal" defaultValue={actual?.valor ?? ""} />
      </CampoFormulario>
      <CampoFormulario etiqueta="Moneda">
        <Select name={nombreMoneda} defaultValue={actual?.moneda ?? "CLP"}>
          <option value="CLP">Pesos</option>
          <option value="UF">UF</option>
        </Select>
      </CampoFormulario>
    </div>
  );
}
