// Las cuatro cifras de arriba de Operación.

import { Card } from "@/components/ui/card";

function Cifra({
  titulo,
  valor,
  ayuda,
}: {
  titulo: string;
  valor: number;
  ayuda: string;
}) {
  return (
    <Card className="gap-1 px-4 py-4">
      <p className="text-sm text-muted-foreground">{titulo}</p>
      <p className="text-3xl font-semibold tabular-nums">{valor}</p>
      <p className="text-xs text-muted-foreground">{ayuda}</p>
    </Card>
  );
}

export function Cifras({
  abiertos,
  porConfirmar,
  sinResponsable,
  visitasSemana,
}: {
  abiertos: number;
  porConfirmar: number;
  sinResponsable: number;
  visitasSemana: number;
}) {
  return (
    <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Cifra titulo="Servicios abiertos" valor={abiertos} ayuda="En curso hoy" />
      <Cifra
        titulo="Por confirmar"
        valor={porConfirmar}
        ayuda="Deducidos de la carga inicial"
      />
      <Cifra
        titulo="Sin responsable"
        valor={sinResponsable}
        ayuda="Nadie los lleva todavía"
      />
      <Cifra
        titulo="Visitas de la semana"
        valor={visitasSemana}
        ayuda="Los últimos 7 días"
      />
    </div>
  );
}
