"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL = "__all__";

// Selector del resumen: "Toda la cartera", un grupo económico (consolida todas
// sus entidades) o una entidad individual. El valor va prefijado: `grupo:<id>`
// o `owner:<id>`, y se navega a /resumen?sel=...
export function OwnerFilter({
  grupos,
  owners,
  value,
}: {
  grupos: { id: string; nombre: string }[];
  owners: { id: string; nombre: string }[];
  value: string | null;
}) {
  const router = useRouter();
  const params = useSearchParams();

  // Cambia solo la selección: el filtro de cliente (?cliente=) se conserva.
  function onChange(next: string | null) {
    const nuevos = new URLSearchParams(params.toString());
    if (!next || next === ALL) nuevos.delete("sel");
    else nuevos.set("sel", next);
    const texto = nuevos.toString();
    router.push(texto ? `/resumen?${texto}` : "/resumen");
  }

  // Mapa valor→etiqueta para que el trigger muestre el nombre (no el id).
  const items: Record<string, string> = { [ALL]: "Toda la cartera" };
  for (const g of grupos) items[`grupo:${g.id}`] = `${g.nombre} (grupo)`;
  for (const o of owners) items[`owner:${o.id}`] = o.nombre;

  return (
    <Select items={items} value={value ?? ALL} onValueChange={onChange}>
      <SelectTrigger className="w-64">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>Toda la cartera</SelectItem>
        {grupos.length > 0 && (
          <SelectGroup>
            <SelectLabel>Grupos económicos</SelectLabel>
            {grupos.map((g) => (
              <SelectItem key={g.id} value={`grupo:${g.id}`}>
                {g.nombre}
              </SelectItem>
            ))}
          </SelectGroup>
        )}
        <SelectGroup>
          <SelectLabel>Entidades</SelectLabel>
          {owners.map((o) => (
            <SelectItem key={o.id} value={`owner:${o.id}`}>
              {o.nombre}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
