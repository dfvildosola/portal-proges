// El panel del cliente: cifras de su cartera y una tarjeta por propiedad con sus
// servicios abiertos. Solo lectura. Los datos salen de src/lib/cliente.ts, que
// ya filtra por el alcance de quien entró.
import { Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { propiedadesDelCliente } from "@/lib/cliente";
import { exigirCliente } from "@/lib/sesion";
import { PropiedadTarjeta } from "./propiedad-tarjeta";

function Cifra({ titulo, valor }: { titulo: string; valor: number }) {
  return (
    <Card size="sm">
      <CardContent>
        <p className="text-xs text-muted-foreground">{titulo}</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight">{valor}</p>
      </CardContent>
    </Card>
  );
}

export default async function ClientePanelPage() {
  const usuario = await exigirCliente();
  const propiedades = await propiedadesDelCliente(usuario);

  const serviciosAbiertos = propiedades.reduce((suma, p) => suma + p.servicios.length, 0);
  const publicadas = propiedades.filter((p) => p.publicada).length;

  return (
    <>
      <PageHeader
        title="Tu cartera"
        description="Tus propiedades y los servicios que Proges tiene abiertos en cada una."
      />

      {propiedades.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Todavía no hay propiedades"
          description="Cuando Proges registre tus propiedades, van a aparecer acá."
        />
      ) : (
        <>
          <div className="mb-6 grid grid-cols-3 gap-3">
            <Cifra titulo="Propiedades" valor={propiedades.length} />
            <Cifra titulo="Servicios abiertos" valor={serviciosAbiertos} />
            <Cifra titulo="Publicadas" valor={publicadas} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {propiedades.map((p) => (
              <PropiedadTarjeta key={p.id} propiedad={p} />
            ))}
          </div>
        </>
      )}
    </>
  );
}
