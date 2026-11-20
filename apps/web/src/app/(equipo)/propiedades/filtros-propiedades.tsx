// Los filtros de la lista: buscar por dirección o rol, solo las que tienen algo en curso, cliente
// y comuna. Es un formulario de los que mandan los datos en la dirección (GET): al apretar
// «Filtrar» la página se recarga con `?q=…&cliente=…`. No necesita JavaScript en el navegador.
import Link from "next/link";
import { Boton } from "@/componentes/ui/boton";
import { CampoTexto } from "@/componentes/ui/campo-texto";
import { Select } from "@/componentes/ui/select";
import type { ClienteElegible } from "./clientes-para-elegir";

export type FiltrosDeLista = { q?: string; enCurso?: string; cliente?: string; comuna?: string };

export function FiltrosPropiedades({ filtros, clientes }: { filtros: FiltrosDeLista; clientes: ClienteElegible[] }) {
  const hayFiltro = Boolean(filtros.q || filtros.enCurso || filtros.cliente || filtros.comuna);
  return (
    <form method="get" action="/propiedades" className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[2fr_1.2fr_1.2fr_1fr_auto]">
      <CampoTexto type="search" name="q" defaultValue={filtros.q} placeholder="Buscar dirección o rol…" aria-label="Buscar por dirección o rol" />
      <Select name="enCurso" defaultValue={filtros.enCurso ?? ""} aria-label="Servicios en curso">
        <option value="">Todas</option>
        <option value="true">Con algo en curso</option>
        <option value="false">Sin nada en curso</option>
      </Select>
      <Select name="cliente" defaultValue={filtros.cliente ?? ""} aria-label="Cliente">
        <option value="">Todos los clientes</option>
        {clientes.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nombre}
          </option>
        ))}
      </Select>
      <CampoTexto name="comuna" defaultValue={filtros.comuna} placeholder="Comuna" aria-label="Comuna" />
      <div className="flex gap-2">
        <Boton type="submit" tamano="normal" className="flex-1">
          Filtrar
        </Boton>
        {hayFiltro && (
          <Link href="/propiedades" className="inline-flex min-h-11 items-center px-2 text-[13px] font-bold text-ink hover:underline lg:min-h-9">
            Limpiar
          </Link>
        )}
      </div>
    </form>
  );
}
