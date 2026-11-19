"use client";

// El campo «Cliente» de un formulario de creación, solo para el equipo: al crear una propiedad,
// un contacto o un dueño hay que decir de qué cliente es. El cliente (el dueño) no ve este
// campo: crea siempre en lo suyo. El servidor vuelve a comprobar el valor (espacioParaCrear).

import { Field } from "@/components/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function CampoCliente({
  clientes,
  error,
  className,
}: {
  clientes: { id: string; nombre: string }[];
  error?: string;
  className?: string;
}) {
  const nombres = Object.fromEntries(clientes.map((c) => [c.id, c.nombre]));
  return (
    <Field label="Cliente" error={error} className={className} hint="De quién es esto. No se puede cambiar después.">
      <Select name="clienteId" items={nombres}>
        <SelectTrigger aria-label="Cliente">
          <SelectValue placeholder="Elige el cliente" />
        </SelectTrigger>
        <SelectContent>
          {clientes.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.nombre}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}
