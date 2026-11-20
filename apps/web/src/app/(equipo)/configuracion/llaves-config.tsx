// La pestaña «Llaves de la API»: una llave deja que el sistema de un cliente LEA sus datos (nunca
// escribe). De cada una se guarda solo el comienzo (el prefijo) para reconocerla a la vista.
import type { ClienteConfig, LlaveConfig } from "@proges/contrato";
import { Fecha } from "@/componentes/comunes/fecha";
import { Seccion } from "@/componentes/comunes/seccion";
import { Vacio } from "@/componentes/comunes/vacio";
import { Insignia } from "@/componentes/ui/insignia";
import { DialogoDeFormulario } from "./dialogo-de-formulario";
import { FilaDeConfig } from "./fila-de-config";
import { FormularioLlaveNueva } from "./formulario-llave-nueva";
import { FormularioRevocar } from "./formulario-revocar";

export function LlavesConfig({ llaves, clientes }: { llaves: LlaveConfig[]; clientes: ClienteConfig[] }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-soft">
        Una llave deja que el sistema de un cliente lea sus datos en Proges. Es solo de lectura. La llave completa se ve una sola vez, al crearla.
      </p>
      <Seccion
        titulo={`Llaves (${llaves.length})`}
        derecha={
          <DialogoDeFormulario etiqueta="Crear llave" titulo="Crear una llave" variante="principal">
            <FormularioLlaveNueva clientes={clientes.filter((c) => c.activa)} />
          </DialogoDeFormulario>
        }
      >
        {llaves.length === 0 ? (
          <Vacio texto="Todavía no hay llaves." />
        ) : (
          <ul className="flex flex-col gap-2">
            {llaves.map((l) => (
              <FilaDeConfig
                key={l.id}
                titulo={`${l.nombre} · ${l.clienteNombre}`}
                apagada={l.revocadaEl !== null}
                detalle={
                  <>
                    <span className="font-mono">{l.prefijo}…</span> · creada <Fecha valor={l.creadaEl} formato="conAnio" /> ·{" "}
                    {l.ultimoUso ? (
                      <>
                        último uso <Fecha valor={l.ultimoUso} formato="relativa" />
                      </>
                    ) : (
                      "sin usar todavía"
                    )}
                    {l.revocadaEl && (
                      <>
                        {" "}
                        · revocada <Fecha valor={l.revocadaEl} formato="conAnio" />
                      </>
                    )}
                  </>
                }
                etiquetas={<Insignia tono={l.revocadaEl ? "bad" : "ok"}>{l.revocadaEl ? "Revocada" : "Activa"}</Insignia>}
                acciones={
                  !l.revocadaEl && (
                    <DialogoDeFormulario etiqueta="Revocar" titulo="¿Revocar esta llave?" variante="peligro">
                      <FormularioRevocar id={l.id} nombre={l.nombre} />
                    </DialogoDeFormulario>
                  )
                }
              />
            ))}
          </ul>
        )}
      </Seccion>
    </div>
  );
}
