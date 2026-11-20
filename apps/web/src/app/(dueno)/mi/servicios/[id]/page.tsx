// El seguimiento de un servicio para el dueño: cómo va, a quién se espera, lo que el equipo marcó
// para él y, según el tipo de servicio, el avance de la obra o el reporte de la venta. El dueño
// aquí mira y decide (responde ofertas); no hay nada que editar.
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import type { ServicioFicha } from "@proges/contrato";
import { BandaDeEspera } from "@/componentes/dueno/atendido/banda-de-espera";
import { ChipEstado } from "@/componentes/comunes/chip-estado";
import { EncabezadoDePagina } from "@/componentes/comunes/encabezado-de-pagina";
import { Fecha } from "@/componentes/comunes/fecha";
import { nombreDelServicio } from "@/componentes/dueno/atendido/etiquetas-atendido";
import { OfertasPorResponder } from "@/componentes/dueno/atendido/ofertas-por-responder";
import { SeguimientoDelServicio } from "@/componentes/dueno/atendido/seguimiento";
import { PanelObra } from "@/componentes/obra/panel-obra";
import { Tarjeta } from "@/componentes/ui/tarjeta";
import { PanelVenta } from "@/componentes/venta/panel-venta";
import { pedir } from "@/lib/api";

export const metadata: Metadata = { title: "Servicio" };

function Cargando() {
  return (
    <Tarjeta>
      <p className="text-sm text-soft">Cargando…</p>
    </Tarjeta>
  );
}

export default async function Pagina({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ficha = await pedir<ServicioFicha>(`/v1/servicios/${encodeURIComponent(id)}`);
  // A un dueño la API le entrega la ficha recortada (sin tareas ni notas internas). Si llegara la
  // del equipo, algo se rompió en los permisos y es mejor parar que mostrarla.
  if ("tareas" in ficha) throw new Error("La API entregó la ficha del equipo en una pantalla del dueño.");

  const abierto = ficha.estado === "ABIERTO";
  const esObra = ficha.tipo === "OBRA";
  const esVenta = ficha.tipo === "VENTA" || ficha.tipo === "ARRIENDO";
  const tipo = nombreDelServicio(ficha.tipo);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <nav aria-label="Dónde estás" className="text-xs text-soft">
          <Link href="/mi" className="font-semibold text-ink hover:underline">
            Inicio
          </Link>{" "}
          /{" "}
          <Link href={`/mi/propiedades/${encodeURIComponent(ficha.propiedad.id)}`} className="font-semibold text-ink hover:underline">
            {ficha.propiedad.direccion}
          </Link>
        </nav>
        <EncabezadoDePagina
          titulo={`${tipo} · ${ficha.propiedad.direccion}`}
          subtitulo={
            <>
              A cargo de Proges · empezó el <Fecha valor={ficha.abiertoEl} formato="corta" />
              {ficha.cerradoEl && (
                <>
                  {" · "}
                  {ficha.estado === "TERMINADO" ? "terminó" : "se canceló"} el <Fecha valor={ficha.cerradoEl} formato="corta" />
                </>
              )}
            </>
          }
        >
          <ChipEstado estado={ficha.estado} />
        </EncabezadoDePagina>
      </div>

      {abierto && <BandaDeEspera esperando={ficha.esperando} />}

      {abierto && esVenta && <OfertasPorResponder servicio={ficha} />}

      <Suspense fallback={<Cargando />}>
        <SeguimientoDelServicio servicioId={ficha.id} notas={ficha.notas} />
      </Suspense>

      {esObra && (
        <Suspense fallback={<Cargando />}>
          <PanelObra servicioId={ficha.id} modo="dueno" />
        </Suspense>
      )}
      {esVenta && (
        <Suspense fallback={<Cargando />}>
          <PanelVenta servicioId={ficha.id} modo="dueno" />
        </Suspense>
      )}
    </div>
  );
}
