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

export type GrupoOpcion = {
  id: string;
  nombre: string;
  sociedades: { id: string; nombre: string }[];
};

export type UsuarioValores = {
  id: string;
  nombre: string;
  email: string;
  rol: "EQUIPO" | "CLIENTE";
  admin: boolean;
  activo: boolean;
  grupoId: string | null;
  alcance: "GRUPO" | "SOCIEDADES";
  sociedadIds: string[];
};

const ROLES = { EQUIPO: "Equipo Proges", CLIENTE: "Cliente" };
const ALCANCES = { GRUPO: "Todo el grupo", SOCIEDADES: "Solo algunas sociedades" };

export function UsuarioForm({
  usuario,
  grupos,
  esYo,
  onListo,
}: {
  usuario?: UsuarioValores;
  grupos: GrupoOpcion[];
  esYo: boolean; // el admin que se edita a sí mismo no puede quitarse el admin ni desactivarse
  onListo: () => void;
}) {
  const [state, formProps, pending] = useFormAction(guardarUsuario, {});
  const err = (f: string) => state?.fieldErrors?.[f];

  const [rol, setRol] = useState<string>(usuario?.rol ?? "EQUIPO");
  const [admin, setAdmin] = useState(usuario?.admin ?? false);
  const [activo, setActivo] = useState(usuario?.activo ?? true);
  const [grupoId, setGrupoId] = useState(usuario?.grupoId ?? "");
  const [alcance, setAlcance] = useState<string>(usuario?.alcance ?? "GRUPO");
  const [sociedadIds, setSociedadIds] = useState<string[]>(usuario?.sociedadIds ?? []);

  // Cuando el servidor confirma que guardó, se avisa al diálogo para que se cierre.
  const guardado = state?.ok === true;
  useEffect(() => {
    if (guardado) onListo();
  }, [guardado, onListo]);

  const grupo = grupos.find((g) => g.id === grupoId);
  const itemsGrupo = Object.fromEntries(grupos.map((g) => [g.id, g.nombre]));

  function cambiarGrupo(id: string) {
    setGrupoId(id);
    setSociedadIds([]); // las sociedades marcadas eran del grupo anterior
  }

  function marcarSociedad(id: string, marcada: boolean) {
    setSociedadIds((ids) => (marcada ? [...ids, id] : ids.filter((x) => x !== id)));
  }

  return (
    <form {...formProps} className="flex flex-col gap-4">
      {usuario && <input type="hidden" name="id" value={usuario.id} />}
      <input type="hidden" name="rol" value={rol} />
      {rol === "EQUIPO" && admin && <input type="hidden" name="admin" value="on" />}
      {usuario && activo && <input type="hidden" name="activo" value="on" />}
      {rol === "CLIENTE" && (
        <>
          <input type="hidden" name="grupoId" value={grupoId} />
          <input type="hidden" name="alcance" value={alcance} />
          {alcance === "SOCIEDADES" &&
            sociedadIds.map((id) => (
              <input key={id} type="hidden" name="sociedades" value={id} />
            ))}
        </>
      )}

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

      {rol === "EQUIPO" && (
        <div className="flex items-center gap-2">
          <Checkbox id="admin" checked={admin} onCheckedChange={setAdmin} disabled={esYo} />
          <Label htmlFor="admin">Admin (crea usuarios y edita las etapas)</Label>
        </div>
      )}

      {rol === "CLIENTE" && (
        <>
          <Field
            label="Grupo del cliente"
            error={err("grupoId")}
            hint={grupos.length === 0 ? "Todavía no hay grupos: créalos en Dueños." : undefined}
          >
            <Select
              items={itemsGrupo}
              value={grupoId || null}
              onValueChange={(v) => cambiarGrupo(v ?? "")}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Elige un grupo" />
              </SelectTrigger>
              <SelectContent>
                {grupos.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Qué ve">
            <Select items={ALCANCES} value={alcance} onValueChange={(v) => setAlcance(v ?? "GRUPO")}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GRUPO">{ALCANCES.GRUPO}</SelectItem>
                <SelectItem value="SOCIEDADES">{ALCANCES.SOCIEDADES}</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          {alcance === "SOCIEDADES" && (
            <Field label="Sociedades que puede ver" error={err("sociedades")}>
              {!grupo ? (
                <p className="text-sm text-muted-foreground">Elige primero el grupo.</p>
              ) : grupo.sociedades.length === 0 ? (
                <p className="text-sm text-muted-foreground">Ese grupo no tiene sociedades.</p>
              ) : (
                <div className="flex max-h-48 flex-col gap-2 overflow-y-auto rounded-lg border p-3">
                  {grupo.sociedades.map((s) => (
                    <div key={s.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`soc-${s.id}`}
                        checked={sociedadIds.includes(s.id)}
                        onCheckedChange={(v) => marcarSociedad(s.id, v)}
                      />
                      <Label htmlFor={`soc-${s.id}`}>{s.nombre}</Label>
                    </div>
                  ))}
                </div>
              )}
            </Field>
          )}
        </>
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
