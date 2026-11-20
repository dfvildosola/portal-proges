// Un servicio dentro del tablero, como en la maqueta: qué es, dónde, quién lo lleva y cuál es el
// próximo paso. Hacer clic en cualquier parte de la tarjeta abre la ficha: el enlace es el título,
// estirado sobre toda la tarjeta (`after:absolute after:inset-0`). Un botón no puede ir dentro de un
// enlace, por eso la fila de acciones de abajo va aparte, encima del enlace (acciones-de-tarjeta.tsx).
//   Línea 1  «Tipo · Dirección» en negrita y, a la derecha, las iniciales del responsable («—» si
//            nadie lo lleva).
//   Línea 2  nombre del servicio · cliente · comuna.
//   Línea 3  depende de la columna: en «Nuevo», por qué es nuevo; en «Esperando a otro», a quién
//            y hace cuántos días; en las demás, la próxima tarea con su fecha (en rojo si ya se
//            pasó) y cuántas más quedan.
//   Línea 4  las acciones según la columna (mover el servicio sin abrir la ficha), si hay.
import Link from "next/link";
import type { ServicioTableroItem, ServiciosTablero } from "@proges/contrato";
import { ChipEsperando } from "@/componentes/comunes/chip-esperando";
import { Fecha } from "@/componentes/comunes/fecha";
import { Tarjeta } from "@/componentes/ui/tarjeta";
import { ETIQUETA_TIPO_SERVICIO } from "@/lib/etiquetas";
import { cn } from "@/lib/utils";
import { AccionesDeTarjeta } from "./acciones-de-tarjeta";
import type { Persona } from "./tipos";

export type ColumnaDelTablero = keyof Omit<ServiciosTablero, "vista">;

// «Ana Pérez» → «AP»; «María José Soto» → «MS» (la primera y la última palabra).
function iniciales(nombre: string): string {
  const palabras = nombre.trim().split(/\s+/).filter(Boolean);
  const primera = palabras[0];
  if (!primera) return "?";
  const ultima = palabras.length > 1 ? palabras[palabras.length - 1] : "";
  return `${primera.charAt(0)}${ultima.charAt(0)}`.toUpperCase();
}

// El círculo con las iniciales. El nombre completo va en `title` (al pasar el mouse) y como
// etiqueta para lectores de pantalla, porque dos letras solas no dicen nada.
function Responsable({ responsable }: { responsable: ServicioTableroItem["responsable"] }) {
  const nombre = responsable?.nombre ?? "Sin responsable";
  return (
    <span
      role="img"
      aria-label={nombre}
      title={nombre}
      className={cn(
        "inline-flex size-[22px] shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold",
        responsable ? "bg-ink-soft text-ink" : "bg-line text-soft",
      )}
    >
      {responsable ? iniciales(responsable.nombre) : "—"}
    </span>
  );
}

// Por qué un servicio está en «Nuevo»; si son dos motivos, los dos. Un pedido del dueño sin
// aceptar no dice «falta responsable»: el responsable se elige al aceptarlo.
function motivosDeNuevo(s: ServicioTableroItem): string[] {
  const motivos: string[] = [];
  if (s.porRevisar) motivos.push("Pedido del dueño: aceptar o rechazar");
  if (s.porConfirmar) motivos.push("Por confirmar");
  if (!s.porRevisar && s.responsable === null) motivos.push("Falta responsable");
  return motivos;
}

function ProximoPaso({ servicio, columna }: { servicio: ServicioTableroItem; columna: ColumnaDelTablero }) {
  if (columna === "nuevo") {
    // Uno nuevo también puede estar esperando a alguien: se muestran las dos cosas.
    return (
      <>
        <span className="mt-1 text-xs font-semibold">{motivosDeNuevo(servicio).join(" · ")}</span>
        {servicio.esperando && <ChipEsperando esperando={servicio.esperando} className="mt-1" />}
      </>
    );
  }
  if (columna === "esperando" && servicio.esperando) {
    return <ChipEsperando esperando={servicio.esperando} className="mt-1" />;
  }
  const proxima = servicio.proximaTarea;
  if (!proxima) {
    // En «Por entregar» sí hubo tareas (todas hechas); en «Nos toca» todavía no hay ninguna.
    return (
      <span className="mt-1 text-xs text-soft">
        {columna === "porEntregar" ? "Todas las tareas están hechas" : "Sin tareas todavía"}
      </span>
    );
  }
  const otras = servicio.tareasPendientes - 1;
  return (
    <span className={cn("mt-1 text-xs break-words", proxima.atrasada && "text-bad")}>
      <span className="font-bold">{proxima.que}</span>
      {proxima.vence ? (
        <>
          {" · "}
          <Fecha valor={proxima.vence} className="font-semibold" />
          {proxima.atrasada ? <span className="sr-only"> (atrasada)</span> : null}
        </>
      ) : null}
      {otras > 0 ? <span className={cn("ml-1", !proxima.atrasada && "text-soft")}>+{otras}</span> : null}
    </span>
  );
}

export function TarjetaDeServicio({
  servicio,
  columna,
  personas,
}: {
  servicio: ServicioTableroItem;
  columna: ColumnaDelTablero;
  personas: Persona[];
}) {
  return (
    <Tarjeta tono="item" className="relative gap-1 bg-card hover:border-ink">
      <div className="flex items-start justify-between gap-2">
        {/* El foco se ve como un anillo alrededor de toda la tarjeta (el ::after que la cubre). */}
        <Link
          href={`/servicios/${servicio.id}`}
          className="rounded-[10px] text-[13px] font-bold break-words outline-none after:absolute after:inset-0 after:rounded-[10px] focus-visible:after:ring-2 focus-visible:after:ring-ink/40"
        >
          {ETIQUETA_TIPO_SERVICIO[servicio.tipo]} · {servicio.propiedad.direccion}
        </Link>
        <Responsable responsable={servicio.responsable} />
      </div>
      <span className="text-xs break-words text-soft">
        {servicio.nombre} · {servicio.cliente.nombre} · {servicio.propiedad.comuna}
      </span>
      <ProximoPaso servicio={servicio} columna={columna} />
      <AccionesDeTarjeta servicio={servicio} columna={columna} personas={personas} />
    </Tarjeta>
  );
}
