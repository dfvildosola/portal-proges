// Un servicio dentro del tablero, como en la maqueta: qué es, dónde, quién lo lleva y cuál es el
// próximo paso. Toda la tarjeta es un enlace a la ficha.
//   Línea 1  «Tipo · Dirección» en negrita y, a la derecha, las iniciales del responsable («—» si
//            nadie lo lleva).
//   Línea 2  nombre del servicio · cliente · comuna.
//   Línea 3  depende de la columna: en «Nuevo», por qué es nuevo; en «Esperando a otro», a quién
//            y hace cuántos días; en las demás, la próxima tarea con su fecha (en rojo si ya se
//            pasó) y cuántas más quedan.
import Link from "next/link";
import type { ServicioTableroItem, ServiciosTablero } from "@proges/contrato";
import { ChipEsperando } from "@/componentes/comunes/chip-esperando";
import { Fecha } from "@/componentes/comunes/fecha";
import { Tarjeta } from "@/componentes/ui/tarjeta";
import { ETIQUETA_TIPO_SERVICIO } from "@/lib/etiquetas";
import { cn } from "@/lib/utils";

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

export function TarjetaDeServicio({ servicio, columna }: { servicio: ServicioTableroItem; columna: ColumnaDelTablero }) {
  return (
    <Link
      href={`/servicios/${servicio.id}`}
      className="block min-w-0 rounded-[10px] focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:outline-none"
    >
      <Tarjeta tono="item" className="gap-1 bg-card hover:border-ink">
        <span className="flex items-start justify-between gap-2">
          <span className="text-[13px] font-bold break-words">
            {ETIQUETA_TIPO_SERVICIO[servicio.tipo]} · {servicio.propiedad.direccion}
          </span>
          <Responsable responsable={servicio.responsable} />
        </span>
        <span className="text-xs break-words text-soft">
          {servicio.nombre} · {servicio.cliente.nombre} · {servicio.propiedad.comuna}
        </span>
        <ProximoPaso servicio={servicio} columna={columna} />
      </Tarjeta>
    </Link>
  );
}
