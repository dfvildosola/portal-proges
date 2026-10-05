import type { Prisma } from "@/generated/prisma/client";
import { rangoDelMes } from "./fechas";

// Contratos que deben tener cobro en ese mes.
export function whereCubreMes(mes: string): Prisma.LeaseContractWhereInput {
  const { inicio, fin } = rangoDelMes(mes);
  return {
    estado: "VIGENTE",
    fechaInicio: { lte: fin },
    fechaTermino: { gte: inicio },
  };
}
