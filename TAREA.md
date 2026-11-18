# TAREA — Etapa 1: el portal con dos caras (equipo Proges + cliente)

**Estado: plan v2 escrito, esperando la aprobación de Diego.** Tamaño: grande (regla 1). Página: https://claude.ai/artifact/1dW6hvZhqjEXQxVoSB1Vgo (v2). Branch: `plan/etapa-1-dos-caras`.

Paso siguiente: Diego recorre la página y pega su respuesta. Con el ok, se guarda la respuesta acá, se hace commit y se lanza el workflow (o subagentes sueltos si dice «sin workflow»).

## Lo que ya cerró Diego (2026-11-18)
- Convecta no ha respondido. El plan no depende de Nexxos.
- **Nexxos solo publica los avisos.** Las visitas, ofertas, fases, precios y toda la gestión de la venta o el arriendo se registran en el portal.
- **Se pausa «Cobrar según cada contrato»**: queda en `PENDIENTES.md`, en espera.
- **DuckDB y dbt (el stack analítico de RASA) quedan para la etapa en que entre Odoo.** En la etapa 1 quedan listos el historial por eventos, las fechas y los códigos del catálogo iguales a los de Odoo.
- **Un cliente grande puede tener varios usuarios con accesos distintos.** Del cliente actual entrarían entre 3 y 5 personas; no se sabe todavía si ven lo mismo.
- **Entran a la etapa 1:** la etapa del recorrido para todas las propiedades, los indicadores que salen del historial, el enlace a la carpeta del Drive en la ficha y el último ingreso de cada cliente.
- Contexto de la conversación: dos caras sobre la misma ficha; el cliente actual compra cartera de deuda (unas 80 propiedades, 20 a 25 activas) y pide reportes de corretaje que hoy van en un Word semanal; piloto de propietarios con Diego (1 propiedad) y un amigo (3); equipo: Álvaro, Cecilia, Leo Maris y François, sin responsable fijo por propiedad; catálogo de servicios en la Sheet `18YgGpb6fEHPLkq5TCAb6lKEWWtiXUANzrKEAIrihQEs` y en Odoo; inventario del Drive en `docs/inventario-drive/`.

## Cambios de la v1 a la v2
- Nueva: etapa del recorrido en la propiedad (la v1 solo cubría las propiedades en venta o arriendo).
- Nueva: acceso por sociedad para los usuarios de un cliente (decisión d6).
- Nueva pieza G (reglas e indicadores) y un historial único (`Evento`) para etapa, fase y precio.
- Nuevos: enlace a la carpeta del Drive y último ingreso.
- Fuera, con su gatillo en el ADR: DuckDB y dbt, roles por sección, pedir un servicio desde el panel, costos por propiedad.

## 1. Qué va a existir
- **Equipo Proges** (Álvaro, Cecilia, Leo, François, Diego): entra con su correo; ve y edita toda la cartera como hoy; mueve cada propiedad por las etapas del recorrido; en la venta o el arriendo lleva fase, precio con su historial, visitas, ofertas y recomendación al propietario; asigna servicios en curso (código del catálogo, responsable, estado); abre la carpeta del Drive desde la ficha; en «Operación» ve toda la cartera por etapa y lo activo por fase, semana y responsable.
- **Cliente** (el comprador de cartera y los propietarios del piloto): entra con su correo y ve solo lo que está dentro de su alcance (todo su grupo o solo algunas sociedades), en un panel de solo lectura: la cartera por etapa y, por propiedad, fase, indicadores, precio y su historial, visitas con su evaluación, ofertas, recomendación y servicios en curso.
- **Diego como admin:** crea usuarios, define su alcance y ve su último ingreso.
- **Listo:** pasan `npm run lint` y `npm run build`; un cliente de prueba no logra ver ni abrir una propiedad de otro grupo ni de una sociedad que no le toca; una visita registrada desde el celular aparece en el panel del cliente; cada cambio de etapa, fase o precio queda en el historial con fecha y autor; los indicadores coinciden con la cuenta a mano; la carga inicial deja las propiedades con su etapa «por confirmar» y su carpeta enlazada; ADRs y `PENDIENTES.md` al día.

## 2. Flujo de los usuarios
1. Diego (admin) crea los usuarios en `/equipo`, asocia cada cliente a su grupo y elige si ve todo el grupo o solo algunas sociedades. Pieza A.
2. Equipo confirma o mueve la etapa del recorrido (evaluación → toma de posesión → papeles → reparación → venta o arriendo → administración → cerrada). Las de la carga inicial vienen «por confirmar». Piezas C y D.
3. Equipo abre una gestión (venta o arriendo) cuando la propiedad sale al mercado: fase «captada», precio inicial, enlace del aviso. Pieza C.
4. Quien hizo la visita la registra desde el celular: fecha, quién la hizo, interesado, evaluación (1 a 5) y comentario. Pieza C.
5. Equipo cambia la fase o el precio: queda en el historial con fecha, autor y motivo. Pieza C.
6. Equipo registra una oferta (monto, moneda, oferente, estado: recibida, aceptada, rechazada, caída). Pieza C.
7. El portal calcula los indicadores al mirar: días publicada, visitas por semana, días desde la última rebaja. Pieza G.
8. Equipo escribe la recomendación al propietario (p. ej., bajar el precio). Queda fechada. Pieza C.
9. Equipo asigna un servicio del catálogo a la propiedad, con responsable y estado (por hacer, en curso, hecho). Pieza S.
10. Equipo revisa «Operación»: cartera por etapa, gestiones por fase, visitas de la semana y servicios por responsable. Pieza D.
11. Cliente entra y ve su panel; abre una propiedad y ve su detalle. Pieza F.

Fases de la venta: captada → publicada → con visitas → con oferta → promesa firmada → escritura → inscrita y entregada.
Fases del arriendo: captada → publicada → con visitas → postulante en evaluación → contrato firmado → entregada con inventario → pasa a administración.

## 3. Flujo de datos
- Fuentes: Drive (inventario ya hecho, `docs/inventario-drive/inventario.csv`, incluye el id de cada carpeta), Sheet del catálogo (se exporta a `prisma/datos/catalogo-servicios.csv`), Clerk (quién entra), lo que el equipo escribe. Nexxos y Odoo no se leen ni se escriben.
- Postgres (nuevo):
  - `Usuario` (correo, nombre, rol EQUIPO o CLIENTE, grupoId si es cliente, alcance GRUPO o SOCIEDADES, admin, ultimoIngreso) y `UsuarioSociedad` (usuario, owner).
  - `Gestion` (propiedad, tipo VENTA/ARRIENDO, fase, precio y moneda vigentes, abierta/cerrada, enlace del aviso, recomendación y su fecha).
  - `Evento` (propiedad, gestión opcional, tipo ETAPA/FASE/PRECIO, valor anterior y nuevo, fecha, autor, motivo).
  - `Visita`, `Oferta`.
  - `Servicio` (catálogo: código, familia, nombre) y `ServicioEnCurso` (propiedad, servicio, responsable, estado, fechas, nota).
- Postgres (cambia): `Property.rolSII` pasa a opcional (el inventario no trae ROL); `Property` suma `etapa`, `etapaPorConfirmar` y `driveCarpetaId`. `Grupo` es el cliente: sus `Owner` (sociedades) son dueñas de las propiedades. El `estado` que ya existe (ocupación) no se toca.
- Servidor (nuevo): `src/proxy.ts` (Clerk), `src/lib/sesion.ts` (quién es y su alcance; anota el último ingreso), `src/lib/gestion.ts` (etapas, fases e indicadores, funciones puras), `src/lib/cliente.ts` (todas las consultas del cliente, con alcance).
- Pantallas (nuevo): etapa, enlace al Drive y pestañas «Gestión» y «Servicios» en la ficha; `/operacion`; `/equipo`; `/cliente` y `/cliente/[id]`.

## 4. Permisos
- Roles: EQUIPO (todo, como hoy), CLIENTE (solo lectura dentro de su alcance) y la marca admin (gestiona usuarios).
- Alcance de un cliente: todo su grupo, o solo algunas sociedades. Se guarda como marca explícita (no vale «sin sociedades = ve todo»). Una propiedad con varios dueños se ve si alguna de sus sociedades está en el alcance.
- Todo se exige en el servidor: cada consulta de `/cliente` filtra por el alcance; un CLIENTE que abre cualquier ruta del equipo es redirigido a `/cliente`; todas las acciones del servidor (server actions) exigen EQUIPO, y las de `/equipo`, admin.
- El enlace al Drive existe solo en las pantallas del equipo.
- Las pantallas que ya existen no se reescriben: siguen siendo solo del equipo.
- Quien asigna: Diego, en `/equipo`. Roles por sección y que el cliente administre a sus usuarios: fuera.

## 5. Decisiones
De Diego:
- d1. Cliente grande y propietario chico: (a) mismo tipo de usuario, «cliente», con su alcance [rec.]; (b) dos tipos con pantallas distintas.
- d2. Qué ve el cliente de cada visita: (a) todo, incluido el nombre y teléfono del interesado; (b) fecha, quién la hizo, evaluación y comentario, sin datos del interesado [rec.]; (c) solo cuántas hubo.
- d3. Qué entra en la carga inicial: (a) las 62 del inventario, con las vendidas como «cerrada»; (b) las 42 sin las 20 posiblemente vendidas, después de que el equipo confirme la lista [rec.]; (c) solo las 20 a 25 activas.
- d4. Cómo ve el cliente la información: (a) en vivo, con lo que el equipo va registrando [rec.]; (b) un informe semanal que el equipo revisa y publica.
- d5. Estados de un servicio en curso: (a) por hacer, en curso y hecho [rec.]; (b) etapas propias de cada familia de servicio.
- d6. Cómo se separa lo que ven los usuarios de un mismo cliente: (a) no se separa; (b) por sociedad: todo el grupo o solo algunas sociedades [rec.]; (c) por sociedad y además por sección.

De Claude:
- DuckDB y dbt entran con Odoo (aprobado por Diego el 2026-11-18): hoy todo nace en el portal y Postgres responde directo.
- Login con Clerk: ya estaba decidido en `BRIEF.md` y las llaves están en `.env` y en Vercel.
- El rol y el alcance viven en la tabla `Usuario`, no en Clerk.
- «Solo algunas sociedades» es una marca explícita, para que borrar la lista no abra todo el grupo.
- El cliente tiene pantallas propias (`/cliente`); las del equipo no se tocan para filtrar.
- La etapa del recorrido es un dato nuevo, distinto del `estado` (ocupación) que ya existe; no se funden ahora.
- Un solo historial (`Evento`) para etapa, fase y precio: nunca se sobrescribe sin dejar rastro.
- Los indicadores se calculan al mirar, en `src/lib/gestion.ts`; no se guardan.
- La fase la mueve una persona; el portal no la cambia solo.
- `organizationId` sigue fijo en `org_proges`: los clientes son grupos dentro de Proges.
- Nexxos no se conecta: un campo para el enlace del aviso.

## 6. Supuestos
- s1. El cliente de cartera es un solo `Grupo`, y sus sociedades son las dueñas de las propiedades.
- s2. Una propiedad está en una sola etapa a la vez y tiene a lo más una gestión abierta (o venta, o arriendo).
- s3. Si una oferta se cae, la gestión vuelve a «con visitas» a mano.
- s4. Los datos que hay hoy en `proges_dev` y en producción son de prueba o del patrimonio de Diego, y conviven con los del cliente.
- s5. Los códigos de la Sheet son los mismos que los productos de Odoo.
- s6. Cada persona del equipo tiene un correo propio (`@progesspa.cl`) para entrar.
- s7. El precio lo decide el propietario: el equipo solo lo registra y recomienda.
- s8. La visita se registra el mismo día, desde el celular.
- s9. Las etapas del recorrido son siete: evaluación, toma de posesión, papeles, reparación, venta o arriendo, administración y cerrada.
- s10. Si el cliente separa lo que ve su gente, lo hace por sociedad (no por zona ni por ejecutivo).
- s11. Las personas del equipo abren la carpeta del Drive con su propia cuenta de Google, que ya tiene acceso.

## 7. Lo que no debe pasar
- Un cliente ve o abre una propiedad, visita u oferta de otro grupo. Cómo: dos clientes de prueba de grupos distintos, abriendo `/cliente/[id]` del otro.
- Un usuario limitado a una sociedad ve una propiedad de otra sociedad de su mismo grupo. Cómo: cliente limitado a la sociedad A abre `/cliente/[id]` de una de la sociedad B.
- Un cliente modifica algo. Cómo: llamar cada acción del servidor con sesión de cliente.
- Se cargan datos reales en producción antes de que el login esté publicado. Cómo: el orden del deploy en `PENDIENTES.md`.
- Un cambio de etapa, precio o fase se pierde. Cómo: cambiar dos veces y ver los dos eventos.
- El equipo y el cliente ven un indicador distinto para la misma propiedad. Cómo: ambos usan `src/lib/gestion.ts`; comparar ficha y panel.
- El cliente recibe el enlace del Drive o el contacto del interesado (si d2 = b). Cómo: revisar lo que entrega `src/lib/cliente.ts`.
- Se escribe en Odoo o en Nexxos. Cómo: ninguna pieza los usa.
- La migración borra o cambia datos existentes. Cómo: leer el SQL antes de mezclar (se aplica sola al publicar, ADR 0009).

## 8. Piezas y orden
Olas: [B] → [A, E, G] → [C, S, D, F]. 8 agentes en Sonnet.
- ◻️ B. Esquema y catálogo. `prisma/schema.prisma`, migración nueva, `prisma/datos/catalogo-servicios.csv`, `scripts/cargar-catalogo.ts`. Verifica: `npx prisma migrate dev` aplica en `proges_dev`, el catálogo carga, `npm run build`.
- ◻️ A. Login, alcance y accesos. `src/proxy.ts`, `src/lib/sesion.ts`, `src/app/layout.tsx`, `src/app/(app)/layout.tsx`, `src/app/(app)/equipo/`, pantalla de entrar, `src/lib/nav.ts` (ítem Equipo). Depende de B. Verifica: lint, build, entrar en local con un EQUIPO, un CLIENTE de todo el grupo y uno limitado a una sociedad.
- ◻️ E. Carga inicial. `scripts/carga-inicial.ts` (desde `inventario.csv`: crea propiedad, grupo del cliente, etapa deducida «por confirmar», `driveCarpetaId`, y gestión solo para las que están en venta o arriendo; repetirlo no duplica). Depende de B. Verifica: correrlo dos veces en `proges_dev` y contar.
- ◻️ G. Reglas e indicadores. `src/lib/gestion.ts`, `scripts/probar-indicadores.ts`. Depende de B. Verifica: `npx tsx scripts/probar-indicadores.ts` con casos hechos a mano.
- ◻️ C. Etapa y gestión en la ficha. `src/app/(app)/propiedades/[id]/gestion-*.tsx`, `src/app/(app)/propiedades/gestion-actions.ts`, y en `[id]/page.tsx` la etapa, el enlace al Drive y la pestaña nueva. Depende de A, B y G. Verifica: lint, build, los pasos 2 a 8 en el navegador, también a ancho de celular.
- ◻️ S. Servicios en curso. `src/app/(app)/propiedades/[id]/servicios-*.tsx`, `src/app/(app)/propiedades/servicios-actions.ts`. Depende de A y B. Verifica: lint, build, asignar y cerrar un servicio. (C y S comparten `[id]/page.tsx`: lo toca solo C, y S entrega su componente para que el coordinador lo enchufe.)
- ◻️ D. Operación. `src/app/(app)/operacion/`, `src/lib/nav.ts` (ítem Operación; A ya terminó con ese archivo en la ola anterior). Depende de A, B y G. Verifica: lint, build, la cartera por etapa con datos de la carga inicial.
- ◻️ F. Panel del cliente. `src/app/cliente/`, `src/lib/cliente.ts`. Depende de A, B y G. Verifica: lint, build, la prueba con tres clientes (otro grupo, todo el grupo, limitado a una sociedad).

## 9. Riesgos
- R1. Una consulta del cliente olvida el filtro por alcance (p 2, i 3; datos). Todas en `src/lib/cliente.ts`, que exige el alcance; prueba con tres clientes.
- R2. Publicar el login cambia producción, que hoy es pública (p 2, i 2; producción). Antes de subir, Diego se crea su usuario; si algo falla, se revierte el commit.
- R3. La etapa deducida del Drive está mal (p 3, i 1; datos). Se carga como «por confirmar» (solo 27 de 62 con confianza alta) y el equipo la revisa en «Operación».
- R4. El equipo no registra las visitas y el panel queda vacío (p 2, i 3; datos). Registro corto desde el celular; Diego conversa con el equipo antes de abrirle el panel al cliente.
- R5. La migración falla en producción (p 1, i 2; producción). Solo agrega tablas y columnas y vuelve opcional el ROL; si falla, el build se detiene y sigue la versión anterior.
- R6. Clerk en local y en producción con instancias distintas (p 2, i 1; producción). Se revisa cuáles llaves hay en Vercel antes de subir.
- R7. La etapa (nueva) y el estado (el de hoy) se contradicen (p 2, i 1; datos). La ficha los nombra distinto: «Etapa» y «Ocupación». Si confunde, se funden con un ADR.
- R8. El cliente no se organiza por sociedad (p 2, i 1; datos). Parte con todos viendo todo el grupo; cambiar el criterio es editar el filtro de un archivo.

## 10. Documentos accesorios y qué queda fuera
- ADR 0010 «Dos caras: quién ve qué» (usuario, rol, alcance por grupo y sociedad, exigido en el servidor; dónde irían los roles por sección). Nuevo.
- ADR 0011 «El recorrido y la gestión» (etapas, fases, historial por eventos, visitas, ofertas, indicadores; Nexxos solo publica). En «Lo que queda fuera», con su gatillo: la bodega de análisis (DuckDB y dbt, cuando entre Odoo), pedir un servicio desde el panel, costos por propiedad, correo semanal. Nuevo.
- `BRIEF.md`: actualizar «Lo que NO hacemos ahora» (ahora hay roles) y el usuario.
- `PENDIENTES.md`: «Cobrar según cada contrato» en espera; quitar «Producción es pública»; agregar la puesta en uso (crear usuarios, confirmar la lista de la carga, correr la carga en producción, conversar con el equipo, abrirle el panel al cliente y al piloto) y la respuesta de Convecta.
- Fuera: DuckDB y dbt; roles por sección y que el cliente administre a sus usuarios; pedir un servicio desde el panel; costos y resultado por propiedad, obras y costeo; Odoo (cobros); leer Nexxos (avisos o contactos); propietarios externos que se registran solos; la API para clientes grandes; el correo semanal; ordenar las carpetas del Drive (se recomienda la estructura de 6 subcarpetas, sin código); cobrar según cada contrato.

## 11. Qué revisar una vez construido
Diego:
- v1. Entra como cliente de prueba: ve solo las propiedades de ese grupo, repartidas por etapa.
- v2. Como cliente, pega en la barra la dirección de una propiedad de otro grupo: no la ve.
- v3. Entra como cliente limitado a una sociedad: ve solo las de esa sociedad.
- v4. Registra una visita desde el celular: aparece en el panel del cliente, sin el teléfono del interesado.
- v5. Baja un precio dos veces: el historial muestra los dos cambios y «días desde la última rebaja» vuelve a cero.
- v6. Cuenta a mano los días publicada y las visitas de una propiedad: coinciden con los indicadores en la ficha y en el panel.
- v7. Registra una oferta y mueve la fase a «con oferta»: el panel lo muestra.
- v8. Asigna un servicio a Leo: aparece en «Operación» bajo Leo.
- v9. Revisa «Operación» después de la carga inicial: cada propiedad con su etapa «por confirmar»; al confirmar una, la marca desaparece.
- v10. Toca el enlace al Drive en una ficha: abre la carpeta. En el panel del cliente el enlace no existe.
- v11. Entra como propietario piloto y después mira `/equipo`: ve solo su propiedad y queda su último ingreso.
Claude: lint y build; `npx tsx scripts/probar-indicadores.ts`; la carga inicial corrida dos veces sin duplicar; cada acción del servidor llamada con sesión de cliente responde «sin permiso»; el SQL de la migración leído.

## Respuesta de Diego
(pendiente)
