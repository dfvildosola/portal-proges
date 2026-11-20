import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatMoney } from "@/lib/format";

// Piezas de presentación de /resumen (títulos, tarjetas, gráficos) y sus
// ayudantes de formato. Sin datos propios: reciben todo por props.

// Paleta para el gráfico de sociedades: variables del tema (globals.css), que
// cambian solas entre claro y oscuro.
export const DONUT_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
  "var(--chart-8)",
];

// Arma los datos de la dona: ordena de mayor a menor, asigna colores y agrupa la
// cola en "Otros" si hay más de `max` segmentos (para no saturar el gráfico).
export function toDonutItems(
  rows: { label: string; value: number }[],
  max = 8,
): { label: string; value: number; color: string }[] {
  const sorted = [...rows].filter((r) => r.value > 0).sort((a, b) => b.value - a.value);
  const top = sorted.slice(0, max).map((r, i) => ({
    ...r,
    color: DONUT_COLORS[i % DONUT_COLORS.length],
  }));
  const rest = sorted.slice(max);
  if (rest.length > 0) {
    top.push({
      label: "Otros",
      value: rest.reduce((s, r) => s + r.value, 0),
      color: "var(--chart-other)",
    });
  }
  return top;
}

export function formatPct(n: number, digits = 1): string {
  return `${new Intl.NumberFormat("es-CL", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n)}%`;
}

export function SectionTitle({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2 className={`mb-3 text-sm font-medium text-muted-foreground ${className}`}>
      {children}
    </h2>
  );
}

export function Metric({
  label,
  value,
  sub,
  icon: Icon,
  emphasis,
  href,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  emphasis?: "positive" | "negative";
  href?: string;
}) {
  const card = (
    <Card className={href ? "transition-colors hover:bg-muted/50" : ""}>
      <CardHeader>
        <CardDescription className="flex items-center justify-between">
          {label}
          <Icon className="size-4" />
        </CardDescription>
        <CardTitle
          className={`text-2xl font-semibold tabular-nums ${
            emphasis === "negative"
              ? "text-destructive"
              : emphasis === "positive"
                ? "text-success"
                : ""
          }`}
        >
          {value}
        </CardTitle>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </CardHeader>
    </Card>
  );
  return href ? (
    <Link href={href} className="block">
      {card}
    </Link>
  ) : (
    card
  );
}

export function Breakdown({
  title,
  items,
  total,
  emptyText = "Sin datos.",
}: {
  title: string;
  items: { label: string; value: number }[];
  total: number;
  emptyText?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          items.map((it) => {
            const pct = total > 0 ? (it.value / total) * 100 : 0;
            return (
              <div key={it.label} className="space-y-1">
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="truncate">{it.label}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {formatMoney(it.value, "CLP")} · {formatPct(pct, 0)}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.max(pct, 2)}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

// Gráfico de dona (SVG puro, sin dependencias) + leyenda. Reparte el patrimonio
// entre las sociedades de un grupo.
export function Donut({
  title,
  items,
}: {
  title: string;
  items: { label: string; value: number; color: string }[];
}) {
  const total = items.reduce((s, it) => s + it.value, 0) || 1;
  const r = 54;
  const stroke = 22;
  const C = 2 * Math.PI * r;

  // Precalcula longitud y desfase de cada arco (sin mutar en el render).
  const segments: { label: string; color: string; len: number; offset: number }[] =
    [];
  let acc = 0;
  for (const it of items) {
    const len = (it.value / total) * C;
    segments.push({ label: it.label, color: it.color, len, offset: acc });
    acc += len;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
        <svg
          width="140"
          height="140"
          viewBox="0 0 140 140"
          className="shrink-0"
          role="img"
          aria-label={title}
        >
          <g transform="translate(70,70) rotate(-90)">
            <circle
              r={r}
              fill="none"
              className="stroke-muted"
              strokeWidth={stroke}
            />
            {segments.map((s) => (
              <circle
                key={s.label}
                r={r}
                fill="none"
                style={{ stroke: s.color }}
                strokeWidth={stroke}
                strokeDasharray={`${s.len} ${C - s.len}`}
                strokeDashoffset={-s.offset}
              />
            ))}
          </g>
        </svg>
        <ul className="w-full space-y-2 text-sm">
          {items.map((it) => (
            <li key={it.label} className="flex items-center gap-2">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ background: it.color }}
              />
              <span className="flex-1 truncate">{it.label}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {formatMoney(it.value, "CLP")} ·{" "}
                {formatPct((it.value / total) * 100, 0)}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
