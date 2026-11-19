"use client";

// Botón + diálogo «Agregar maestro»: se busca al proveedor en Odoo, se elige y se le pone su
// especialidad y teléfono. El diálogo solo monta el formulario mientras está abierto, así cada
// vez parte limpio.

import { useCallback, useEffect, useState, useTransition } from "react";
import { Plus, Search } from "lucide-react";
import { useFormAction } from "@/hooks/use-form-action";
import { Field } from "@/components/field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  agregarMaestro,
  buscarProveedoresOdoo,
  type BusquedaProveedores,
  type MaestroFormState,
  type ProveedorEncontrado,
} from "./maestros-actions";

function AgregarForm({ onListo }: { onListo: () => void }) {
  const [texto, setTexto] = useState("");
  const [busqueda, setBusqueda] = useState<BusquedaProveedores | null>(null);
  const [elegido, setElegido] = useState<ProveedorEncontrado | null>(null);
  const [buscando, empezarBusqueda] = useTransition();

  const [state, formProps, pending] = useFormAction(agregarMaestro, {} as MaestroFormState);
  const err = (f: string) => state?.fieldErrors?.[f];

  const guardado = state?.ok === true;
  useEffect(() => {
    if (guardado) onListo();
  }, [guardado, onListo]);

  // Buscar es solo leer Odoo: no guarda nada, por eso no usa useFormAction.
  function buscar(e: React.FormEvent) {
    e.preventDefault();
    empezarBusqueda(async () => {
      setElegido(null);
      setBusqueda(await buscarProveedoresOdoo(texto));
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={buscar} className="flex items-end gap-2">
        <Field label="Nombre en Odoo" htmlFor="maestro-buscar" className="flex-1">
          <Input
            id="maestro-buscar"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Ej. diseño espacios"
          />
        </Field>
        <Button type="submit" variant="outline" disabled={buscando}>
          <Search className="size-4" />
          {buscando ? "Buscando…" : "Buscar"}
        </Button>
      </form>

      {busqueda?.error && <p className="text-sm text-destructive">{busqueda.error}</p>}

      {busqueda?.proveedores && busqueda.proveedores.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Odoo no tiene ningún proveedor con ese nombre. Si es nuevo, créalo primero en Odoo.
        </p>
      )}

      {busqueda?.proveedores && busqueda.proveedores.length > 0 && (
        <ul className="max-h-56 divide-y overflow-y-auto rounded-lg border">
          {busqueda.proveedores.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                disabled={p.yaAgregado}
                onClick={() => setElegido(p)}
                className={
                  "flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60 " +
                  (elegido?.id === p.id ? "bg-muted" : "")
                }
              >
                <span className="font-medium">{p.nombre}</span>
                <span className="text-xs text-muted-foreground">
                  {[p.rut, `${p.facturas} facturas de proveedor`].filter(Boolean).join(" · ")}
                </span>
                {p.yaAgregado && <Badge variant="outline">Ya es maestro</Badge>}
              </button>
            </li>
          ))}
        </ul>
      )}

      {elegido && (
        <form key={elegido.id} {...formProps} className="flex flex-col gap-4 border-t pt-4">
          <input type="hidden" name="odooPartnerId" value={elegido.id} />
          <input type="hidden" name="buscado" value={texto} />
          <p className="text-sm">
            Agregar a <span className="font-medium">{elegido.nombre}</span>
          </p>
          <Field
            label="Especialidad"
            htmlFor="maestro-especialidad"
            error={err("especialidad")}
            hint="Por ejemplo: gasfitería, pintura, electricidad."
          >
            <Input id="maestro-especialidad" name="especialidad" />
          </Field>
          <Field label="Teléfono" htmlFor="maestro-telefono" error={err("telefono")}>
            <Input
              id="maestro-telefono"
              name="telefono"
              type="tel"
              defaultValue={elegido.telefono ?? ""}
            />
          </Field>
          {err("odooPartnerId") && <p className="text-xs text-destructive">{err("odooPartnerId")}</p>}
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          <Button type="submit" disabled={pending}>
            {pending ? "Guardando…" : "Agregar maestro"}
          </Button>
        </form>
      )}
    </div>
  );
}

export function MaestroAgregar() {
  const [abierto, setAbierto] = useState(false);
  const cerrar = useCallback(() => setAbierto(false), []);

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger render={<Button />}>
        <Plus className="size-4" />
        Agregar maestro
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Agregar maestro</DialogTitle>
          <DialogDescription>
            Un maestro es un proveedor que ya existe en Odoo. Búscalo por nombre.
          </DialogDescription>
        </DialogHeader>
        <AgregarForm onListo={cerrar} />
      </DialogContent>
    </Dialog>
  );
}
