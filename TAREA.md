# TAREA — Etapa 1: el portal con dos caras (equipo Proges + cliente)

**Estado: plan v4 APROBADO por Diego el 2026-11-18 («ok, con workflow», con los ajustes de abajo). En ejecución.** Tamaño: grande (regla 1). Página: https://claude.ai/artifact/1dW6hvZhqjEXQxVoSB1Vgo (v4). Branch: `plan/etapa-1-dos-caras` (sin mezclar).

**Paso siguiente exacto:** construida, revisada y cerrada contra el plan (commits `19ef648` y `41f8bad`; la página v4 está en su estado de cierre). Falta lo de Diego: elegir la base local (reiniciar `proges_dev` o pasar `.env` a `proges_dev_v4`), recorrer «Qué revisar» en la página y pegar su resumen. Después: borrar este archivo, mezclar a `main` local y desarmar la branch. Subir solo cuando Diego lo pida (PENDIENTES §0).

**Cambios del coordinador después del workflow:** `espacioDeEscritura()`, `SoloLecturaError`, `espacioParaLeer()` y `espacioParaEscribir()` viven en `src/lib/org.ts` (antes, 10 copias en las acciones); la cabecera de la ficha esconde editar, eliminar y el estado al equipo, y el Drive al cliente; `src/app/(app)/error.tsx` explica la solo lectura si el equipo aprieta un botón de la cartera (los botones de editar de las demás pantallas siguen visibles para el equipo); `PedirServicioBoton` enchufado; `seed-demo*.ts` escriben en `org_demo`; 5 casos más en `probar-espacios.ts` (cookie ajena, escritura).

## Respuesta de Diego a la v4 (2026-11-18), tal cual
```
ok, con workflow
Plan: etapa 1 de Proges, versión 4

Decisiones:
- ¿Cómo se entera el equipo de una solicitud? Bandeja en Operación con contador en el menú, sin IA
- ¿Qué puede hacer un usuario de cliente? Todos administran (distinto de lo propuesto)
- ¿Se mantiene el límite por sociedad dentro de un cliente? (era d6) Por ahora no: cada usuario ve todo el espacio de su cliente
- ¿Qué pasa con la vitrina /cliente de la v3? Se quita: el cliente ve todo en su portal

Supuestos que no son así:
- El equipo puede editar todo en el espacio de cualquier cliente (así carga la cartera de NPL).
- Los usuarios de NPL solo miran.

Supuestos que no sé:
- Un usuario de cliente pertenece a un solo cliente.
- La solicitud no lleva precio: se cotiza después, fuera del portal.
- Una solicitud siempre es sobre una propiedad ya cargada; para evaluar una que todavía no tiene, el cliente primero la crea.
```
Y además: «NPL tiene 4 o 5 empresas dueñas de propiedades. NPL es un caso especial, no sé si tener un "usuario". Las propiedades que tenemos (las puedes ver en proges-web) ninguna es de Proges, todas pertenecen a alguna sociedad de NPL.» Al preguntarle si el equipo ve pero no edita la cartera de un cliente: «sí, así es. Una idea podría ser crear un usuario a NPL y llevarlo nosotros por ahí para crear las propiedades, o de frentón darles un usuario a ellos.»

**Ajustes que esto hace al plan (mandan sobre lo de abajo):**
- d9 = b: no hay permiso «administra/mira»: todo usuario de cliente administra su espacio. Sale el campo `permiso`.
- **El equipo ve la cartera del cliente activo en solo lectura y no la edita** (t2 falso). Solo gestiona servicios, solicitudes y Operación. `orgParaEscribir()` exige un CLIENTE; al equipo, una franja arriba dice «Estás viendo la cartera de X: solo lectura».
- **NPL es un cliente con su propio usuario.** Parte con uno a cargo de Proges (un correo que controle Proges) para cargar sus propiedades; después NPL puede tener usuarios propios. Sus 4 o 5 empresas son las sociedades (`Owner`) de su espacio; la carga inicial las deja «por confirmar» porque ninguna fuente dice qué empresa es dueña de cada propiedad.
- Los «no sé» siguen con lo más simple: un usuario, un cliente; la solicitud sin precio; se pide sobre una propiedad ya cargada.
- Los datos inventados quedan en `org_proges`, que no es un cliente y no se ofrece en el selector: en producción no se ven y se borran (pendiente); en local el seed los pone en el cliente «Demo».

## Por qué hay una v4

La v3 se construyó entera (commits `740d374` a `a478988`), pero con un error de concepto que Diego corrigió el 2026-11-18:

- **El portal que ya existía (propiedades, contratos, cobranza, cuentas) es el producto para el cliente:** ahí cada dueño administra su cartera. No es una herramienta interna de Proges.
- **Desde ese portal, el cliente le pide servicios a Proges** y ve en qué va cada uno.
- **El equipo de Proges es el proveedor:** recibe los pedidos de todos los clientes y los gestiona.

La v3 hizo lo contrario: dejó las pantallas de siempre solo para el equipo y le armó al cliente una vitrina de solo lectura (`/cliente`). La v4 lo da vuelta.

Respuestas de Diego (2026-11-18):
1. Cada cliente tiene su espacio y Proges ve todos.
2. NPL (el cliente de carteras) es un caso especial: comunica las propiedades en las reuniones y Proges las gestiona. Antes usaban un portal antiguo, poco claro.
3. Hoy un dueño no le pide servicios a Proges por ningún canal: la idea es que empiece a pasar por el portal. Quizás con IA para dimensionar y levantar información, y después el aviso a Cecilia o a Leo; o quizás sin IA.

**Lo construido en la v3 que sigue tal cual:** servicios en curso, etapas editables, historial por eventos, venta y arriendo (precio, visitas, ofertas, recomendación), indicadores, catálogo, carga inicial, login con Clerk, `/equipo/etapas`, `/operacion`, los arreglos del revisor.
**Lo que cambia:** quién ve qué (cada cliente su espacio), la vitrina `/cliente` y el alcance por sociedad, y entra pedir un servicio.

## 1. Qué va a existir
- **Cliente** (dueño del piloto, NPL): entra con su correo a **su espacio**, el portal de siempre con solo su cartera. Si su usuario **administra**, edita propiedades, contratos y cobranza; si solo **mira**, lee. En cada propiedad ve sus servicios con la etapa, indicadores, visitas (sin datos del interesado), ofertas (sin el oferente) y recomendación. **Pide un servicio** desde la ficha y ve si se aceptó o se rechazó. En «Mis servicios» ve todo junto.
- **Equipo Proges:** elige el **cliente activo** en la cabecera y trabaja en su espacio como el dueño (así carga la cartera de NPL). En «Operación» ve todos los clientes: solicitudes nuevas, servicios por tipo y etapa, por responsable. Acepta una solicitud abriendo el servicio, o la rechaza con motivo. Mueve etapas y registra precio, visitas y ofertas, como en la v3.
- **Diego como admin:** crea los clientes y sus usuarios (administra o mira), el equipo, y edita las etapas.
- **Listo:** pasan tipos, lint y build; un cliente no ve ni abre nada de otro cliente, ni cambiando la cookie del cliente activo; un usuario que solo mira no puede escribir; una solicitud pedida desde la ficha aparece en Operación y, aceptada, queda como servicio en la ficha del cliente; el equipo cambia de cliente y edita su cartera; el cliente no ve datos del interesado ni del oferente; ningún archivo nuevo sobre 800 líneas; ADRs, `BRIEF.md` y `PENDIENTES.md` al día.

## 2. Flujo de los usuarios
1. Admin crea el cliente (su espacio) y sus usuarios, cada uno «administra» o «mira». `/equipo`. Pieza U.
2. Cliente entra y ve su cartera en el portal de siempre. Pieza M.
3. Cliente pide un servicio desde la ficha: el tipo y qué necesita, en texto libre. Queda NUEVA. Pieza P.
4. El portal suma la solicitud al contador de «Operación» en el menú del equipo. Pieza O.
5. Equipo acepta: elige el código del catálogo y el responsable; se abre el servicio en su primera etapa, enlazado a la solicitud. Pieza O.
6. O la rechaza con motivo; el cliente lo ve. Pieza O.
7. Equipo mueve etapas y registra precio, visitas y ofertas (ya construido en la v3).
8. Cliente ve el servicio en su ficha y en «Mis servicios», en vivo. Pieza S.
9. Equipo cambia de cliente activo para cargar o editar la cartera de NPL. Pieza M.
10. Equipo revisa «Operación» con todos los clientes. Pieza O.

## 3. Flujo de datos
- **El espacio de un cliente es el `organizationId` que ya existe.** Todas las tablas lo tienen y `getOrgId()` (`src/lib/org.ts`) es el único lugar de donde sale. Hoy vale siempre `org_proges`; pasa a ser el espacio del cliente.
- Postgres (nuevo):
  - `Organizacion` (id, nombre, tipo PROGES o CLIENTE, activa). `org_proges` es la de Proges: ahí viven el catálogo y las etapas, comunes a todos los clientes.
  - `Solicitud` (organizationId del cliente, propiedad, tipo de servicio, qué necesita, quién la pidió, estado NUEVA/ACEPTADA/RECHAZADA, motivo del rechazo, quién la resolvió y cuándo, servicio en curso que abrió).
- Postgres (cambia, en la migración de etapa 1, que todavía no está en producción y se rehace):
  - `Usuario`: CLIENTE lleva `organizationId` de su cliente y `permiso` ADMINISTRA o MIRA; EQUIPO lleva `org_proges`. Sale `grupoId`, `alcance` y `UsuarioSociedad` si d10 = a.
  - `ServicioEnCurso`, `Evento`, `Visita`, `Oferta` llevan el `organizationId` del cliente (ya era así); `Etapa` y `Servicio` se leen siempre de `org_proges`.
- Servidor:
  - `src/lib/sesion.ts`: para un CLIENTE, el espacio es el suyo y punto; para el EQUIPO, el cliente activo, guardado en una cookie y validado contra `Organizacion`. Un cliente que manda una cookie ajena no cambia nada.
  - `getOrgId()` para leer; `orgParaEscribir()` para escribir: exige EQUIPO o CLIENTE que administra. Las 42 acciones que ya existen pasan a usarla.
  - `src/lib/vista-cliente.ts` (sale de `src/lib/cliente.ts`): lo que un cliente ve de un servicio, sin interesado ni oferente.
  - `src/lib/operacion.ts`: las únicas consultas que cruzan clientes, y exigen EQUIPO.
- Pantallas: selector de cliente activo en la cabecera (solo equipo); menú distinto por rol; pestaña «Servicios» de la ficha con dos vistas (equipo edita, cliente lee y pide); «Mis servicios» (`/servicios`); bandeja de solicitudes en «Operación»; clientes y usuarios en `/equipo`. Se quita `/cliente`.
- Carga inicial: las 42 propiedades entran al espacio de NPL (`--cliente NPL`).

## 4. Permisos
- EQUIPO: todo, en el cliente activo; «Operación» cruza clientes. Admin: además clientes, usuarios y etapas.
- CLIENTE que administra: lee y escribe su cartera; pide servicios; no mueve servicios.
- CLIENTE que mira: lee su cartera y sus servicios; pide servicios (pedir no cambia la cartera).
- Nadie de un cliente ve el contacto del interesado, el oferente, el autor de un cambio de precio ni el enlace del Drive.
- Todo se exige en el servidor: `getOrgId()` y `orgParaEscribir()` en cada pantalla y acción; las acciones de servicios exigen EQUIPO; `/operacion` y `/equipo` exigen EQUIPO (y admin).

## 5. Decisiones
De Diego:
- **d8. Cómo se entera el equipo de una solicitud:** (a) bandeja en «Operación» con contador en el menú, sin IA [rec.]; (b) además un correo a Cecilia y Leo (servicio de correo nuevo); (c) además IA que dimensiona el pedido antes del aviso.
- **d9. Qué puede hacer un usuario de cliente:** (a) cada uno «administra» o «mira», lo elige el admin [rec.]; (b) todos administran; (c) todos miran.
- **d10. Límite por sociedad (era d6 b):** (a) por ahora no: cada usuario ve todo el espacio de su cliente; se agrega cuando un cliente lo pida [rec.]; (b) se mantiene, en todas las pantallas.
- **d11. La vitrina `/cliente`:** (a) se quita: el cliente ve todo en su portal [rec.]; (b) se mantiene como resumen.

De Claude:
- El espacio de cada cliente es el `organizationId`; no se usan las organizaciones de Clerk.
- El equipo elige un cliente activo; un cliente nunca puede elegir otro.
- Un solo punto para leer (`getOrgId`) y uno para escribir (`orgParaEscribir`).
- Las consultas que cruzan clientes viven en un solo archivo (`src/lib/operacion.ts`) y exigen EQUIPO.
- Catálogo y etapas son de Proges y valen para todos los clientes.
- La migración de etapa 1 se rehace: no está en producción.
- Aceptar una solicitud abre el servicio y los deja enlazados.
- La IA queda fuera hasta que haya solicitudes reales de donde aprender qué falta preguntar.
- Se mantiene todo lo de la v3 que no contradice esto.

## 6. Supuestos
- t1. Un usuario de cliente pertenece a un solo cliente.
- t2. El equipo puede editar todo en el espacio de cualquier cliente (así carga NPL).
- t3. Los usuarios de NPL solo miran.
- t4. Los dueños del piloto (Diego y su amigo) administran ellos mismos su cartera.
- t5. El catálogo y las etapas son los mismos para todos los clientes.
- t6. La solicitud no lleva precio: se cotiza después, fuera del portal.
- t7. Cecilia o Leo revisan la bandeja todos los días hábiles.
- t8. Una solicitud siempre es sobre una propiedad ya cargada; para evaluar una que todavía no tiene, el cliente primero la crea.
- t9. Los datos inventados de hoy pasan a un cliente «Demo» en desarrollo y se borran de producción.

## 7. Lo que no debe pasar
- Un cliente ve o abre algo de otro cliente. Cómo: `scripts/probar-espacios.ts` con dos clientes, y en el navegador pegando la dirección de una propiedad ajena.
- Un cliente ve otro espacio cambiando la cookie del cliente activo. Cómo: la prueba manda la cookie con un usuario cliente.
- Un usuario que mira escribe. Cómo: la prueba llama acciones con ese usuario.
- Un cliente entra a «Operación» o a `/equipo`. Cómo: navegador y prueba.
- Un cliente ve el contacto del interesado o el oferente. Cómo: la prueba recorre lo que entrega `vista-cliente.ts`.
- Una solicitud se pierde. Cómo: queda NUEVA en la bandeja hasta que alguien la acepta o la rechaza.
- La migración borra o cambia datos existentes en producción. Cómo: leer el SQL; solo crea y agrega.
- Se cargan datos reales en producción antes de publicar el login. Cómo: orden de `PENDIENTES.md`.
- Un archivo pasa de 800 líneas. Cómo: `wc -l`.

## 8. Piezas y orden
Olas: [M] → [W, U, S, P, O] → [X]. 7 agentes en Sonnet. Verificación común: `npx tsc --noEmit && npm run lint`; el build lo corre el coordinador al final de cada ola.
- ✅ M. Espacios y sesión. `prisma/schema.prisma`, la migración de etapa 1 rehecha (más `Organizacion` y `Solicitud`), `src/lib/sesion.ts`, `src/lib/org.ts`, selector de cliente en `src/components/app-header.tsx`, menú por rol en `src/lib/nav.ts` y `src/components/app-sidebar.tsx`, `scripts/carga-inicial.ts` (`--cliente`), `scripts/crear-usuario.ts`, `prisma/seed.ts` (los inventados a «Demo»). Verifica: migración aplica en `proges_dev` desde cero, la carga entra a NPL dos veces sin duplicar, común y build.
- ✅ W. Escritura protegida. Las 9 carpetas de acciones que ya existen: `getOrgId()` → `orgParaEscribir()` al escribir, y los botones de editar se esconden a quien mira. Depende de M.
- ✅ U. Clientes y usuarios. `src/app/(app)/equipo/` (crear cliente, usuarios con cliente y permiso). Depende de M.
- ✅ S. Servicios del lado del cliente. `src/lib/vista-cliente.ts`, la vista de lectura de la pestaña «Servicios» y de la página del servicio, `src/app/(app)/servicios/` («Mis servicios»). Depende de M.
- ✅ P. Pedir un servicio. Formulario en la ficha y en «Mis servicios», `solicitud-actions.ts`, el estado de cada solicitud para el cliente. Depende de M.
- ✅ O. Operación de Proges. `src/lib/operacion.ts`, `src/app/(app)/operacion/` con todos los clientes y la bandeja (aceptar abre el servicio, rechazar pide motivo), contador en el menú. Depende de M.
- ✅ X. Quitar la vitrina y probar los espacios. Borra `src/app/cliente/` y `scripts/probar-alcance.ts`; escribe `scripts/probar-espacios.ts`. Depende de W, S y O.

## 9. Riesgos
- R1. Un dato cruza de un cliente a otro (p 2, i 3; datos). Un solo punto de lectura y uno de escritura; prueba con dos clientes; revisor.
- R2. «Operación» muestra a un cliente datos de todos (p 1, i 3; datos). Sus consultas en un archivo que exige EQUIPO.
- R3. Nadie mira la bandeja y el cliente queda esperando (p 3, i 2; datos). Contador en el menú; el correo (d8 b) si pasa.
- R4. Publicar el login cambia producción (p 2, i 2; producción). Igual que en la v3: llaves y usuario antes de subir.
- R5. Rehacer la migración rompe `proges_dev` (p 2, i 1; datos). Se reinicia la base local; producción nunca la tuvo.
- R6. Los botones de editar quedan visibles para quien mira (p 2, i 1; datos). La acción igual responde «sin permiso».

## 10. Documentos accesorios y qué queda fuera
- ADR 0010 «Dos caras: quién ve qué»: se reescribe (espacio por cliente, cliente activo, administra/mira).
- ADR 0011 «El servicio en curso como unidad»: se le suma la solicitud.
- `BRIEF.md`: el usuario vuelve a ser el dueño que administra su cartera; Proges es el proveedor.
- `PENDIENTES.md`: puesta en uso (crear NPL y los pilotos, cargar NPL, revisar etapas con el equipo).
- Fuera: IA para dimensionar un pedido; correo de aviso (si d8 = a); cotizar o cobrar en el portal; límite por sociedad (si d10 = a); que un cliente cree sus propios usuarios; registro solo; seguimiento de obra (tarea siguiente); DuckDB y dbt.

## 11. Qué revisar una vez construido
Diego:
- v1. Entra como cliente A: ve solo su cartera; pega la dirección de una propiedad del cliente B: no la ve.
- v2. Entra como usuario que solo mira: no ve botones de editar.
- v3. Como cliente, pide un servicio desde la ficha: aparece en «Operación» y el contador sube.
- v4. Como equipo, la acepta: el servicio aparece en la ficha del cliente, en su primera etapa.
- v5. Rechaza otra con motivo: el cliente ve el motivo.
- v6. Como equipo, cambia el cliente activo a NPL: ve y edita su cartera.
- v7. Como cliente, abre un servicio de venta: ve las visitas sin los datos del interesado.
- v8. «Operación» muestra los servicios de todos los clientes, con su nombre.
- v9. Como cliente que administra, registra un pago: queda en su espacio.
Claude: tipos, lint y build; `npx tsx scripts/probar-espacios.ts`; `npx tsx scripts/probar-indicadores.ts`; carga inicial en NPL dos veces; SQL leído; `wc -l`.

## Historia
- v1 y v2: commits `8feafed` a `2a0b1e9`. v3 aprobada el 2026-11-18 («ok, con workflow», d7 = a) y construida: commits `740d374` a `a478988`; su cierre está en la página (versión 4 del artifact, antes de esta v4 del plan).
- Lo que ya cerró Diego y sigue en pie: Nexxos solo publica; cobrar según cada contrato en espera; DuckDB y dbt con Odoo; un solo tipo de usuario cliente (d1 a); el cliente ve las visitas sin los datos del interesado (d2 b); carga inicial de las 42 sin las 20 posiblemente vendidas (d3 b); el cliente ve en vivo (d4 a); etapas propias por tipo de servicio, editables (d5 b); revisión enfocada y completa antes de abrirle el portal al cliente real (d7 a); ningún archivo sobre 800 líneas.
- El seguimiento de la obra (tareas, hitos, avance) es la tarea siguiente, en `PENDIENTES.md`.
