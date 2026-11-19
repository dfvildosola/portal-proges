// Filtros de Operación: dos filas de botones que cambian la dirección
// (`?tipo=VENTA&responsable=sin`). El filtro vive en la URL, así que se puede
// copiar el enlace y compartirlo; la página lo lee en el servidor.

import Link from "next/link";
import type { ServicioTipo } from "@/generated/prisma/enums";
import { TIPOS_SERVICIO } from "@/lib/servicios";
import { Button } from "@/components/ui/button";

export type Filtro = {
  tipo: ServicioTipo | null;
  // Un id de usuario, «sin» (sin responsable) o null (todos).
  responsable: string | null;
};

export const SIN_RESPONSABLE = "sin";

function enlace(filtro: Filtro): string {
  const partes = new URLSearchParams();
  if (filtro.tipo) partes.set("tipo", filtro.tipo);
  if (filtro.responsable) partes.set("responsable", filtro.responsable);
  const texto = partes.toString();
  return texto ? `/operacion?${texto}` : "/operacion";
}

function Opcion({
  activo,
  href,
  children,
}: {
  activo: boolean;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Button
      size="sm"
      variant={activo ? "default" : "outline"}
      nativeButton={false}
      render={<Link href={href} aria-current={activo ? "true" : undefined} />}
    >
      {children}
    </Button>
  );
}

export function Filtros({
  filtro,
  responsables,
}: {
  filtro: Filtro;
  responsables: { id: string; nombre: string }[];
}) {
  return (
    <div className="mb-6 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="w-24 text-sm text-muted-foreground">Tipo</span>
        <Opcion activo={filtro.tipo === null} href={enlace({ ...filtro, tipo: null })}>
          Todos
        </Opcion>
        {(Object.keys(TIPOS_SERVICIO) as ServicioTipo[]).map((tipo) => (
          <Opcion
            key={tipo}
            activo={filtro.tipo === tipo}
            href={enlace({ ...filtro, tipo })}
          >
            {TIPOS_SERVICIO[tipo].nombre}
          </Opcion>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="w-24 text-sm text-muted-foreground">Responsable</span>
        <Opcion
          activo={filtro.responsable === null}
          href={enlace({ ...filtro, responsable: null })}
        >
          Todos
        </Opcion>
        {responsables.map((r) => (
          <Opcion
            key={r.id}
            activo={filtro.responsable === r.id}
            href={enlace({ ...filtro, responsable: r.id })}
          >
            {r.nombre}
          </Opcion>
        ))}
        <Opcion
          activo={filtro.responsable === SIN_RESPONSABLE}
          href={enlace({ ...filtro, responsable: SIN_RESPONSABLE })}
        >
          Sin responsable
        </Opcion>
      </div>
    </div>
  );
}
