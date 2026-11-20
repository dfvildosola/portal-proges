// Una suma que la API entrega como una lista de montos, uno por moneda (por ejemplo «$ 500.000» y
// «UF 12,00»). Los escribe juntos; si no hay ninguno, escribe cero en pesos.
import type { Monto as MontoDeApi } from "@proges/contrato";
import { Monto } from "@/componentes/comunes/monto";

const CERO: MontoDeApi = { valor: "0", moneda: "CLP" };

export function MontosJuntos({ montos }: { montos: MontoDeApi[] }) {
  const lista = montos.length > 0 ? montos : [CERO];
  return (
    <>
      {lista.map((monto, i) => (
        <span key={monto.moneda}>
          {i > 0 && " + "}
          <Monto valor={monto} />
        </span>
      ))}
    </>
  );
}
