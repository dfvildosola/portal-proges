"use client";
// Los filtros del tablero: cliente, tipo y responsable. Elegir uno cambia la dirección
// (/servicios?tipo=OBRA) y la página se vuelve a pedir ya filtrada. Así el filtro se puede copiar
// y compartir, y «atrás» del navegador lo deshace.
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import type { ServicioTipo } from "@proges/contrato";
import { Select } from "@/componentes/ui/select";
import { ETIQUETA_TIPO_SERVICIO } from "@/lib/etiquetas";

export type OpcionDeFiltro = { id: string; nombre: string };

export function FiltrosDelTablero({
  clientes,
  personas,
}: {
  clientes: OpcionDeFiltro[];
  personas: OpcionDeFiltro[];
}) {
  const router = useRouter();
  const ruta = usePathname();
  const actuales = useSearchParams();
  const [pendiente, empezar] = useTransition();

  function elegir(campo: string, valor: string) {
    const siguientes = new URLSearchParams(actuales.toString());
    if (valor) siguientes.set(campo, valor);
    else siguientes.delete(campo);
    const texto = siguientes.toString();
    empezar(() => router.replace(texto ? `${ruta}?${texto}` : ruta));
  }

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:max-w-2xl" aria-busy={pendiente}>
      <label className="flex flex-col gap-1 text-xs font-bold">
        Cliente
        <Select value={actuales.get("cliente") ?? ""} onChange={(e) => elegir("cliente", e.target.value)}>
          <option value="">Todos</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </Select>
      </label>
      <label className="flex flex-col gap-1 text-xs font-bold">
        Tipo
        <Select value={actuales.get("tipo") ?? ""} onChange={(e) => elegir("tipo", e.target.value)}>
          <option value="">Todos</option>
          {(Object.keys(ETIQUETA_TIPO_SERVICIO) as ServicioTipo[]).map((t) => (
            <option key={t} value={t}>
              {ETIQUETA_TIPO_SERVICIO[t]}
            </option>
          ))}
        </Select>
      </label>
      <label className="flex flex-col gap-1 text-xs font-bold">
        Responsable
        <Select value={actuales.get("responsable") ?? ""} onChange={(e) => elegir("responsable", e.target.value)}>
          <option value="">Todos</option>
          <option value="sin">Sin responsable</option>
          {personas.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </Select>
      </label>
    </div>
  );
}
