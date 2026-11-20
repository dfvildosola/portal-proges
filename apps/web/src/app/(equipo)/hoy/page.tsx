// Hoy: lo que me toca a mí. Es la puerta de entrada del celular (François y Leo la abren en
// terreno), así que lo urgente va arriba, sin tablas y con un toque por tarea.
import { Camera } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { TareasRespuesta } from "@proges/contrato";
import { EncabezadoDePagina } from "@/componentes/comunes/encabezado-de-pagina";
import { Vacio } from "@/componentes/comunes/vacio";
import { estiloBoton } from "@/componentes/ui/boton";
import { GrupoDeTareas } from "@/componentes/tareas/grupo-de-tareas";
import { pedir, yo } from "@/lib/api";
import { fechaConDia } from "@/lib/formato";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Hoy" };

export default async function Pagina() {
  const [respuesta, quien] = await Promise.all([
    pedir<TareasRespuesta>("/v1/tareas", { consulta: { vista: "hoy" } }),
    yo(),
  ]);
  // Con vista=hoy la API siempre responde la forma «hoy»; si no, es un error de programación.
  if (respuesta.vista !== "hoy") throw new Error(`Hoy esperaba la vista «hoy» y llegó «${respuesta.vista}».`);
  const { atrasadas, hoy, manana, masAdelante } = respuesta;
  const nombre = quien.tipo === "usuario" ? quien.usuario.nombre.split(" ")[0] : "";
  const total = atrasadas.length + hoy.length + manana.length;

  return (
    <div className="flex flex-col gap-5">
      <EncabezadoDePagina titulo="Hoy" subtitulo={`${fechaConDia(respuesta.fecha)}${nombre ? ` · ${nombre}` : ""}`}>
        {/* En el celular el botón de anotar flota abajo, al alcance del pulgar; aquí es para el computador. */}
        <Link href="/anotar" className={cn(estiloBoton(), "hidden lg:inline-flex")}>
          <Camera aria-hidden /> Anotar
        </Link>
      </EncabezadoDePagina>

      {total === 0 ? (
        <Vacio texto="No tienes tareas para hoy ni para mañana. Buen momento para anotar lo que viste en terreno." />
      ) : (
        <>
          <GrupoDeTareas titulo="Atrasadas" tareas={atrasadas} urgente />
          <GrupoDeTareas titulo="Hoy" tareas={hoy} />
          <GrupoDeTareas titulo="Mañana" tareas={manana} />
        </>
      )}

      {masAdelante > 0 && (
        <p className="text-center text-xs text-soft">
          {masAdelante === 1 ? "Tienes 1 tarea más, para después o sin fecha." : `Tienes ${masAdelante} tareas más, para después o sin fecha.`}
        </p>
      )}

      <Link
        href="/anotar"
        className={cn(
          estiloBoton({ tamano: "normal" }),
          "fixed right-4 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-20 h-12 rounded-full px-5 shadow-lg lg:hidden",
        )}
      >
        <Camera aria-hidden /> Anotar
      </Link>
    </div>
  );
}
