"use client";
// Asignar una factura de Odoo a esta obra. Se elige el maestro, la web trae sus facturas de Odoo
// (en ese momento, para que el estado y lo asignado sean los de hoy) y se indica cuánto de la
// factura es de esta obra: una factura se puede repartir entre dos obras, y lo asignado entre
// todas nunca pasa su total (la API lo vigila, aunque dos personas asignen a la vez).
import { useRef, useState } from "react";
import type { FacturaOdooDeMaestro } from "@proges/contrato";
import { CampoFormulario } from "@/componentes/comunes/campo-formulario";
import { ErrorDeFormulario } from "@/componentes/comunes/error-de-formulario";
import { CampoTexto } from "@/componentes/ui/campo-texto";
import { Select } from "@/componentes/ui/select";
import { fechaAuto, formatearMonto } from "@/lib/formato";
import { asignarFactura, facturasDeOdoo } from "./acciones";
import { DialogoFormulario } from "@/componentes/comunes/dialogo-formulario";
import { ETIQUETA_ESTADO_FACTURA, signoDeMonto } from "./etiquetas-obra";
import { useAccionDirecta } from "./usar-accion-directa";

export function AsignarFactura({ servicioId, maestros }: { servicioId: string; maestros: { id: string; nombre: string }[] }) {
  return (
    <DialogoFormulario
      boton="Asignar de Odoo"
      titulo="Asignar una factura de Odoo"
      descripcion="Elige al maestro y la factura. De Odoo solo se guarda cuánto de ella es de esta obra: lo demás se lee de Odoo cada vez."
      accion={asignarFactura}
      textoDeEnvio="Asignar"
      ocultos={{ servicioId }}
    >
      {(errorDe) => <CamposDeAsignacion maestros={maestros} errorDe={errorDe} />}
    </DialogoFormulario>
  );
}

function textoDeFactura(factura: FacturaOdooDeMaestro): string {
  const partes = [
    `N° ${factura.numero}`,
    factura.fecha ? fechaAuto(factura.fecha) : "sin fecha",
    formatearMonto(factura.total),
    ETIQUETA_ESTADO_FACTURA[factura.estado],
    `por asignar ${formatearMonto(factura.asignable)}`,
  ];
  return partes.join(" · ");
}

// Los campos van aparte para que lo elegido nazca de cero cada vez que se abre el diálogo.
function CamposDeAsignacion({
  maestros,
  errorDe,
}: {
  maestros: { id: string; nombre: string }[];
  errorDe: (campo: string) => string | undefined;
}) {
  const [maestroId, setMaestroId] = useState("");
  const [facturas, setFacturas] = useState<FacturaOdooDeMaestro[] | null>(null);
  const [odooMoveId, setOdooMoveId] = useState("");
  const { pendiente, error, ejecutar } = useAccionDirecta();
  // Si se cambia de maestro antes de que llegue la respuesta del anterior, esa respuesta se ignora.
  const maestroPedido = useRef("");

  function elegirMaestro(id: string) {
    setMaestroId(id);
    setFacturas(null);
    setOdooMoveId("");
    maestroPedido.current = id;
    if (!id) return;
    ejecutar(
      () => facturasDeOdoo(id),
      (respuesta) => {
        if (maestroPedido.current === id) setFacturas(respuesta?.items ?? []);
      },
    );
  }

  const factura = facturas?.find((f) => String(f.odooMoveId) === odooMoveId);
  // Se propone asignar todo lo que queda; los pesos no llevan decimales.
  const propuesta = factura ? factura.asignable.valor.split(".")[0] : "";

  return (
    <>
      <CampoFormulario etiqueta="Maestro" error={errorDe("maestroId")}>
        <Select name="maestroId" required value={maestroId} onChange={(e) => elegirMaestro(e.target.value)}>
          <option value="" disabled>
            Elige un maestro
          </option>
          {maestros.map((maestro) => (
            <option key={maestro.id} value={maestro.id}>
              {maestro.nombre}
            </option>
          ))}
        </Select>
      </CampoFormulario>

      {maestroId && (
        <CampoFormulario
          etiqueta="Factura"
          error={errorDe("odooMoveId")}
          ayuda={
            pendiente && !facturas
              ? "Buscando en Odoo…"
              : facturas && facturas.length === 0
                ? "Este maestro no tiene facturas en Odoo."
                : undefined
          }
        >
          <Select name="odooMoveId" required value={odooMoveId} onChange={(e) => setOdooMoveId(e.target.value)} disabled={!facturas || facturas.length === 0}>
            <option value="" disabled>
              {facturas ? "Elige una factura" : "…"}
            </option>
            {facturas?.map((f) => (
              <option key={f.odooMoveId} value={f.odooMoveId} disabled={f.estado === "anulada" || signoDeMonto(f.asignable.valor) === 0}>
                {textoDeFactura(f)}
              </option>
            ))}
          </Select>
        </CampoFormulario>
      )}

      {factura && (
        <CampoFormulario
          key={factura.odooMoveId}
          etiqueta="Cuánto de la factura es de esta obra (pesos)"
          error={errorDe("monto") ?? errorDe("monto.valor")}
          ayuda={`Total en Odoo ${formatearMonto(factura.total)}; ya asignado a obras ${formatearMonto(factura.asignado)}.`}
        >
          <CampoTexto name="monto" inputMode="numeric" defaultValue={propuesta} required />
        </CampoFormulario>
      )}
      <ErrorDeFormulario mensaje={error} />
    </>
  );
}
