# La API de Proges, para el sistema de un cliente

Esta guía es para el área de sistemas de un cliente de Proges (por ejemplo, NPL). No hace falta conocer Proges por dentro: con una llave y unas pocas consultas se pueden leer las propiedades de su cartera y el avance de los servicios que Proges les presta.

## Qué es y para qué sirve

Proges le lleva a un cliente la ficha de cada propiedad (documentos, historial, reparaciones), los servicios que le presta (obras, inspecciones, ventas, arriendos) y los avisos de lo que hay que hacer. Los dueños lo ven en el portal. La API entrega **lo mismo**, pero para que lo lea el sistema del cliente: su propia plataforma, un reporte, una planilla que se actualiza sola.

Piensa en una ventanilla con un guardia en la puerta: el guardia no pregunta quién eres, mira tu **llave**. La llave es de un cliente y solo abre lo de ese cliente. Con ella se puede **mirar**, nunca cambiar.

## Cómo conseguir una llave

1. Pídesela al administrador de Proges. La crea en el portal, en **Configuración → Llaves de la API**, eligiendo el cliente y un nombre que explique para qué sistema es («Sistema de reportes de NPL»).
2. La llave completa **se muestra una sola vez**, al crearla. Proges no la guarda: solo guarda una huella para reconocerla cuando llega. Si se pierde, no hay cómo recuperarla: se revoca y se crea otra.
3. Empieza con `prg_`, seguido de 43 letras y números (`prg_` + 43 caracteres). Guárdala como un secreto, igual que una clave: en el gestor de secretos o en las variables de entorno de tu sistema, nunca escrita en el código, en un correo ni en un chat. Quien la tenga puede leer toda la información del cliente.
4. Si sospechas que se filtró, avisa a Proges: el administrador la **revoca** en el mismo lugar y deja de servir al instante (lo mismo cuando un sistema se da de baja). Después se crea una nueva. No tiene fecha de vencimiento: sirve hasta que se revoca.

## Cómo consultar

Todas las consultas son `GET` a la dirección base que te entregue Proges, empiezan con `/v1` y llevan la llave en el encabezado `Authorization`:

```
Authorization: Bearer prg_…
```

Para que los ejemplos de abajo se puedan copiar y pegar, primero guarda la dirección y la llave en dos variables de tu terminal:

```bash
export PROGES_API="<la dirección base que te dio Proges>"
export PROGES_LLAVE="prg_…"
```

Lo primero es comprobar que la llave funciona y de qué cliente es:

```bash
curl -s "$PROGES_API/v1/yo" -H "Authorization: Bearer $PROGES_LLAVE"
```

```json
{
  "tipo": "llave",
  "llave": { "id": "cmw…", "nombre": "Sistema de reportes de NPL" },
  "cliente": { "id": "org_npl", "nombre": "NPL", "modo": "ATENDIDO" }
}
```

Todas las respuestas son JSON. Las listas vienen paginadas: `?pagina=1&porPagina=50` (hasta 100 por página) y la respuesta trae `paginacion: { pagina, porPagina, total }`. La plata viene como `{ "valor": "1500000", "moneda": "CLP" }` (el valor es texto, para no perder decimales; la moneda es CLP o UF) y las fechas sin hora como `"2026-11-19"`.

## Qué puede leer una llave

La llave ve las propiedades y los servicios **de su cliente**, recortados igual que lo ve el dueño en el portal:

- Sí ve: los datos de cada propiedad, sus documentos, su historial, lo que se le cobró en reparaciones, el avance de cada servicio y a quién espera Proges (conservador, notaría, municipalidad, maestro, dueño, banco u otro), las notas que el equipo marcó para el dueño, el reporte de una venta (precio, visitas, consultas y las ofertas que Proges ya le mostró al dueño) y lo que hay por vencer.
- No ve: lo que le cuesta a Proges (costos y presupuestos de los maestros, facturas, márgenes), las notas internas, las tareas del equipo, los nombres de los interesados en una venta, ni **nada de otro cliente**.
- Tampoco entra a lo interno de Proges (el equipo, los maestros, las otras llaves, los resultados): responde 403.

Si lo que necesitas no está en esta lista, pídeselo a Proges: la información que sale hacia afuera se decide con cuidado y no se amplía sola.

### Las consultas más útiles

Sus propiedades (con cuántos servicios tiene cada una en curso y a quién se espera):

```bash
curl -s "$PROGES_API/v1/propiedades?porPagina=50" -H "Authorization: Bearer $PROGES_LLAVE"
```

```json
{
  "items": [
    {
      "id": "cmw…",
      "clienteId": "org_npl",
      "clienteNombre": "NPL",
      "direccion": "San Alfonso del Mar Edificio Timonel dp 202",
      "comuna": "Algarrobo",
      "tipo": "DEPARTAMENTO",
      "estado": "DISPONIBLE",
      "serviciosEnCurso": 0,
      "esperandoMasAntiguo": null,
      "ultimoHecho": null
    }
  ],
  "paginacion": { "pagina": 1, "porPagina": 50, "total": 42 }
}
```

Filtros opcionales: `comuna=…`, `q=…` (busca en la dirección y en el ROL) y `enCurso=true` (solo las que tienen un servicio abierto).

La ficha de una propiedad, con sus datos, alertas (documentos que faltan o vencen), servicios en curso y lo último que pasó (usa el `id` de la lista):

```bash
curl -s "$PROGES_API/v1/propiedades/$ID_PROPIEDAD" -H "Authorization: Bearer $PROGES_LLAVE"
```

Para ir más a fondo en una propiedad: `/v1/propiedades/{id}/historial` (lo que ha pasado), `/v1/propiedades/{id}/reparaciones` (lo que se hizo y lo que se le cobró) y `/v1/propiedades/{id}/documentos`.

Sus servicios (uno por cada trabajo de Proges en una propiedad):

```bash
curl -s "$PROGES_API/v1/servicios?vista=lista&porPagina=50" -H "Authorization: Bearer $PROGES_LLAVE"
```

Cada servicio trae su `tipo` (`EVALUACION`, `INSPECCION`, `VENTA`, `ARRIENDO`, `OBRA` o `ADMINISTRACION`), su `estado` (`ABIERTO`, `TERMINADO` o `CANCELADO`), la propiedad, `esperando` (a quién espera Proges, desde cuándo y cuántos días lleva) y las fechas. Filtros opcionales: `estado=ABIERTO`, `tipo=OBRA` y `propiedadId=…`. Siempre se pide con `vista=lista`: la otra vista (`tablero`) es del equipo de Proges y responde 403.

Un servicio en detalle, con las notas que el equipo marcó para el dueño:

```bash
curl -s "$PROGES_API/v1/servicios/$ID_SERVICIO" -H "Authorization: Bearer $PROGES_LLAVE"
```

El reporte de venta de un servicio de venta o arriendo (precio y su historia, días publicada, visitas, consultas, ofertas y la mejor, y si Proges espera la respuesta del dueño):

```bash
curl -s "$PROGES_API/v1/servicios/$ID_SERVICIO/venta" -H "Authorization: Bearer $PROGES_LLAVE"
```

Los documentos de una propiedad y el archivo de cada uno. La lista dice el estado de cada papel: `vigente`, `vence` (en los próximos 45 días), `vencido` o `falta`. El archivo es un PDF y se pide aparte, con el `id` de un documento de la lista:

```bash
curl -s "$PROGES_API/v1/propiedades/$ID_PROPIEDAD/documentos" -H "Authorization: Bearer $PROGES_LLAVE"
curl -s "$PROGES_API/v1/documentos/$ID_DOCUMENTO/archivo" -H "Authorization: Bearer $PROGES_LLAVE" -o documento.pdf
```

Lo que hay que hacer y cuándo (contratos que terminan, contribuciones por vencer, documentos que faltan) y las novedades de los servicios:

```bash
curl -s "$PROGES_API/v1/vencimientos" -H "Authorization: Bearer $PROGES_LLAVE"
curl -s "$PROGES_API/v1/novedades?limite=20" -H "Authorization: Bearer $PROGES_LLAVE"
```

La llave también lee la cartera de arriendos del cliente (`/v1/contratos`, `/v1/cobros`, `/v1/gastos`, `/v1/cartera/resumen`, entre otros), igual que la ve el dueño. Todo el listado, con lo que recibe y devuelve cada uno, está en `/docs`.

## Qué no puede hacer una llave

**No escribe.** Las llaves son de solo lectura: cualquier consulta que cree, cambie o borre algo (`POST`, `PATCH`, `PUT`, `DELETE`) responde 403 y no deja ninguna huella en los datos. Si un día el sistema del cliente necesita pedir servicios desde su plataforma, es otro paso que se diseña con Proges.

Una nota para las pruebas: si mandas una escritura con el cuerpo mal armado, la API responde 400 (revisa el cuerpo antes de saber quién eres). Para comprobar que tu llave no escribe, usa un cuerpo bien armado o un `DELETE`, que no lleva cuerpo.

## Cuando algo sale mal

Todo error tiene la misma forma, en español y pensado para una persona:

```json
{ "error": { "mensaje": "La llave de la API no es válida o fue revocada." } }
```

Cuando el problema está en un dato que enviaste (un filtro mal escrito, una página que no existe), trae además `campos` con qué revisar:

```json
{ "error": { "mensaje": "Revisa los datos enviados.", "campos": { "estado": "Opción inválida: se esperaba una de \"ABIERTO\"|\"TERMINADO\"|\"CANCELADO\"" } } }
```

| Código | Qué significa | Qué hacer |
|---|---|---|
| 400 | Un filtro o dato no tiene el formato esperado. | Lee `campos` y corrígelo. |
| 401 | Falta la llave, está mal escrita, no existe o fue revocada. | Revisa que mandes `Authorization: Bearer prg_…` completa. Si fue revocada, pide una nueva. |
| 403 | La llave es válida, pero no puede hacer eso: una escritura, algo interno de Proges, o el cliente de la llave está desactivado. | No es un error tuyo: la llave solo lee y solo lo del cliente. |
| 404 | Eso no existe **o es de otro cliente**. | Proges responde igual en los dos casos, para no revelar qué hay en otras cuentas. Revisa el `id`. |
| 502 | Al pedir un PDF, el archivo no se pudo traer del Drive. | Reintenta en un momento; si sigue, avisa a Proges. |
| 500 | Algo falló del lado de Proges. | Reintenta y, si se repite, avisa a Proges con la hora de la consulta. |

## La referencia completa: `/docs`

En `<dirección base>/docs` está la documentación interactiva de **todos** los endpoints: qué recibe y qué devuelve cada uno, con todos sus campos, y se puede probar desde el navegador pegando la llave. La misma información, en formato estándar (OpenAPI 3.1), está en `<dirección base>/openapi.json`: sirve para generar un cliente en el lenguaje que use tu sistema. Si algo de esta guía y de `/docs` no coincide, manda `/docs`.

Para comprobar de punta a punta que una llave funciona, en el repositorio de Proges está `apps/api/scripts/probar-llave.sh`: recibe la dirección y la llave, hace las consultas básicas, intenta escribir (tiene que dar 403) y cuenta en español qué pasó.
