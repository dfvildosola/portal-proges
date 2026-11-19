"use client";

// El filtro «Cliente» de las listas del equipo. El equipo ve a todos los clientes juntos; este
// selector deja mirar solo uno. Es un cartel en la URL (`?cliente=<id>`): la página lo lee en el
// servidor y filtra con espaciosQueLee(). Los demás datos de la URL (el mes de la cobranza, por
// ejemplo) se conservan. El cliente nunca lo ve: la página no lo muestra si no es del equipo.

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TODOS = "todos";

export function FiltroCliente({
  clientes,
  actual,
}: {
  clientes: { id: string; nombre: string }[];
  actual: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const elegido = actual && clientes.some((c) => c.id === actual) ? actual : TODOS;
  const nombres: Record<string, string> = {
    [TODOS]: "Todos los clientes",
    ...Object.fromEntries(clientes.map((c) => [c.id, c.nombre])),
  };

  function elegir(valor: string | null) {
    if (!valor) return;
    const nuevos = new URLSearchParams(params.toString());
    if (valor === TODOS) nuevos.delete("cliente");
    else nuevos.set("cliente", valor);
    const texto = nuevos.toString();
    router.replace(texto ? `${pathname}?${texto}` : pathname);
  }

  return (
    <Select items={nombres} value={elegido} onValueChange={elegir}>
      <SelectTrigger size="sm" aria-label="Filtrar por cliente" className="w-48">
        <SelectValue />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false} align="end">
        <SelectItem value={TODOS}>Todos los clientes</SelectItem>
        {clientes.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            {c.nombre}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
