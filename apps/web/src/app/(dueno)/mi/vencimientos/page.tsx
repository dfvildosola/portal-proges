// Vencimientos del dueño autónomo: lo que vence, falta o está atrasado en su cartera (contratos que
// terminan, arriendos sin cobrar, contribuciones y cuentas, documentos), de lo más grave a lo más
// lejano. Cada uno trae su botón «Que Proges lo haga». La API arma y ordena la agenda; aquí se
// reordena por gravedad y se puede filtrar por clase.
import Link from "next/link";
import { redirect } from "next/navigation";
import type { VencimientosRespuesta } from "@proges/contrato";
import { EncabezadoDePagina } from "@/componentes/comunes/encabezado-de-pagina";
import { Vacio } from "@/componentes/comunes/vacio";
import { FilaVencimiento } from "@/componentes/dueno/autonomo/fila-vencimiento";
import { ETIQUETA_CATEGORIA, type CategoriaDeVencimiento } from "@/componentes/dueno/autonomo/etiquetas";
import { categoriaDe, ordenarPorGravedadYFecha } from "@/componentes/dueno/autonomo/orden-vencimientos";
import { Tarjeta } from "@/componentes/ui/tarjeta";
import { pedir, yo } from "@/lib/api";
import { cn } from "@/lib/utils";

export const metadata = { title: "Vencimientos" };

const CATEGORIAS = Object.keys(ETIQUETA_CATEGORIA) as CategoriaDeVencimiento[];

function Cuenta({ numero, texto, alerta = false }: { numero: number; texto: string; alerta?: boolean }) {
  return (
    <Tarjeta className="gap-0">
      <span className={cn("text-xl font-extrabold tracking-tight", alerta && numero > 0 && "text-bad")}>{numero}</span>
      <span className="text-xs text-soft">{texto}</span>
    </Tarjeta>
  );
}

export default async function Vencimientos({ searchParams }: { searchParams: Promise<{ clase?: string }> }) {
  const quien = await yo();
  // Esta pantalla es del dueño que lleva su cartera; el cliente atendido no la tiene en su menú.
  if (quien.cliente?.modo !== "AUTONOMO") redirect("/mi");

  const { clase } = await searchParams;
  const elegida = CATEGORIAS.find((c) => c === clase);
  const { items, resumen } = await pedir<VencimientosRespuesta>("/v1/vencimientos");
  const visibles = ordenarPorGravedadYFecha(items).filter((i) => !elegida || categoriaDe(i) === elegida);

  return (
    <div className="flex flex-col gap-5">
      <EncabezadoDePagina
        titulo="Vencimientos"
        subtitulo="Contratos, arriendos, contribuciones, cuentas y documentos: lo atrasado primero. Si prefieres no hacerlo tú, Proges lo hace."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Cuenta numero={resumen.atrasados} texto="atrasados" alerta />
        <Cuenta numero={resumen.estaSemana} texto="esta semana" />
        <Cuenta numero={resumen.esteMes} texto="este mes" />
        <Cuenta numero={resumen.proximos} texto="más adelante" />
      </div>

      <nav aria-label="Filtrar por clase" className="flex flex-wrap gap-2">
        {[undefined, ...CATEGORIAS].map((c) => {
          const activa = c === elegida;
          return (
            <Link
              key={c ?? "todos"}
              href={c ? `/mi/vencimientos?clase=${c}` : "/mi/vencimientos"}
              aria-current={activa ? "page" : undefined}
              className={cn(
                "inline-flex min-h-9 items-center rounded-full border px-3 text-xs font-bold transition-colors",
                activa ? "border-ink bg-ink text-card" : "border-line text-soft hover:text-fg",
              )}
            >
              {c ? ETIQUETA_CATEGORIA[c] : "Todos"}
            </Link>
          );
        })}
      </nav>

      {visibles.length === 0 ? (
        <Vacio texto={elegida ? "No hay nada de esta clase por vencer." : "No tienes nada por vencer ni atrasado. Todo al día."} />
      ) : (
        <div className="flex flex-col gap-2">
          {visibles.map((item) => (
            <FilaVencimiento key={item.clave} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
