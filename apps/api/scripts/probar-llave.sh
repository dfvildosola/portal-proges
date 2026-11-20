#!/usr/bin/env bash
# Prueba de punta a punta de una llave de la API de Proges, con curl.
#
# Uso:   apps/api/scripts/probar-llave.sh <dirección de la API> <llave>
# Ej.:   apps/api/scripts/probar-llave.sh http://localhost:3001 prg_…
#
# Hace cuatro cosas y cuenta en español qué pasó con cada una:
#   1. /v1/yo           comprueba que la llave sirve y de qué cliente es.
#   2. /v1/propiedades  lee las propiedades del cliente.
#   3. /v1/servicios    lee los servicios del cliente.
#   4. un borrado       intenta escribir: tiene que dar 403, porque una llave solo lee.
# Termina con código 0 si todo salió como se espera, y con 1 si algo falló.
#
# Necesita curl. Usa node (que ya está instalado donde se desarrolla Proges) solo para leer el
# JSON; si no está, igual hace las pruebas y muestra la respuesta tal cual.
#
# La llave es una clave: se manda solo en el encabezado y nunca se imprime completa.

set -u

if [ "$#" -ne 2 ]; then
  echo "Uso: $0 <dirección de la API> <llave>"
  echo "Ejemplo: $0 http://localhost:3001 prg_…"
  exit 2
fi

API="${1%/}"
LLAVE="$2"
fallas=0
cuerpo=$(mktemp)
trap 'rm -f "$cuerpo"' EXIT

if ! command -v curl >/dev/null 2>&1; then
  echo "Falta curl: instálalo para correr esta prueba."
  exit 2
fi

# Con node se lee un campo del JSON; sin node se devuelve vacío.
campo() {
  command -v node >/dev/null 2>&1 || return 0
  node -e '
    let t = ""; process.stdin.on("data", (d) => (t += d)).on("end", () => {
      try {
        let v = JSON.parse(t);
        for (const k of process.argv[1].split(".")) v = v == null ? v : v[k];
        console.log(v ?? "");
      } catch { console.log(""); }
    });' "$1" <"$cuerpo"
}

# Pide algo con la llave. Deja el código en $codigo y la respuesta en $cuerpo.
pedir() {
  codigo=$(curl -s -o "$cuerpo" -w '%{http_code}' -X "$1" "$API$2" -H "Authorization: Bearer $LLAVE" 2>/dev/null)
  [ -n "$codigo" ] || codigo=000
}

ok() { echo "  OK   $1"; }
mal() {
  echo "  FALLA $1"
  fallas=$((fallas + 1))
}

echo "Probando la llave ${LLAVE:0:8}… contra $API"
echo

echo "1. ¿La llave sirve? (GET /v1/yo)"
pedir GET /v1/yo
case "$codigo" in
  200) ok "La llave es válida y es del cliente «$(campo cliente.nombre)» (llave «$(campo llave.nombre)»)." ;;
  401) mal "401: la llave no existe, está mal copiada o fue revocada. Revisa que la pegaste entera (empieza con prg_)." ;;
  403) mal "403: la llave existe, pero su cliente está desactivado o no es de un cliente. Avisa a Proges." ;;
  000) mal "No hubo respuesta de $API. Revisa la dirección y que la API esté encendida." ;;
  *) mal "Respondió $codigo, y se esperaba 200. Respuesta: $(head -c 200 "$cuerpo")" ;;
esac
echo

# Si la llave no sirve o no hay API, lo demás no tiene sentido.
if [ "$fallas" -gt 0 ]; then
  echo "Se detiene aquí: sin una llave válida no se puede seguir."
  exit 1
fi

echo "2. ¿Lee sus propiedades? (GET /v1/propiedades)"
pedir GET "/v1/propiedades?porPagina=1"
if [ "$codigo" = 200 ]; then
  ok "Responde 200. El cliente tiene $(campo paginacion.total) propiedades."
else
  mal "Respondió $codigo, y se esperaba 200."
fi
echo

echo "3. ¿Lee sus servicios? (GET /v1/servicios?vista=lista)"
pedir GET "/v1/servicios?vista=lista&porPagina=1"
if [ "$codigo" = 200 ]; then
  ok "Responde 200. El cliente tiene $(campo paginacion.total) servicios visibles para él."
else
  mal "Respondió $codigo, y se esperaba 200."
fi
echo

echo "4. ¿Se niega a escribir? (DELETE /v1/propiedades/prueba-de-llave)"
# Una propiedad que no existe: si por error la llave pudiera escribir, no se borra nada real.
pedir DELETE /v1/propiedades/prueba-de-llave
case "$codigo" in
  403) ok "Responde 403, como debe: una llave solo lee y no puede crear, cambiar ni borrar nada." ;;
  2??) mal "Respondió $codigo: ¡la llave pudo escribir! Eso no debería pasar. Avisa a Proges de inmediato." ;;
  *) mal "Respondió $codigo, y se esperaba 403." ;;
esac
echo

if [ "$fallas" -eq 0 ]; then
  echo "Todo bien: la llave lee lo de su cliente y no puede escribir."
  exit 0
fi
echo "Hubo $fallas problema(s). Revisa los mensajes de arriba."
exit 1
