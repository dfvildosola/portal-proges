"use client";
// Quitar una factura de la obra. La factura de Odoo no se toca: solo deja de estar asignada a
// esta obra y su monto vuelve a quedar disponible para asignarla a otra.
import { DialogoConfirmar } from "./dialogo-confirmar";
import { quitarFactura } from "./acciones";

export function QuitarFactura({ servicioId, facturaId }: { servicioId: string; facturaId: string }) {
  return (
    <DialogoConfirmar
      boton="Quitar"
      variante="fantasma"
      titulo="¿Quitar esta factura de la obra?"
      descripcion="Si es de Odoo, la factura sigue ahí: solo deja de estar asignada a esta obra. Si la anotaste a mano, se borra."
      textoConfirmar="Sí, quitar"
      varianteConfirmar="peligro"
      accion={() => quitarFactura(servicioId, facturaId)}
    />
  );
}
