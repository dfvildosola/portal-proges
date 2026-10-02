import { ExternalLink } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Mapa de la ubicación: Google Maps incrustado sin clave (ADR 0002). La dirección
// de `output=embed` no es oficial: si un día sale en blanco, se cambia por la
// Maps Embed API con clave.
export function PropertyMap({
  direccion,
  comuna,
}: {
  direccion: string;
  comuna: string;
}) {
  const consulta = encodeURIComponent(`${direccion}, ${comuna}, Chile`);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Ubicación</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <iframe
          src={`https://www.google.com/maps?q=${consulta}&output=embed`}
          title={`Mapa de ${direccion}, ${comuna}`}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="h-64 w-full rounded-lg border-0"
        />
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${consulta}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          Abrir en Google Maps
          <ExternalLink className="size-3.5" />
        </a>
      </CardContent>
    </Card>
  );
}
