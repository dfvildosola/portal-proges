// La ficha de un servicio, como la ve el equipo: a quién se espera, tareas, bitácora, datos y, según
// el tipo de servicio, el panel de la obra o de la venta (esos paneles son de otras piezas y piden
// sus propios datos). Cerrar el servicio va al final.
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import type { EquipoRespuesta, ServicioEquipo, ServicioFicha } from "@proges/contrato";
import { ChipEstado } from "@/componentes/comunes/chip-estado";
import { EncabezadoDePagina } from "@/componentes/comunes/encabezado-de-pagina";
import { Fecha } from "@/componentes/comunes/fecha";
import { PanelObra } from "@/componentes/obra/panel-obra";
import { BandaDeEspera } from "@/componentes/servicio/banda-de-espera";
import { BitacoraDelServicio } from "@/componentes/servicio/bitacora-del-servicio";
import { CerrarServicio } from "@/componentes/servicio/cerrar-servicio";
import { DatosDelServicio } from "@/componentes/servicio/datos-del-servicio";
import { HistorialDeEspera } from "@/componentes/servicio/historial-de-espera";
import { TareasDelServicio } from "@/componentes/servicio/tareas-del-servicio";
import { Tarjeta } from "@/componentes/ui/tarjeta";
import { PanelVenta } from "@/componentes/venta/panel-venta";
import { pedir } from "@/lib/api";
import { ETIQUETA_TIPO_SERVICIO } from "@/lib/etiquetas";

export const metadata: Metadata = { title: "Servicio" };

// La API entrega la ficha del equipo o la del dueño según quién pregunta. Esta pantalla solo la
// abre el equipo (el marco lo exige); si llegara la del dueño, es un error de programación y se dice.
function esDelEquipo(ficha: ServicioFicha): ficha is ServicioEquipo {
  return "tareas" in ficha;
}

function CargandoPanel() {
  return (
    <Tarjeta>
      <p className="text-sm text-soft">Cargando…</p>
    </Tarjeta>
  );
}

export default async function Pagina({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rutaId = encodeURIComponent(id);
  const [ficha, equipo] = await Promise.all([
    pedir<ServicioFicha>(`/v1/servicios/${rutaId}`),
    pedir<EquipoRespuesta>("/v1/equipo"),
  ]);
  if (!esDelEquipo(ficha)) throw new Error("La API entregó la ficha del dueño en una pantalla del equipo.");

  const personas = equipo.items;
  const abierto = ficha.estado === "ABIERTO";
  // Cambiar responsable o espera solo se puede en un servicio abierto y ya repartido.
  const editable = abierto && !ficha.porRevisar;
  const porConfirmar = ficha.porConfirmar && ficha.estado !== "CANCELADO";
  const esObra = ficha.tipo === "OBRA";
  const tienePanelDeVenta = ficha.tipo === "VENTA" || ficha.tipo === "ARRIENDO";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <nav aria-label="Dónde estás" className="text-xs text-soft">
          <Link href="/servicios" className="text-ink hover:underline">
            Servicios
          </Link>{" "}
          / {ETIQUETA_TIPO_SERVICIO[ficha.tipo]}
        </nav>
        <EncabezadoDePagina
          titulo={`${ETIQUETA_TIPO_SERVICIO[ficha.tipo]} · ${ficha.propiedad.direccion}`}
          subtitulo={
            <>
              {ficha.cliente.nombre} · {ficha.responsable ? `responsable ${ficha.responsable.nombre}` : "sin responsable"} · empezó el{" "}
              <Fecha valor={ficha.abiertoEl} formato="corta" />
            </>
          }
        >
          <ChipEstado estado={ficha.estado} porRevisar={ficha.porRevisar} porConfirmar={ficha.porConfirmar} />
        </EncabezadoDePagina>
      </div>

      {/* Un solo aviso arriba: la espera y, si falta, el «Confirmar» (que también aplica a uno terminado, no a uno cancelado). */}
      {(abierto || porConfirmar) && (
        <BandaDeEspera
          servicioId={ficha.id}
          abierto={abierto}
          esperando={ficha.esperando}
          puedeCambiar={editable}
          porConfirmar={porConfirmar}
          nuevo={ficha.nuevo}
          porRevisar={ficha.porRevisar}
          sinResponsable={ficha.responsable === null}
        />
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1.25fr_1.1fr] lg:items-start lg:gap-4">
        <TareasDelServicio servicioId={ficha.id} tareas={ficha.tareas} personas={personas} puedeAgregar={abierto} />
        <BitacoraDelServicio servicioId={ficha.id} notas={ficha.notas} puedeAnotar />
        <div className="flex min-w-0 flex-col gap-5">
          <DatosDelServicio servicio={ficha} personas={personas} />
          <HistorialDeEspera cambios={ficha.historialEspera} />
          {abierto && !ficha.porRevisar && <CerrarServicio servicioId={ficha.id} esObra={esObra} />}
        </div>
      </div>

      {/* La obra y la venta tienen mucho adentro (decenas de partidas, anuncios, visitas): van a
          todo el ancho, debajo, y no apretadas en una columna. */}
      {esObra && (
        <Suspense fallback={<CargandoPanel />}>
          <PanelObra servicioId={ficha.id} modo="equipo" />
        </Suspense>
      )}
      {tienePanelDeVenta && (
        <Suspense fallback={<CargandoPanel />}>
          <PanelVenta servicioId={ficha.id} modo="equipo" />
        </Suspense>
      )}
    </div>
  );
}
