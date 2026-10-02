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
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { documentTypeLabels, enumOptions } from "@/lib/domain";
import type { DocumentType } from "@/generated/prisma/enums";
import { uploadDocument } from "../documents-actions";
import type { DocumentFormState } from "../documents-actions";

export function UploadDocumentDialog({ propertyId }: { propertyId: string }) {
  const [open, setOpen] = useState(false);
  const [tipo, setTipo] = useState<DocumentType>("ESCRITURA_TITULO");
  // Close and reset right when the upload succeeds, inside the action itself.
  const [state, formAction, pending] = useActionState(
    async (prev: DocumentFormState, formData: FormData) => {
      const result = await uploadDocument(prev, formData);
      if (result.success) {
        setOpen(false);
        setTipo("ESCRITURA_TITULO");
      }
      return result;
    },
    {} as DocumentFormState,
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Upload className="size-3.5" />
        Subir documento
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <form action={formAction} encType="multipart/form-data">
          <input type="hidden" name="propertyId" value={propertyId} />
          <input type="hidden" name="tipo" value={tipo} />
          <DialogHeader>
            <DialogTitle>Subir documento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
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
            <Button type="submit" disabled={pending}>
              {pending ? "Subiendo…" : "Subir"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
