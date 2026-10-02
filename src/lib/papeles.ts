// Papeles en regla de la ficha de propiedad. Funciones puras: reciben la propiedad
// y los documentos que la página ya cargó y dicen qué papeles hay, cuáles faltan y
// cuáles vencieron; no tocan la base.
//
// Un documento tiene dos datos distintos: su cajón (Document.tipo, donde se
// archiva) y su papel (Document.papel, qué documento concreto es). Acá solo
// importa el papel.
//
// Fechas: las del dominio se guardan a medianoche UTC; la antigüedad se calcula
// con las funciones de property-metrics, que trabajan en UTC.
import type {
  DocumentType,
  Papel,
  PropertyStatus,
  PropertyType,
} from "@/generated/prisma/enums";
import type { Document as DocumentoDB } from "@/generated/prisma/client";
import { papelLabels } from "@/lib/domain";
import { antiguedad, mesesDesde, type Chequeo } from "@/lib/property-metrics";

// En qué cajón (Document.tipo) se archiva cada papel.
export const PAPEL_CATEGORIA: Record<Papel, DocumentType> = {
  ESCRITURA: "ESCRITURA_TITULO",
  DOMINIO_VIGENTE: "ESCRITURA_TITULO",
  HIPOTECAS_GRAVAMENES: "ESCRITURA_TITULO",
  CERTIFICADO_AVALUO: "AVALUO_TASACION",
  PLANO: "MUNICIPAL",
  CIP: "MUNICIPAL",
  RECEPCION_FINAL: "MUNICIPAL",
  POLIZA_SEGURO: "SEGURO",
  PERMISO_EDIFICACION: "MUNICIPAL",
  CERTIFICADO_NUMERO: "MUNICIPAL",
  REGLAMENTO_COPROPIEDAD: "LEGAL_JUDICIAL",
  SUBDIVISION_SAG: "LEGAL_JUDICIAL",
  DERECHOS_AGUA: "ESCRITURA_TITULO",
  CONTRATO_ARRIENDO: "CONTRATO",
};

// ---------------------------------------------------------------------------
// Qué papeles pide cada propiedad
// ---------------------------------------------------------------------------

const CONSTRUIDAS: PropertyType[] = [
  "DEPARTAMENTO",
  "CASA",
  "OFICINA",
  "LOCAL",
  "BODEGA",
  "ESTACIONAMIENTO",
];
const CON_PERMISO: PropertyType[] = ["CASA", "LOCAL"];
const EN_COPROPIEDAD: PropertyType[] = [
  "DEPARTAMENTO",
  "OFICINA",
  "BODEGA",
  "ESTACIONAMIENTO",
];
const RURALES: PropertyType[] = ["PARCELA", "AGRICOLA"];

// Una regla por papel, en el orden del enum Papel. `aplica` dice si la propiedad
// lo necesita según su tipo y su estado.
const REGLAS: {
  papel: Papel;
  aplica: (tipo: PropertyType, estado: PropertyStatus) => boolean;
}[] = [
  { papel: "ESCRITURA", aplica: () => true },
  { papel: "DOMINIO_VIGENTE", aplica: () => true },
  { papel: "HIPOTECAS_GRAVAMENES", aplica: () => true },
  { papel: "CERTIFICADO_AVALUO", aplica: () => true },
  { papel: "PLANO", aplica: () => true },
  { papel: "CIP", aplica: () => true },
  { papel: "RECEPCION_FINAL", aplica: (tipo) => CONSTRUIDAS.includes(tipo) },
  { papel: "POLIZA_SEGURO", aplica: (tipo) => CONSTRUIDAS.includes(tipo) },
  { papel: "PERMISO_EDIFICACION", aplica: (tipo) => CON_PERMISO.includes(tipo) },
  { papel: "CERTIFICADO_NUMERO", aplica: (tipo) => CON_PERMISO.includes(tipo) },
  {
    papel: "REGLAMENTO_COPROPIEDAD",
    aplica: (tipo) => EN_COPROPIEDAD.includes(tipo),
  },
  { papel: "SUBDIVISION_SAG", aplica: (tipo) => RURALES.includes(tipo) },
  { papel: "DERECHOS_AGUA", aplica: (tipo) => RURALES.includes(tipo) },
  {
    papel: "CONTRATO_ARRIENDO",
    aplica: (_tipo, estado) => estado === "ARRENDADA",
  },
];

// Papeles que debe tener una propiedad según su tipo y estado, en el orden del
// enum Papel. Todas piden los seis básicos (escritura, dominio, hipotecas, avalúo,
// plano y CIP); el resto depende del tipo y, para el contrato de arriendo, del estado.
export function papelesRequeridos(
  tipo: PropertyType,
  estado: PropertyStatus,
): Papel[] {
  return REGLAS.filter((r) => r.aplica(tipo, estado)).map((r) => r.papel);
}

// ---------------------------------------------------------------------------
// Estado de cada papel
// ---------------------------------------------------------------------------

export type EstadoPapel = {
  papel: Papel;
  estado: "ok" | "falta" | "vencido";
  // El documento que representa a ese papel: el más reciente entre los vigentes
  // o, si todos vencieron, el más reciente de todos; null si falta.
  documento: {
    id: string;
    nombre: string;
    fechaEmision: Date | null;
    createdAt: Date;
    fechaVencimiento: Date | null;
  } | null;
  // «hace 8 meses», contado desde fechaEmision. null si falta el papel o si el
  // documento no tiene fechaEmision (la vista muestra entonces «subido el …»).
  antiguedad: string | null;
};

// Un documento está vigente si no tiene fechaVencimiento o si esta no es anterior
// a now (es la inversa de la regla de «documentos vencidos» de datosAlDia).
function estaVigente(
  d: Pick<DocumentoDB, "fechaVencimiento">,
  now: Date,
): boolean {
  return d.fechaVencimiento === null || d.fechaVencimiento >= now;
}

// El más reciente de una lista: por fechaEmision, o por createdAt si no la tiene.
// null si la lista está vacía.
function masReciente<T extends Pick<DocumentoDB, "fechaEmision" | "createdAt">>(
  docs: T[],
): T | null {
  let reciente: T | null = null;
  for (const d of docs) {
    if (
      reciente === null ||
      (d.fechaEmision ?? d.createdAt) >
        (reciente.fechaEmision ?? reciente.createdAt)
    ) {
      reciente = d;
    }
  }
  return reciente;
}

// Un EstadoPapel por cada papel requerido, en el mismo orden. Los usuarios guardan
// el historial (una póliza vieja vencida convive con la nueva), así que basta un
// documento vigente para que el papel esté «ok», y se muestra el más reciente entre
// los vigentes. Si todos sus documentos vencieron, el papel está «vencido» y se
// muestra el más reciente de todos. Sin documentos, «falta».
export function estadoPapeles({
  tipo,
  estado,
  documents,
  now,
}: {
  tipo: PropertyType;
  estado: PropertyStatus;
  documents: Pick<
    DocumentoDB,
    "id" | "nombre" | "papel" | "fechaEmision" | "createdAt" | "fechaVencimiento"
  >[];
  now: Date;
}): EstadoPapel[] {
  return papelesRequeridos(tipo, estado).map((papel) => {
    const delPapel = documents.filter((d) => d.papel === papel);
    const vigentes = delPapel.filter((d) => estaVigente(d, now));
    const vencido = vigentes.length === 0;
    const reciente = masReciente(vencido ? delPapel : vigentes);
    if (reciente === null) {
      return { papel, estado: "falta", documento: null, antiguedad: null };
    }

    return {
      papel,
      estado: vencido ? "vencido" : "ok",
      documento: {
        id: reciente.id,
        nombre: reciente.nombre,
        fechaEmision: reciente.fechaEmision,
        createdAt: reciente.createdAt,
        fechaVencimiento: reciente.fechaVencimiento,
      },
      antiguedad:
        reciente.fechaEmision === null
          ? null
          : antiguedad(mesesDesde(reciente.fechaEmision, now)),
    };
  });
}

// Los mismos documentos, menos los vencidos de un papel que ya tiene otro documento
// vigente: una póliza renovada deja de contar como vencida y la vieja queda solo
// como historial. Los documentos sin papel no se tocan.
export function sacarReemplazados<
  T extends Pick<DocumentoDB, "id" | "papel" | "fechaVencimiento">,
>(documents: T[], now: Date): T[] {
  const papelesVigentes = new Set(
    documents
      .filter((d) => d.papel !== null && estaVigente(d, now))
      .map((d) => d.papel),
  );
  return documents.filter(
    (d) =>
      d.papel === null || estaVigente(d, now) || !papelesVigentes.has(d.papel),
  );
}

// Chequeo «papeles» de la ficha: cuántos de los requeridos están cargados. Un
// papel vencido cuenta como presente: ya sale en la línea «documentos vencidos»
// de datosAlDia y no se marca dos veces. El texto se acorta según cuántos faltan:
// todos → «ninguno cargado»; más de 3 → los 3 primeros y «K más»; 1 a 3 → todos.
export function chequeoPapeles(estados: EstadoPapel[]): Chequeo {
  const total = estados.length;
  const faltantes = estados.filter((e) => e.estado === "falta");

  if (faltantes.length === 0) {
    return {
      clave: "papeles",
      texto: total === 0 ? "Papeles: ninguno requerido" : `Papeles: los ${total}`,
      estado: "ok",
    };
  }

  if (faltantes.length === total) {
    return {
      clave: "papeles",
      texto: `Papeles: ninguno cargado (faltan los ${total})`,
      estado: "falta",
    };
  }

  const nombres = faltantes.map((e) => papelLabels[e.papel]);
  const lista = new Intl.ListFormat("es", { type: "conjunction" }).format(
    nombres.length > 3
      ? [...nombres.slice(0, 3), `${nombres.length - 3} más`]
      : nombres,
  );
  const verbo = faltantes.length === 1 ? "falta" : "faltan";
  return {
    clave: "papeles",
    texto: `Papeles: ${total - faltantes.length} de ${total} (${verbo} ${lista})`,
    estado: "falta",
  };
}
