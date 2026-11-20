// Lo que se ve cuando una dirección no existe, o la API respondió 404 (que para quien pregunta es
// lo mismo que «no es tuyo»).
import Link from "next/link";
import { estiloBoton } from "@/componentes/ui/boton";

export default function NoEncontrado() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 py-10 text-center">
      <h1 className="text-2xl font-extrabold tracking-tight">No se encontró lo que buscas</h1>
      <p className="max-w-sm text-sm text-soft">Puede que ya no exista o que no tengas permiso para verlo.</p>
      <Link href="/" className={estiloBoton()}>
        Ir al inicio
      </Link>
    </main>
  );
}
