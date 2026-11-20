// El tablero: los servicios abiertos según quién tiene la pelota. En el computador son cuatro
// columnas lado a lado; en el celular las mismas columnas se apilan como una lista agrupada (cada
// grupo con su título y su cuenta), porque cuatro columnas no caben en 390 px.
import type { ServicioTableroItem, ServiciosTablero } from "@proges/contrato";
import { Vacio } from "@/componentes/comunes/vacio";
import { TarjetaDeServicio, type ColumnaDelTablero } from "./tarjeta-de-servicio";
import type { Persona } from "./tipos";

type Columna = {
  clave: ColumnaDelTablero;
  titulo: string;
  ayuda: string;
  vacio: string;
};

const COLUMNAS: Columna[] = [
  {
    clave: "nuevo",
    titulo: "Nuevo",
    ayuda: "Falta confirmarlos o repartirlos",
    vacio: "No hay servicios por confirmar ni por repartir.",
  },
  {
    clave: "nosToca",
    titulo: "Nos toca",
    ayuda: "La pelota está de nuestro lado",
    vacio: "No hay servicios que nos toquen ahora.",
  },
  {
    clave: "esperando",
    titulo: "Esperando a otro",
    ayuda: "Los que llevan más días, primero",
    vacio: "No estamos esperando a nadie.",
  },
  {
    clave: "porEntregar",
    titulo: "Por entregar",
    ayuda: "Sin tareas pendientes: falta entregarlos",
    vacio: "No hay servicios por entregar.",
  },
];

// `personas` es el equipo: las tarjetas de «Nuevo» lo usan para elegir quién lleva el servicio.
export function TableroDeServicios({ tablero, personas }: { tablero: ServiciosTablero; personas: Persona[] }) {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-4 lg:items-start lg:gap-3">
      {COLUMNAS.map((columna) => {
        const servicios: ServicioTableroItem[] = tablero[columna.clave];
        return (
          <section key={columna.clave} aria-labelledby={`columna-${columna.clave}`} className="flex min-w-0 flex-col gap-2">
            <div>
              <h2 id={`columna-${columna.clave}`} className="flex items-center justify-between gap-2 text-xs font-bold tracking-[0.07em] text-soft uppercase">
                {columna.titulo}
                <span className="rounded-full bg-line px-2 py-0.5 text-[10.5px] text-soft">{servicios.length}</span>
              </h2>
              <p className="text-[11.5px] text-soft">{columna.ayuda}</p>
            </div>
            {servicios.length === 0 ? (
              <Vacio texto={columna.vacio} className="py-5" />
            ) : (
              <ul className="flex flex-col gap-2">
                {servicios.map((s) => (
                  <li key={s.id}>
                    <TarjetaDeServicio servicio={s} columna={columna.clave} personas={personas} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
