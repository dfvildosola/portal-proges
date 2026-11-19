// El detalle de una propiedad del cliente. Si la propiedad no existe o no está
// en su alcance, `propiedadDelCliente` devuelve null y la respuesta es la misma
// «no encontrada»: así nadie puede adivinar qué direcciones existen.
import { notFound } from "next/navigation";
import { BackLink } from "@/components/back-link";
import { EmptyState } from "@/components/empty-state";
import { ClipboardList } from "lucide-react";
import { propiedadDelCliente } from "@/lib/cliente";
import { propertyTypeLabels } from "@/lib/domain";
import { exigirCliente } from "@/lib/sesion";
import { ServicioSeccion } from "./servicio-seccion";

export default async function ClientePropiedadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const usuario = await exigirCliente();
  const propiedad = await propiedadDelCliente(usuario, id);
  if (!propiedad) notFound();

  return (
    <>
      <BackLink href="/cliente">Tu cartera</BackLink>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight break-words">
          {propiedad.direccion}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {propertyTypeLabels[propiedad.tipo]} · {propiedad.comuna}, {propiedad.region}
        </p>
      </div>

      {propiedad.servicios.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Sin servicios"
          description="Proges todavía no tiene servicios abiertos ni terminados en esta propiedad."
        />
      ) : (
        <div className="space-y-6">
          {propiedad.servicios.map((s) => (
            <ServicioSeccion key={s.id} servicio={s} />
          ))}
        </div>
      )}
    </>
  );
}
