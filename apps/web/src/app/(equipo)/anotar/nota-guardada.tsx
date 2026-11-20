// Lo que se ve cuando la nota quedó guardada: la confirmación, el aviso de la API si alguna foto
// no subió del todo (la nota ya está guardada: no es un error) y los dos caminos de siempre.
import { CircleCheck } from "lucide-react";
import Link from "next/link";
import { Boton, estiloBoton } from "@/componentes/ui/boton";

export function NotaGuardada({
  donde,
  servicioId,
  aviso,
  alAnotarOtra,
}: {
  donde: string;
  servicioId: string;
  aviso: string | null;
  alAnotarOtra: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-line bg-card px-4 py-8 text-center">
      <CircleCheck className="size-12 text-ok" aria-hidden />
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-extrabold">Nota guardada</h2>
        <p className="text-sm text-soft">Quedó en la bitácora de {donde}.</p>
      </div>
      {aviso && <p className="rounded-[10px] bg-warn-soft px-3 py-2 text-sm font-semibold text-warn">{aviso}</p>}
      <div className="flex w-full flex-col gap-2">
        <Boton onClick={alAnotarOtra}>Anotar otra</Boton>
        <Link href={`/servicios/${servicioId}`} className={estiloBoton({ variante: "contorno" })}>
          Ver el servicio
        </Link>
        <Link href="/hoy" className={estiloBoton({ variante: "fantasma" })}>
          Volver a Hoy
        </Link>
      </div>
    </div>
  );
}
