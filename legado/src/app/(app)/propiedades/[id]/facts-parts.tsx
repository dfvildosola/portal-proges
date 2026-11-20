import { X } from "lucide-react";

// Piezas de la tarjeta «Datos de la propiedad» (facts-card.tsx).

// Sección de la tarjeta: título, contenido y, si corresponde, su botón «+ Agregar».
export function Seccion({
  titulo,
  extra,
  children,
}: {
  titulo: string;
  extra?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 border-t px-4 py-4 first:border-t-0 first:pt-0 last:pb-0">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold">{titulo}</h3>
        {extra}
      </div>
      {children}
    </section>
  );
}

// Botón «X» que quita un elemento: un formulario con sus campos ocultos.
export function Quitar({
  action,
  campos,
  label,
  className = "size-4",
}: {
  action: (formData: FormData) => void | Promise<void>;
  campos: Record<string, string>;
  label: string;
  className?: string;
}) {
  return (
    <form action={action} className="inline-flex">
      {Object.entries(campos).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <button
        type="submit"
        aria-label={label}
        className="text-muted-foreground transition-colors hover:text-destructive"
      >
        <X className={className} />
      </button>
    </form>
  );
}

// Lista con borde: cada fila lleva su texto a la izquierda y, a la derecha, el
// botón de quitar (y lo que se pase). Si no hay filas, muestra `vacio`.
export function Lista({
  vacio,
  filas,
}: {
  vacio: string;
  filas: { key: string; texto: React.ReactNode; derecha: React.ReactNode }[];
}) {
  if (filas.length === 0) {
    return <p className="text-sm text-muted-foreground">{vacio}</p>;
  }
  return (
    <div className="divide-y rounded-lg border">
      {filas.map((f) => (
        <div
          key={f.key}
          className="flex items-center justify-between px-3 py-2.5"
        >
          <div>{f.texto}</div>
          <div className="flex items-center gap-3">{f.derecha}</div>
        </div>
      ))}
    </div>
  );
}

export const sub = "ml-2 text-xs text-muted-foreground";
