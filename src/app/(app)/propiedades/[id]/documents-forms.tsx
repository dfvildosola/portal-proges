"use client";

import { useActionState, useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { documentTypeLabels, enumOptions, papelLabels } from "@/lib/domain";
import type { DocumentType, Papel } from "@/generated/prisma/enums";
import { uploadDocument } from "../documents-actions";
import type { DocumentFormState } from "../documents-actions";

// Opciones del selector «¿Qué papel es?»: los 14 papeles en el orden del enum y,
// al final, «Otro documento» (el papel no está en la lista y se pide el cajón).
const OTRO = "OTRO";
const papelItems: Record<string, string> = {
  ...papelLabels,
  [OTRO]: "Otro documento",
};
type PapelElegido = Papel | typeof OTRO;

// Cuadro para subir un documento. El usuario elige qué papel es y el cajón (tipo)
// se llena solo en el servidor; con «Otro documento» se pide el cajón a mano.
// - papelInicial: abre el cuadro con ese papel ya elegido (botón de cada fila de
//   la lista de papeles).
// - compacto: el disparador es un botón chico «Subir» en vez de «Subir documento».
export function UploadDocumentDialog({
  propertyId,
  papelInicial,
  compacto = false,
}: {
  propertyId: string;
  papelInicial?: Papel;
  compacto?: boolean;
}) {
  const [open, setOpen] = useState(false);
  // null = nada elegido: el selector muestra «Elige el papel» y el servidor
  // rechaza el envío, así nadie sube algo mal etiquetado por no mirar.
  const [papel, setPapel] = useState<PapelElegido | null>(papelInicial ?? null);
  const [tipo, setTipo] = useState<DocumentType>("OTRO");
  // Close and reset right when the upload succeeds, inside the action itself.
  const [state, formAction, pending] = useActionState(
    async (prev: DocumentFormState, formData: FormData) => {
      const result = await uploadDocument(prev, formData);
      if (result.success) {
        setOpen(false);
        setPapel(papelInicial ?? null);
        setTipo("OTRO");
      }
      return result;
    },
    {} as DocumentFormState,
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          compacto ? (
            <Button size="xs" variant="outline" />
          ) : (
            <Button size="sm" />
          )
        }
      >
        {compacto ? (
          "Subir"
        ) : (
          <>
            <Upload className="size-3.5" />
            Subir documento
          </>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <form action={formAction}>
          <input type="hidden" name="propertyId" value={propertyId} />
          <input type="hidden" name="papel" value={papel ?? ""} />
          <input type="hidden" name="tipo" value={tipo} />
          <DialogHeader>
            <DialogTitle>
              {papel !== null && papel !== OTRO
                ? `Subir: ${papelLabels[papel]}`
                : "Subir documento"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex flex-col gap-1.5">
              <Label>¿Qué papel es?</Label>
              <Select
                items={papelItems}
                value={papel}
                onValueChange={(v) => setPapel(v as PapelElegido | null)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Elige el papel" />
                </SelectTrigger>
                <SelectContent>
                  {enumOptions(papelItems).map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {papel === OTRO && (
              <div className="flex flex-col gap-1.5">
                <Label>Categoría</Label>
                <Select
                  value={tipo}
                  onValueChange={(v) => setTipo(v as DocumentType)}
                >
                  <SelectTrigger className="w-full">
                    <span className="flex-1 text-left text-sm">
                      {documentTypeLabels[tipo]}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {enumOptions(documentTypeLabels).map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="doc-file">Archivo</Label>
              <Input
                id="doc-file"
                name="file"
                type="file"
                required
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx,.xls"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="doc-nombre">Nombre (opcional)</Label>
              <Input
                id="doc-nombre"
                name="nombre"
                placeholder="Si se omite, se usa el nombre del archivo"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="doc-emision">Fecha emisión</Label>
                <Input id="doc-emision" name="fechaEmision" type="date" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="doc-vencimiento">Fecha vencimiento</Label>
                <Input
                  id="doc-vencimiento"
                  name="fechaVencimiento"
                  type="date"
                />
              </div>
            </div>
            {state?.error && (
              <p className="text-sm text-destructive">{state.error}</p>
            )}
          </div>
          <DialogFooter>
            {/* Without a papel the server rejects it, and React would clear the chosen file. */}
            <Button type="submit" disabled={pending || papel === null}>
              {pending ? "Subiendo…" : "Subir"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
