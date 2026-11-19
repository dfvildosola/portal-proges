"use client";

// Formulario de un usuario, para crear y para editar (con `usuario`, edita).
// Va dentro de un diálogo (usuario-dialogo.tsx).

import { useEffect, useState } from "react";
import { useFormAction } from "@/hooks/use-form-action";
import { Field } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { guardarUsuario } from "./equipo-actions";

export type UsuarioValores = {
  id: string;
  nombre: string;
  email: string;
  rol: "EQUIPO" | "CLIENTE";
  clienteId: string | null; // el cliente al que pertenece (solo si el rol es CLIENTE)
  admin: boolean;
  activo: boolean;
};

export type ClienteOpcion = { id: string; nombre: string; activa: boolean };

const ROLES = { EQUIPO: "Equipo Proges", CLIENTE: "Cliente" };

export function UsuarioForm({
  usuario,
  esYo,
  clientes,
  onListo,
}: {
  usuario?: UsuarioValores;
  esYo: boolean; // el admin que se edita a sí mismo no puede quitarse el admin ni desactivarse
  clientes: ClienteOpcion[];
  onListo: () => void;
}) {
  const [state, formProps, pending] = useFormAction(guardarUsuario, {});
  const err = (f: string) => state?.fieldErrors?.[f];

  const [rol, setRol] = useState<string>(usuario?.rol ?? "EQUIPO");
  const [clienteId, setClienteId] = useState<string>(usuario?.clienteId ?? "");
  const [admin, setAdmin] = useState(usuario?.admin ?? false);
  const [activo, setActivo] = useState(usuario?.activo ?? true);

  // Solo se ofrecen los clientes activos; si el usuario ya está en uno desactivado, ese también
  // aparece, para que se pueda guardar sin moverlo.
  const opciones = clientes.filter((c) => c.activa || c.id === usuario?.clienteId);
  const itemsClientes = Object.fromEntries(opciones.map((c) => [c.id, c.nombre]));

  // Cuando el servidor confirma que guardó, se avisa al diálogo para que se cierre.
  const guardado = state?.ok === true;
  useEffect(() => {
    if (guardado) onListo();
  }, [guardado, onListo]);

  return (
    <form {...formProps} className="flex flex-col gap-4">
      {usuario && <input type="hidden" name="id" value={usuario.id} />}
      <input type="hidden" name="rol" value={rol} />
      {rol === "CLIENTE" && <input type="hidden" name="clienteId" value={clienteId} />}
      {rol === "EQUIPO" && admin && <input type="hidden" name="admin" value="on" />}
      {usuario && activo && <input type="hidden" name="activo" value="on" />}

      <Field label="Nombre" htmlFor="nombre" error={err("nombre")}>
        <Input id="nombre" name="nombre" defaultValue={usuario?.nombre} placeholder="Ana Pérez" />
      </Field>

      <Field label="Correo" htmlFor="email" error={err("email")} hint="Con este correo entra al portal.">
        <Input
          id="email"
          name="email"
          type="email"
          defaultValue={usuario?.email}
          placeholder="ana@progesspa.cl"
        />
      </Field>

      <Field label="Rol" error={err("rol")}>
        <Select
          items={ROLES}
          value={rol}
          onValueChange={(v) => {
            setRol(v ?? "EQUIPO");
            if (v === "CLIENTE") setAdmin(false);
          }}
          disabled={esYo}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="EQUIPO">{ROLES.EQUIPO}</SelectItem>
            <SelectItem value="CLIENTE">{ROLES.CLIENTE}</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      {rol === "CLIENTE" && (
        <Field
          label="Cliente"
          error={err("clienteId")}
          hint={
            opciones.length === 0
              ? "Primero crea un cliente en el bloque «Clientes»."
              : "El espacio al que pertenece: solo verá la cartera de este cliente."
          }
        >
          <Select
            items={itemsClientes}
            value={clienteId || null}
            onValueChange={(v) => setClienteId(v ?? "")}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Elige el cliente" />
            </SelectTrigger>
            <SelectContent>
              {opciones.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}

      {rol === "EQUIPO" && (
        <div className="flex items-center gap-2">
          <Checkbox id="admin" checked={admin} onCheckedChange={setAdmin} disabled={esYo} />
          <Label htmlFor="admin">Admin (crea usuarios y edita las etapas)</Label>
        </div>
      )}

      {usuario && (
        <div className="flex items-center gap-2">
          <Checkbox id="activo" checked={activo} onCheckedChange={setActivo} disabled={esYo} />
          <Label htmlFor="activo">Activo (si se desmarca, ya no puede entrar)</Label>
        </div>
      )}

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Guardando…" : usuario ? "Guardar cambios" : "Crear usuario"}
      </Button>
    </form>
  );
}
