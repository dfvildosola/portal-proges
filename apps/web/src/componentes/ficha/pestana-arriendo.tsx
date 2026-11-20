// Pestaña «Arriendo y venta»: el contrato de arriendo de la propiedad con sus cobros (los datos
// salen de GET /v1/contratos y GET /v1/cobros filtrados por la propiedad), y un aviso de venta.
// Proges recién está empezando con administración y arriendos: por ahora esta pestaña solo muestra
// lo que ya existe; se diseña más cuando haya los primeros casos reales.
import Link from "next/link";
import type { Cobro, Contrato, EstadoCobro, EstadoContrato, FichaServicio } from "@proges/contrato";
import { Fecha } from "@/componentes/comunes/fecha";
import { Monto } from "@/componentes/comunes/monto";
import { Insignia, type TonoDeInsignia } from "@/componentes/ui/insignia";
import { Tabla, TablaCelda, TablaCuerpo, TablaFila, TablaTitulo } from "@/componentes/ui/tabla";
import { Tarjeta, TarjetaTitulo } from "@/componentes/ui/tarjeta";
import { mesConAnio } from "@/lib/formato";

const ESTADO_CONTRATO: Record<EstadoContrato, { texto: string; tono: TonoDeInsignia }> = {
  POR_EMPEZAR: { texto: "Por empezar", tono: "ink" },
  VIGENTE: { texto: "Vigente", tono: "ok" },
  TERMINA: { texto: "Termina pronto", tono: "warn" },
  TERMINADO: { texto: "Terminado", tono: "neutro" },
  VENCIDO: { texto: "Vencido", tono: "bad" },
};

const ESTADO_COBRO: Record<EstadoCobro, { texto: string; tono: TonoDeInsignia }> = {
  PENDIENTE: { texto: "Pendiente", tono: "neutro" },
  PAGADO: { texto: "Pagado", tono: "ok" },
  ATRASADO: { texto: "Atrasado", tono: "bad" },
};

type Props = {
  contratos: Contrato[];
  cobros: Cobro[];
  /** Cuántos cobros hay en total (se muestran los más recientes). */
  totalCobros: number;
  /** Los servicios de venta en curso de la propiedad, si los hay. */
  ventasEnCurso: FichaServicio[];
};

function TarjetaDeContrato({ contrato: c }: { contrato: Contrato }) {
  const estado = ESTADO_CONTRATO[c.estado];
  return (
    <Tarjeta tono="item">
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-bold">{c.arrendatarioNombre}</span>
        <Insignia tono={estado.tono}>{estado.texto}</Insignia>
      </div>
      <div className="text-[13px]">
        <Monto valor={c.monto} /> al mes · se paga el día {c.diaPago}
      </div>
      <div className="text-xs text-soft">
        Desde <Fecha valor={c.fechaInicio} formato="conAnio" /> hasta <Fecha valor={c.fechaSalida ?? c.terminoVigente} formato="conAnio" />
        {c.proximoReajuste && (
          <>
            {" · próximo reajuste "}
            <Fecha valor={c.proximoReajuste} formato="conAnio" />
          </>
        )}
      </div>
      {c.garantia && (
        <div className="text-xs text-soft">
          Garantía <Monto valor={c.garantia} />
        </div>
      )}
    </Tarjeta>
  );
}

export function PestanaArriendo({ contratos, cobros, totalCobros, ventasEnCurso }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <Tarjeta>
          <TarjetaTitulo>Arriendo</TarjetaTitulo>
          {contratos.length === 0 ? (
            <p className="py-2 text-[13px] text-soft">
              Esta propiedad no tiene contratos de arriendo. Proges recién está empezando con administración y arriendos: por ahora aquí solo se ve el contrato y los pagos que ya existen.
            </p>
          ) : (
            contratos.map((contrato) => <TarjetaDeContrato key={contrato.id} contrato={contrato} />)
          )}
        </Tarjeta>

        <Tarjeta>
          <TarjetaTitulo>Venta</TarjetaTitulo>
          {ventasEnCurso.length === 0 ? (
            <p className="py-2 text-[13px] text-soft">
              No hay una venta en curso. Si se vende, aquí quedan los anuncios, las visitas, las ofertas y el historial de precios.
            </p>
          ) : (
            ventasEnCurso.map((venta) => (
              <Link key={venta.id} href={`/servicios/${encodeURIComponent(venta.id)}`} className="block">
                <Tarjeta tono="item" className="hover:bg-ink-soft">
                  <span className="text-sm font-bold">{venta.nombre}</span>
                  <span className="text-xs text-soft">
                    Abierta <Fecha valor={venta.abiertoEl} formato="relativa" /> · toca para ver anuncios, visitas y ofertas
                  </span>
                </Tarjeta>
              </Link>
            ))
          )}
        </Tarjeta>
      </div>

      {contratos.length > 0 && (
        <Tarjeta>
          <TarjetaTitulo>
            Cobros del arriendo
            <span className="font-semibold tracking-normal normal-case">
              {totalCobros > cobros.length ? `los ${cobros.length} más recientes de ${totalCobros}` : `${totalCobros} en total`}
            </span>
          </TarjetaTitulo>
          {cobros.length === 0 ? (
            <p className="py-2 text-[13px] text-soft">Todavía no se genera ningún cobro.</p>
          ) : (
            <Tabla>
              <thead>
                <tr>
                  <TablaTitulo>Mes</TablaTitulo>
                  <TablaTitulo className="text-right">Cobro</TablaTitulo>
                  <TablaTitulo>Vence</TablaTitulo>
                  <TablaTitulo>Estado</TablaTitulo>
                  <TablaTitulo className="text-right">Saldo</TablaTitulo>
                </tr>
              </thead>
              <TablaCuerpo>
                {cobros.map((cobro) => (
                  <TablaFila key={cobro.id}>
                    <TablaCelda className="font-bold">{mesConAnio(cobro.periodo)}</TablaCelda>
                    <TablaCelda className="text-right">
                      <Monto valor={cobro.montoEsperado} />
                    </TablaCelda>
                    <TablaCelda>
                      <Fecha valor={cobro.fechaVencimiento} formato="conAnio" />
                    </TablaCelda>
                    <TablaCelda>
                      <Insignia tono={ESTADO_COBRO[cobro.estado].tono}>
                        {cobro.parcial ? "Pago parcial" : ESTADO_COBRO[cobro.estado].texto}
                      </Insignia>
                    </TablaCelda>
                    <TablaCelda className="text-right">
                      <Monto valor={cobro.saldo} />
                    </TablaCelda>
                  </TablaFila>
                ))}
              </TablaCuerpo>
            </Tabla>
          )}
        </Tarjeta>
      )}
    </div>
  );
}
