// El inicio del cliente atendido (un cliente grande al que Proges le hace los servicios). Este dueño
// no hace el trabajo: lo sigue y decide. Por eso arriba va lo que espera su respuesta, después sus
// servicios en curso con a quién se espera, y abajo las novedades. Sin props: pide lo que necesita
// (yo() y la API) desde el servidor.
import Link from "next/link";
import type { ServicioFila, ServiciosLista } from "@proges/contrato";
import { EncabezadoDePagina } from "@/componentes/comunes/encabezado-de-pagina";
import { Fecha } from "@/componentes/comunes/fecha";
import { Seccion } from "@/componentes/comunes/seccion";
import { Vacio } from "@/componentes/comunes/vacio";
import { estiloBoton } from "@/componentes/ui/boton";
import { Insignia } from "@/componentes/ui/insignia";
import { Tarjeta } from "@/componentes/ui/tarjeta";
import { pedir, yo } from "@/lib/api";
import { ChipDeEspera } from "./atendido/chip-de-espera";
import { nombreDelServicio } from "./atendido/etiquetas-atendido";
import { NovedadesDelDueno } from "./atendido/novedades";
import { ofertasPorResponder } from "./atendido/ofertas-pendientes";
import { TarjetaPorResponder } from "./atendido/tarjeta-por-responder";
import { ErrorDeCarga } from "@/componentes/comunes/error-de-carga";

function TarjetaDeServicio({ s }: { s: ServicioFila }) {
  return (
    <Link href={`/mi/servicios/${encodeURIComponent(s.id)}`} className="block">
      <Tarjeta className="h-full gap-1.5 hover:bg-ink-soft">
        <span className="text-xs font-bold text-soft">{nombreDelServicio(s.tipo)}</span>
        <span className="text-[15px] font-extrabold break-words">{s.propiedad.direccion}</span>
        <span className="text-xs text-soft">
          {s.propiedad.comuna} · empezó el <Fecha valor={s.abiertoEl} formato="corta" />
        </span>
        <ChipDeEspera esperando={s.esperando} className="mt-1" />
      </Tarjeta>
    </Link>
  );
}

export async function InicioAtendido() {
  const [quien, lista] = await Promise.all([
    yo(),
    pedir<ServiciosLista>("/v1/servicios", { consulta: { vista: "lista", estado: "ABIERTO", porPagina: 100 } }),
  ]);
  // Un dueño recibe siempre filas sin responsable ni cliente (ServicioFila): las del equipo solo las ve el equipo.
  const servicios: ServicioFila[] = lista.items;
  const { pendientes, error } = await ofertasPorResponder(servicios);

  // Servicios donde Proges espera al dueño y que no tienen una oferta por responder (esa ya sale arriba).
  const conOferta = new Set(pendientes.map((p) => p.servicio.id));
  const esperanAlDueno = servicios.filter((s) => s.esperando?.a === "DUENO" && !conOferta.has(s.id));
  const porDecidir = pendientes.length + esperanAlDueno.length;

  const nombre = quien.tipo === "usuario" ? quien.usuario.nombre.split(" ")[0] : null;
  const enCurso = servicios.length;

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoDePagina
        titulo={nombre ? `Hola, ${nombre}` : "Inicio"}
        subtitulo={
          enCurso === 0
            ? "No hay servicios en curso por ahora."
            : `${enCurso} ${enCurso === 1 ? "servicio en curso" : "servicios en curso"} con Proges`
        }
      >
        <Link href="/mi/pedir" className={estiloBoton({ variante: "principal" })}>
          Pedir a Proges
        </Link>
      </EncabezadoDePagina>

      {error && <ErrorDeCarga mensaje={error} />}

      {porDecidir > 0 && (
        <Seccion titulo={`Para decidir · ${porDecidir}`}>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {pendientes.map((p) => (
              <TarjetaPorResponder key={p.oferta.id} item={p} conEnlace />
            ))}
            {esperanAlDueno.map((s) => (
              <Link key={s.id} href={`/mi/servicios/${encodeURIComponent(s.id)}`} className="block">
                <Tarjeta className="h-full border-warn hover:bg-ink-soft">
                  <Insignia tono="warn">Esperamos tu respuesta</Insignia>
                  <span className="text-[15px] font-extrabold">
                    {nombreDelServicio(s.tipo)} · {s.propiedad.direccion}
                  </span>
                  {s.esperando?.detalle && <span className="text-[13px]">{s.esperando.detalle}</span>}
                </Tarjeta>
              </Link>
            ))}
          </div>
        </Seccion>
      )}

      <Seccion titulo="En curso">
        {servicios.length === 0 ? (
          <Vacio texto="No tienes servicios en curso.">
            <Link href="/mi/pedir" className={estiloBoton({ variante: "contorno", tamano: "chico" })}>
              Pedir un servicio
            </Link>
          </Vacio>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {servicios.map((s) => (
              <TarjetaDeServicio key={s.id} s={s} />
            ))}
          </div>
        )}
      </Seccion>

      <Seccion titulo="Novedades" derecha={<span className="text-xs text-soft">lo que Proges marcó para ti</span>}>
        <NovedadesDelDueno />
      </Seccion>
    </div>
  );
}
