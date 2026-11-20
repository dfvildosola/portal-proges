// Lo que se ve mientras una pantalla del equipo carga sus datos.
export default function Cargando() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-live="polite">
      <div className="h-7 w-48 animate-pulse rounded-lg bg-line" />
      <div className="h-24 animate-pulse rounded-xl bg-line" />
      <div className="h-40 animate-pulse rounded-xl bg-line" />
      <p className="sr-only">Cargando…</p>
    </div>
  );
}
