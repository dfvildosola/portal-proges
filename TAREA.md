# TAREA — Etapa 1: el portal con dos caras (equipo Proges + cliente)

**Estado: plan v1 escrito, esperando la aprobación de Diego.** Tamaño: grande (regla 1). Página: https://claude.ai/artifact/1dW6hvZhqjEXQxVoSB1Vgo (v1). Branch: `plan/etapa-1-dos-caras`.

Paso siguiente: Diego recorre la página y pega su respuesta. Con el ok, se guarda la respuesta acá, se hace commit y se lanza el workflow (o subagentes sueltos si dice «sin workflow»).

## Lo que ya cerró Diego (2026-11-18)
- Convecta no ha respondido. El plan no depende de Nexxos.
- **Nexxos solo publica los avisos.** Las visitas, ofertas, fases, precios y toda la gestión de la venta o el arriendo se registran en el portal.
- **Se pausa «Cobrar según cada contrato»**: queda en `PENDIENTES.md`, en espera.
- Contexto de la conversación: dos caras sobre la misma ficha; el cliente actual compra cartera de deuda (unas 80 propiedades, 20 a 25 activas) y pide reportes de corretaje que hoy van en un Word semanal; piloto de propietarios con Diego (1 propiedad) y un amigo (3); equipo: Álvaro, Cecilia, Leo Maris y François, sin responsable fijo por propiedad; catálogo de servicios en la Sheet `18YgGpb6fEHPLkq5TCAb6lKEWWtiXUANzrKEAIrihQEs` y en Odoo; inventario del Drive en `docs/inventario-drive/`.

## 1. Qué va a existir
- **Equipo Proges** (Álvaro, Cecilia, Leo, François, Diego): entra con su correo; ve y edita toda la cartera como hoy; en la ficha de cada propiedad lleva la gestión de venta o arriendo (fase, precio con su historial, visitas, ofertas, recomendación al propietario) y los servicios en curso (código del catálogo, responsable, estado); en «Operación» ve todo lo activo de la cartera en una tabla.
- **Cliente** (el comprador de cartera y los propietarios del piloto): entra con su correo y ve solo las propiedades de su grupo, en un panel de solo lectura: fase, precio y su historial, visitas de cada semana con su evaluación, ofertas, recomendación del equipo y servicios en curso.
- **Listo:** pasan `npm run lint` y `npm run build`; un cliente de prueba no logra ver ni abrir una propiedad de otro grupo; una visita registrada desde el celular aparece en el panel del cliente; un cambio de precio queda en el historial con fecha y autor; la carga inicial deja las propiedades del inventario con su fase por confirmar; ADRs y `PENDIENTES.md` al día.

## 2. Flujo de los usuarios
1. Diego (administrador) crea los usuarios en «Equipo y accesos» y asocia cada cliente a su grupo. Permiso: administrar. Pieza A.
2. Equipo abre una gestión (venta o arriendo) en la ficha: fase «captada», precio inicial. Pieza C.
3. Equipo cambia la fase o el precio: queda en el historial con fecha, autor y motivo. Pieza C.
4. Quien hizo la visita la registra desde el celular: fecha, quién la hizo, interesado, evaluación (1 a 5) y comentario. Pieza C.
5. Equipo registra una oferta (monto, moneda, oferente, estado: recibida, aceptada, rechazada, caída). Pieza C.
6. Equipo escribe la recomendación al propietario (p. ej., bajar el precio). Queda fechada. Pieza C.
7. Equipo asigna un servicio del catálogo a la propiedad, con responsable y estado (por hacer, en curso, hecho). Pieza S.
8. Equipo revisa «Operación»: todas las gestiones activas por fase, visitas de la semana y servicios por responsable. Pieza D.
9. Cliente entra y ve su panel; abre una propiedad y ve su detalle. Pieza F.

## 3. Flujo de datos
- Fuentes: Drive (inventario ya hecho, `docs/inventario-drive/inventario.csv`), Sheet del catálogo (se exporta a `prisma/datos/catalogo-servicios.csv`), Clerk (quién entra), lo que el equipo escribe. Nexxos y Odoo no se leen ni se escriben.
- Postgres (nuevo): `Usuario` (correo, nombre, rol EQUIPO o CLIENTE, grupoId si es cliente, admin), `Gestion` (propiedad, tipo VENTA/ARRIENDO, fase, precio y moneda vigentes, abierta/cerrada, recomendación y su fecha), `GestionEvento` (historial: cambio de fase o de precio, con valor anterior y nuevo, fecha, autor, motivo), `Visita`, `Oferta`, `Servicio` (catálogo: código, familia, nombre), `ServicioEnCurso` (propiedad, servicio, responsable, estado, fechas, nota).
- Postgres (cambia): `Property.rolSII` pasa a opcional, porque el inventario no trae ROL. `Grupo` es el cliente: sus `Owner` (sociedades) son dueñas de las propiedades.
- Portal (nuevo): `src/proxy.ts` (Clerk), `src/lib/sesion.ts` (quién es y qué alcance tiene), pestañas «Gestión» y «Servicios» en la ficha, `/operacion`, `/equipo`, `/cliente` y `/cliente/[id]`.

## 4. Permisos
- Roles: EQUIPO (todo, como hoy), CLIENTE (solo lectura de su grupo), y la marca admin (gestiona usuarios).
- El alcance se exige en el servidor: cada consulta de `/cliente` filtra por el grupo del usuario; un CLIENTE que abre cualquier ruta del equipo es redirigido a `/cliente`; todas las acciones del servidor (server actions) exigen EQUIPO.
- Las pantallas que ya existen no se reescriben: siguen siendo solo del equipo.
- Quien asigna: Diego, en `/equipo`.

## 5. Decisiones
De Diego:
- d1. Cliente grande y propietario chico: (a) mismo tipo de usuario, «cliente», que ve su grupo [rec.]; (b) dos tipos con pantallas distintas.
- d2. Qué ve el cliente de cada visita: (a) todo, incluido el nombre y teléfono del interesado; (b) fecha, quién la hizo, evaluación y comentario, sin datos del interesado [rec.]; (c) solo cuántas hubo.
- d3. Qué entra en la carga inicial: (a) las 62 del inventario; (b) las 42 sin las 20 posiblemente vendidas, después de que el equipo confirme la lista [rec.]; (c) solo las 20 a 25 activas.
- d4. Cómo ve el cliente la información: (a) en vivo, con lo que el equipo va registrando [rec.]; (b) un informe semanal que el equipo revisa y publica.
- d5. Estados de un servicio en curso: (a) por hacer, en curso y hecho [rec.]; (b) etapas propias de cada familia de servicio.

De Claude:
- Login con Clerk: ya estaba decidido en `BRIEF.md` y las llaves están en `.env` y en Vercel.
- Los usuarios y su rol viven en la tabla `Usuario`, no en Clerk: así el alcance se lee en la misma consulta y se cambia sin tocar Clerk.
- El cliente tiene pantallas propias (`/cliente`); las del equipo no se tocan para filtrar. Menos riesgo de que se escape un dato.
- La fase la mueve una persona; el portal no la cambia solo al registrar una visita u oferta.
- El historial guarda cada cambio de fase y de precio como un evento: nunca se sobrescribe sin dejar rastro.
- `organizationId` sigue fijo en `org_proges`: Proges es una sola organización y sus clientes son grupos dentro de ella.

## 6. Supuestos
- s1. El cliente de cartera es un solo `Grupo`, y sus sociedades son las dueñas de las propiedades.
- s2. Una propiedad tiene a lo más una gestión abierta a la vez (o venta, o arriendo).
- s3. Si una oferta se cae, la gestión vuelve a «con visitas» a mano.
- s4. Los datos que hay hoy en `proges_dev` y en producción son de prueba o del patrimonio de Diego, y conviven con los del cliente.
- s5. Los códigos de la Sheet son los mismos que los productos de Odoo.
- s6. Cada persona del equipo tiene un correo propio (`@progesspa.cl`) para entrar.
- s7. El precio lo decide el propietario: el equipo solo lo registra y recomienda.
- s8. La visita se registra el mismo día, desde el celular.

## 7. Lo que no debe pasar
- Un cliente ve o abre una propiedad, visita u oferta de otro grupo. Cómo se comprueba: dos usuarios cliente de prueba de grupos distintos, abriendo `/cliente/[id]` del otro.
- Un cliente modifica algo. Cómo: llamar cada acción del servidor con sesión de cliente.
- Se cargan datos reales en producción antes de que el login esté publicado. Cómo: el orden del deploy en `PENDIENTES.md`.
- Un cambio de precio o fase se pierde. Cómo: cambiar dos veces y ver los dos eventos.
- Se escribe en Odoo o en Nexxos. Cómo: ninguna pieza los usa.
- La migración borra o cambia datos existentes. Cómo: leer el SQL antes de mezclar (se aplica sola al publicar, ADR 0009).
- El cliente ve datos del interesado (si d2 = b). Cómo: revisar lo que entrega la consulta de `/cliente/[id]`.

## 8. Piezas y orden
Olas: [B] → [A, E] → [C, S, D, F]. 7 agentes en Sonnet.
- B. Esquema y catálogo. `prisma/schema.prisma`, migración nueva, `prisma/datos/catalogo-servicios.csv`, `scripts/cargar-catalogo.ts`. Verifica: `npx prisma migrate dev` aplica en `proges_dev`, `npm run build`.
- A. Login y alcance. `src/proxy.ts`, `src/lib/sesion.ts`, `src/app/layout.tsx`, `src/app/(app)/layout.tsx`, `src/app/(app)/equipo/`, páginas de entrar. Depende de B. Verifica: lint, build, entrar con un usuario EQUIPO y uno CLIENTE en local.
- E. Carga inicial. `scripts/carga-inicial.ts` (desde `inventario.csv`, crea propiedad, grupo del cliente y gestión con fase deducida marcada «por confirmar»; repetirlo no duplica). Depende de B. Verifica: correrlo dos veces en `proges_dev` y contar.
- C. Gestión en la ficha. `src/app/(app)/propiedades/[id]/gestion-*.tsx`, `src/app/(app)/propiedades/gestion-actions.ts`, pestaña nueva en `[id]/page.tsx`. Depende de A y B. Verifica: lint, build, el recorrido 2→6 en el navegador, también a ancho de celular.
- S. Servicios en curso. `src/app/(app)/propiedades/[id]/servicios-*.tsx`, `src/app/(app)/propiedades/servicios-actions.ts`. Depende de A y B. Verifica: lint, build, asignar y cerrar un servicio. (C y S comparten `[id]/page.tsx`: lo toca solo C, y S entrega su componente para que el coordinador lo enchufe.)
- D. Operación. `src/app/(app)/operacion/`, `src/lib/nav.ts`. Depende de A y B. Verifica: lint, build, la tabla con datos de la carga inicial.
- F. Panel del cliente. `src/app/cliente/`, `src/lib/cliente.ts` (consultas con alcance). Depende de A y B. Verifica: lint, build, la prueba de dos clientes de grupos distintos.

## 9. Riesgos
- R1. Una consulta del cliente olvida el filtro por grupo (p 2, i 3; datos). Se evita con todas las consultas del cliente en un solo archivo (`src/lib/cliente.ts`) que exige el grupo, y la prueba de dos clientes.
- R2. Publicar el login cambia producción, que hoy es pública (p 2, i 2; producción). Antes de subir, Diego se crea su usuario; si algo falla, se revierte el commit.
- R3. La fase deducida del Drive está mal (p 3, i 1; datos). Se carga como «por confirmar» y el equipo la revisa en «Operación».
- R4. El equipo no registra las visitas y el panel queda vacío (p 2, i 3; uso). Registro corto desde el celular; Diego conversa con el equipo antes de abrirle el panel al cliente.
- R5. La migración falla en producción (p 1, i 2; producción). Solo agrega tablas y vuelve opcional una columna; si falla, el build se detiene y sigue la versión anterior.
- R6. Clerk en local y en producción con instancias distintas (p 2, i 1; producción). Se revisa cuáles llaves hay en Vercel antes de subir.

## 10. Documentos accesorios y qué queda fuera
- ADR 0010 «Dos caras: quién ve qué» (usuario, rol, grupo, alcance en el servidor). Nuevo.
- ADR 0011 «La gestión de venta y arriendo» (fases, historial de eventos, visitas y ofertas; Nexxos solo publica). Nuevo.
- `BRIEF.md`: actualizar «Lo que NO hacemos ahora» (ahora sí hay dos roles) y el usuario.
- `PENDIENTES.md`: «Cobrar según cada contrato» en espera; quitar «Producción es pública»; agregar la puesta en uso (crear usuarios, confirmar la lista de la carga, correr la carga en producción, conversar con el equipo, abrirle el panel al cliente y al piloto) y la respuesta de Convecta.
- Fuera: obras y costeo; Odoo (cobros); leer Nexxos (avisos o contactos); propietarios externos que se registran solos; la API para clientes grandes; el correo semanal; ordenar las carpetas del Drive (se recomienda la estructura de 6 subcarpetas, sin código); cobrar según cada contrato.

## 11. Qué revisar una vez construido
Diego:
- v1. Entra como cliente de prueba: ve solo las propiedades de ese grupo.
- v2. Como cliente, pega en la barra la dirección de una propiedad de otro grupo: no la ve.
- v3. Registra una visita desde el celular: aparece en el panel del cliente, sin el teléfono del interesado.
- v4. Baja un precio dos veces: el historial muestra los dos cambios con fecha y autor.
- v5. Registra una oferta y mueve la fase a «con oferta»: el panel lo muestra.
- v6. Asigna un servicio a Leo: aparece en «Operación» bajo Leo.
- v7. Revisa «Operación» después de la carga inicial: cada propiedad con su fase «por confirmar».
- v8. Entra como propietario piloto (su propiedad): ve solo esa.
Claude: lint y build; la carga inicial corrida dos veces sin duplicar; cada acción del servidor llamada con sesión de cliente responde «sin permiso»; el SQL de la migración leído.

## Respuesta de Diego
(pendiente)
