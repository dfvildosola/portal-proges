# TAREA — Etapa 1: el portal con dos caras (equipo Proges + cliente)

**Estado: plan v3 APROBADO por Diego el 2026-11-18 («ok, con workflow», d7 = a). En ejecución.** Tamaño: grande (regla 1). Página: https://claude.ai/artifact/1dW6hvZhqjEXQxVoSB1Vgo (v3). Branch: `plan/etapa-1-dos-caras`.

**Paso siguiente exacto:** el workflow de la parte 2 (run `wf_923d53be-386`, script en `~/.claude/projects/-Users-diegofigueroa-Code/6d01402a-ffd5-4528-a638-dead11bb388b/workflows/scripts/proges-etapa1-parte2-wf_923d53be-386.js`) está corriendo: A, después T, S, C, D y F. Al terminar: leer los informes, enchufar `ComercialPanel` (C) en el hueco `COMERCIAL` de `servicios/[sid]/page.tsx` (S), build, crear el primer admin con `scripts/crear-usuario.ts`, probar en el navegador, `revisor` enfocado, cierre contra el plan, ADR 0010 y 0011, `BRIEF.md`, `PENDIENTES.md`.

Nada de esto se vuelve a planificar: el plan v3 está aprobado y las decisiones cerradas.

## Estado de la ejecución
- Pieza 0 ✅ hecha (convenciones en `AGENTS.md`, catálogo en `prisma/datos/catalogo-servicios.csv`).
- El workflow va en dos partes, porque el hook `librerias` frena la instalación de `@clerk/nextjs` hasta que Diego escriba «instala @clerk/nextjs» (un subagente no puede recibir ese pedido):
  - **Parte 1** (no necesita Clerk): B → E y G. ✅ hecha y verificada por el coordinador el 2026-11-18 (tsc, lint, build, 19 casos de indicadores con TZ=UTC y TZ=America/Santiago, SQL de la migración leído: solo crea, agrega y quita el NOT NULL del ROL).
  - **Parte 2:** ⏳ en curso. `@clerk/nextjs` instalado a pedido de Diego (`bb6869d`, 2026-11-18); workflow lanzado: A → T, S, C, D y F. En la ola de cinco, cada agente corre solo tsc y lint (dos builds a la vez se pisan); el build lo corre el coordinador al final.
- Después: enchufar el componente de C en la página del servicio (S), verificación del repo, prueba en el navegador, `revisor` enfocado (login, `src/lib/cliente.ts`, migración), cierre contra el plan, ADR 0010 y 0011, `BRIEF.md`, `PENDIENTES.md`.

## Lo que dejó la parte 1 (para los encargos de la parte 2)
- Migración `20261118234053_etapa1_servicios`. Ids de etapas fijos y legibles (`etapa_venta_02_publicada`…).
- `src/lib/servicios.ts` exporta `TIPOS_SERVICIO`, `familiasDelTipo(tipo)`, `esComercial(tipo)`, los nombres de estados, y `diasPublicada`, `visitasUltimaSemana`, `visitasPorSemana`, `diasDesdeUltimaRebaja`, `indicadoresComerciales`, `diaChile()`.
- **`Visita.fecha` es «solo fecha»** (medianoche UTC, como el resto del proyecto): el formulario de visita pide el día, no la hora. `Evento.fecha` y `cerradoEl` son instantes y se llevan al día de Chile.
- El ROL quedó opcional también en el formulario de crear y editar propiedad.
- Carga inicial en `proges_dev`: 42 propiedades (63 filas − 20 vendidas − 1 carpeta de formatos), 32 servicios «por confirmar» (10 inspección, 10 venta, 6 obra, 6 administración). Conviven con las 80 inventadas del seed. El tipo de propiedad se dedujo de la dirección y hay que revisarlo; posibles duplicados sin resolver: Mirador 1851 (dos carpetas) y unidades de Agustinas 715 y Monjitas 550.

## Lo que se supo al preparar la pieza 0 (2026-11-18)
- El catálogo completo tiene 99 filas y seis familias: ADMP, ET, IRP, NV, RR y **SC (servicios complementarios)**, que el plan no nombraba.
- **t4 era falso:** el arriendo sí tiene código propio, `SC-600` «Comisión por servicio de corretaje arriendo». El tipo ARRIENDO ofrece los códigos de NV, SC y ADMP.
- **Tres códigos están repetidos en la Sheet** con nombres distintos: `RR-601` (luminarias / retiro de escombros), `RR-602` (interruptores / aseo general) y `RR-604` (normalización de circuitos / fletes). `RR-901` no tiene nombre y quedó fuera del CSV. El catálogo del portal no puede usar el código como llave única: usa código + nombre. Anotado en `PENDIENTES.md` para que Diego lo corrija en la Sheet y en Odoo.
- Qué tipo ofrece qué familias al abrir un servicio: EVALUACION → ET; INSPECCION → IRP; VENTA → NV; ARRIENDO → NV, SC, ADMP; OBRA → RR; ADMINISTRACION → ADMP. Los códigos SC se pueden elegir en cualquier tipo.
- Diego pidió (2026-11-18) llevar el seguimiento de la obra en el portal: tareas con avance en %, hitos, planificada al aprobarse el presupuesto y armada desde la orden de Odoo (ejemplo: S00047, 14 secciones por recinto, unas 70 partidas RR y 3 anticipos). **No entra en esta tarea:** es la tarea siguiente, anotada en `PENDIENTES.md`. El modelo queda listo: las tareas colgarían del servicio en curso de tipo OBRA.

## Lo que ya cerró Diego (2026-11-18)
- Convecta no ha respondido. El plan no depende de Nexxos: **solo publica los avisos**; toda la gestión se registra en el portal.
- **Se pausa «Cobrar según cada contrato»**: queda en `PENDIENTES.md`, en espera.
- **DuckDB y dbt quedan para la etapa en que entre Odoo.**
- **Decisiones de la v2, cerradas:** un solo tipo de usuario «cliente» con su alcance (d1 a); el cliente ve las visitas sin los datos del interesado (d2 b); carga inicial de las 42 sin las 20 posiblemente vendidas, después de que el equipo confirme la lista (d3 b); el cliente ve en vivo (d4 a); etapas propias por tipo de servicio (d5 b); acceso por sociedad (d6 b).
- **Correcciones a la v2:** no hay etapas consecutivas ni una etapa única por propiedad; una propiedad usa solo los servicios que necesita (puede ser solo papeles, solo toma de posesión, o solo venta o arriendo) y puede estar en venta y en arriendo a la vez.
- **Las etapas las propone Claude y después se editan dentro del portal.**
- **Los datos que hay hoy en el portal son inventados.**
- **El precio lo puede dar el propietario o lo sugiere Proges** (si le piden una evaluación).
- **Estándares:** ningún archivo sobre 800 líneas y la misma vara que el portal de RASA.
- Del cliente actual entrarían entre 3 y 5 personas; no se sabe si se separan por sociedad.
- Contexto: el cliente actual compra cartera de deuda (unas 80 propiedades, 20 a 25 activas) y pide reportes de corretaje que hoy van en un Word semanal; piloto de propietarios con Diego (1 propiedad) y un amigo (3); equipo: Álvaro, Cecilia, Leo Maris y François, sin responsable fijo por propiedad; catálogo de servicios en la Sheet `18YgGpb6fEHPLkq5TCAb6lKEWWtiXUANzrKEAIrihQEs` (pestaña «Odoo Servicios», 78 filas) y en Odoo; inventario del Drive en `docs/inventario-drive/`.

## Cambios de la v2 a la v3
- Se elimina la etapa del recorrido en la propiedad. **La unidad es el servicio en curso**: una propiedad tiene varios a la vez y cada uno avanza por las etapas de su tipo.
- La venta y el arriendo son servicios (tipo VENTA y ARRIENDO) con precio, visitas, ofertas y recomendación. No hay tabla `Gestion`.
- Las etapas son filas editables en `/equipo/etapas` (pieza nueva T), con dos marcas: cierra el servicio y propiedad publicada.
- El precio guarda quién lo fijó (propietario o sugerido por Proges).
- Sin agente implementador propio: las convenciones van en `AGENTS.md` (pieza 0). Decisión d7 sobre cuánta revisión.

## Estándares de construcción (la misma vara que el portal de RASA)
- Ningún archivo pasa de ~800 líneas: cada pestaña y cada formulario en su archivo. Hoy el más largo propio es `resumen/page.tsx` (579).
- Cada pieza pasa `npx tsc --noEmit && npm run lint && npm run build` antes de devolverse; no toca archivos fuera de su encargo; no hace commit; devuelve un informe corto.
- Cada agente lee `AGENTS.md` (convenciones) y la guía de Next en `node_modules/next/dist/docs/` antes de usar una API del framework.
- Un número vive en un solo lugar (`src/lib/servicios.ts`), errores explícitos, sin librerías nuevas fuera de Clerk, textos en español sin jerga, fechas con `src/lib/fechas.ts`.

## 1. Qué va a existir
- **Equipo Proges** (Álvaro, Cecilia, Leo, François, Diego): entra con su correo; ve y edita toda la cartera como hoy; abre en cada propiedad los servicios que necesita (tipo, código del catálogo, responsable), los mueve por sus etapas y los cierra (terminado o cancelado con motivo); en venta y arriendo lleva precio con historial, visitas, ofertas y recomendación; abre la carpeta del Drive desde la ficha; en «Operación» ve todos los servicios abiertos por tipo y etapa, por responsable, los «por confirmar» y las visitas de la semana.
- **Cliente:** entra con su correo y ve, solo lectura y dentro de su alcance (todo su grupo o solo algunas sociedades), su cartera con los servicios abiertos de cada propiedad y su etapa; en venta o arriendo, indicadores, precio y su historial, visitas con su evaluación, ofertas y recomendación.
- **Diego como admin:** crea usuarios y define su alcance, edita las etapas de cada tipo de servicio, ve el último ingreso de cada usuario.
- **Listo:** pasan tipos, lint y build; un cliente de prueba no ve ni abre una propiedad de otro grupo ni de una sociedad que no le toca; una propiedad tiene dos servicios abiertos a la vez y avanzan por separado; una etapa agregada o renombrada aparece al tiro; una visita registrada desde el celular aparece en el panel del cliente; cada cambio de etapa o precio queda en el historial; los indicadores coinciden con la cuenta a mano; ningún archivo nuevo sobre 800 líneas; ADRs y `PENDIENTES.md` al día.

## 2. Flujo de los usuarios
1. Admin crea los usuarios en `/equipo` y define su alcance. Pieza A.
2. Admin ajusta las etapas en `/equipo/etapas`, solo si hace falta. Pieza T.
3. Equipo abre un servicio en la ficha: tipo, código del catálogo, responsable. Parte en la primera etapa de su tipo. Los de la carga inicial vienen «por confirmar». Pieza S.
4. Equipo mueve la etapa: queda en el historial con fecha y autor. Pieza S.
5. En venta o arriendo, equipo registra el precio, quién lo fijó y el enlace del aviso; cada cambio pide motivo y queda en el historial. Pieza C.
6. Quien hizo la visita la registra desde el celular: fecha, quién la hizo, interesado, evaluación (1 a 5), comentario. Pieza C.
7. Equipo registra una oferta: monto, moneda, oferente, estado (recibida, aceptada, rechazada, caída). Pieza C.
8. El portal calcula los indicadores al mirar: días publicada, visitas por semana, días desde la última rebaja. Pieza G.
9. Equipo escribe la recomendación al propietario, fechada. Pieza C.
10. Equipo cierra el servicio: terminado o cancelado con motivo. Pieza S.
11. Equipo revisa «Operación». Pieza D.
12. Cliente abre su panel y el detalle de una propiedad. Pieza F.

**Etapas iniciales por tipo** (se siembran en la migración; después se editan en el portal):
- EVALUACION (familia ET): solicitada → en evaluación → informe entregado.
- INSPECCION (familia IRP: acercamiento, títulos, mercado, toma de posesión, recepción, trámites): solicitada → en gestión → informe entregado.
- VENTA (familia NV): captada → publicada → con visitas → con oferta → promesa firmada → escritura → inscrita y entregada.
- ARRIENDO (familias NV y ADMP): captada → publicada → con visitas → postulante en evaluación → contrato firmado → entregada con inventario → pasa a administración.
- OBRA (familia RR): presupuesto enviado → presupuesto aprobado → en obra → entregada.
- ADMINISTRACION (familia ADMP): activa → terminada.
La última de cada lista lleva la marca «cierra el servicio». En VENTA y ARRIENDO, desde «publicada» hasta antes del cierre llevan la marca «propiedad publicada».

## 3. Flujo de datos
- Fuentes: Drive (inventario ya hecho, `docs/inventario-drive/inventario.csv`: id de carpeta, conteo de documentos por tipo, `etapa_probable`, `confianza`), Sheet del catálogo (pieza 0 la exporta a `prisma/datos/catalogo-servicios.csv`), Clerk (quién entra), lo que el equipo escribe. Nexxos y Odoo no se leen ni se escriben.
- Postgres (nuevo):
  - `Usuario` (correo, nombre, rol EQUIPO o CLIENTE, grupoId si es cliente, alcance GRUPO o SOCIEDADES, admin, ultimoIngreso) y `UsuarioSociedad` (usuario, owner).
  - `Etapa` (tipo, nombre, orden, cierraServicio, propiedadPublicada, activa).
  - `Servicio` (catálogo: código, familia, nombre).
  - `ServicioEnCurso` (propiedad, servicio del catálogo, tipo, etapa, responsable, estado ABIERTO/TERMINADO/CANCELADO, motivo de cierre, fechas, nota, porConfirmar; para VENTA y ARRIENDO: precio y moneda vigentes, enlace del aviso, recomendación y su fecha).
  - `Evento` (servicio en curso, tipo ETAPA o PRECIO, valor anterior y nuevo como texto, fecha, autor, motivo; en PRECIO, origen PROPIETARIO o SUGERIDO_PROGES).
  - `Visita` y `Oferta`, colgando de un servicio en curso.
- Postgres (cambia): `Property.rolSII` pasa a opcional; `Property` suma `driveCarpetaId`. `Grupo` es el cliente: sus `Owner` (sociedades) son dueñas de las propiedades. El `estado` que ya existe no se toca.
- Servidor (nuevo): `src/proxy.ts` (Clerk), `src/lib/sesion.ts` (quién es y su alcance; anota el último ingreso), `src/lib/servicios.ts` (tipos, nombres e indicadores, funciones puras), `src/lib/cliente.ts` (todas las consultas del cliente, con alcance).
- Pantallas (nuevo): pestaña «Servicios» y enlace al Drive en la ficha; página del servicio; `/operacion`; `/equipo` y `/equipo/etapas`; `/cliente` y `/cliente/[id]`.
- Carga inicial, cómo deduce servicios «por confirmar» desde `etapa_probable`: evaluación inicial → INSPECCION; toma de posesión → INSPECCION; en regularización → INSPECCION; en reparación → OBRA; reparada o en comercialización → VENTA; oferta o promesa → VENTA; arrendada → ADMINISTRACION; sin clasificar o sin contenido → la propiedad sin servicios. Las 20 «posiblemente vendidas» no entran (d3 b).

## 4. Permisos
- Roles: EQUIPO (todo, como hoy), CLIENTE (solo lectura dentro de su alcance) y la marca admin (usuarios y etapas).
- Alcance de un cliente: todo su grupo, o solo algunas sociedades, como marca explícita. Una propiedad con varios dueños se ve si alguna de sus sociedades está en el alcance.
- Todo se exige en el servidor: cada consulta de `/cliente` filtra por el alcance; un CLIENTE que abre una ruta del equipo es redirigido a `/cliente`; todas las acciones del servidor exigen EQUIPO, y las de `/equipo` y `/equipo/etapas`, admin.
- El enlace al Drive y el contacto del interesado no salen por `src/lib/cliente.ts`.
- Las pantallas que ya existen no se reescriben: siguen siendo solo del equipo.
- Fuera: roles por sección y que el cliente administre a sus usuarios.

## 5. Decisiones
De Diego, por cerrar en la v3:
- d7. Cuánta revisión antes de mezclar: (a) enfocada ahora (el `revisor` sobre login, filtro del cliente y migración, más el cierre contra el plan) y completa antes de abrirle el panel al cliente real [rec.]; (b) `/code-review` completo ahora; (c) ninguna ahora.

De Claude:
- Los tipos de servicio son seis y están fijos en el código; sus etapas son filas editables.
- Cada etapa tiene dos marcas (cierra el servicio, propiedad publicada): los indicadores no dependen del nombre de la etapa.
- Una etapa con servicios adentro no se borra: se desactiva. El historial guarda el nombre de la etapa como texto, tal como era.
- Cancelar es una salida de cualquier servicio (con motivo), no una etapa.
- El precio guarda quién lo fijó en cada evento.
- Sin agente implementador propio: las convenciones van en `AGENTS.md`, que cargan todos los agentes; el control de cada pieza lo trae el workflow.
- Solo el admin edita las etapas.
- Login con Clerk; rol y alcance en la tabla `Usuario`; «solo algunas sociedades» como marca explícita.
- El cliente tiene pantallas propias y una sola puerta de datos (`src/lib/cliente.ts`).
- Los indicadores se calculan al mirar, en `src/lib/servicios.ts`; no se guardan.
- La etapa la mueve una persona; el portal no la cambia solo.
- `organizationId` sigue fijo en `org_proges`. Nexxos no se conecta: un campo para el enlace del aviso.

## 6. Supuestos
- t1. El cliente de cartera es un solo `Grupo`, y sus sociedades son las dueñas de las propiedades.
- t2. Los datos inventados que hay hoy se pueden borrar de producción antes de cargar los reales.
- t3. Una obra se registra como un solo servicio, sin el detalle de sus partidas ni costos.
- t4. Para el arriendo se usa un código del catálogo de la familia NV o ADMP: no hay uno propio.
- t5. Solo Diego edita las etapas; el equipo las usa.
- t6. Si una oferta se cae, el equipo devuelve la etapa a «con visitas» a mano.
- t7. Los códigos de la Sheet son los mismos que los productos de Odoo.
- t8. Cada persona del equipo tiene un correo propio (`@progesspa.cl`) para entrar.
- t9. La visita se registra el mismo día, desde el celular.
- t10. Las personas del equipo abren la carpeta del Drive con su propia cuenta de Google, que ya tiene acceso.

## 7. Lo que no debe pasar
- Un cliente ve o abre una propiedad, servicio, visita u oferta de otro grupo. Cómo: dos clientes de prueba de grupos distintos, abriendo `/cliente/[id]` del otro.
- Un usuario limitado a una sociedad ve una propiedad de otra sociedad de su mismo grupo. Cómo: cliente limitado a A abre `/cliente/[id]` de una de B.
- Un cliente modifica algo. Cómo: llamar cada acción del servidor con sesión de cliente.
- Editar las etapas rompe servicios o historial. Cómo: renombrar, reordenar y desactivar una etapa con servicios adentro.
- Un cambio de etapa o de precio se pierde. Cómo: cambiar dos veces y ver los dos eventos.
- El equipo y el cliente ven un indicador distinto para la misma propiedad. Cómo: ambos usan `src/lib/servicios.ts`; comparar ficha y panel.
- El cliente recibe el enlace del Drive o el contacto del interesado. Cómo: revisar lo que entrega `src/lib/cliente.ts`.
- Se cargan datos reales en producción antes de publicar el login. Cómo: el orden de la puesta en uso en `PENDIENTES.md`.
- Se escribe en Odoo o en Nexxos. Cómo: ninguna pieza los usa.
- La migración borra o cambia datos existentes. Cómo: leer el SQL antes de mezclar (ADR 0009).
- Un archivo pasa de 800 líneas. Cómo: `wc -l` de los archivos tocados al cerrar.

## 8. Piezas y orden
Pieza 0 (coordinador, antes del workflow): sección «Convenciones de frontend» en `AGENTS.md`, escrita desde lo que el código ya hace; exportar el catálogo a `prisma/datos/catalogo-servicios.csv`.

Olas: [B] → [A, E, G] → [T, S, C, D, F]. 9 agentes en Sonnet. Verificación común: `npx tsc --noEmit && npm run lint && npm run build`.
- ✅ 0. Convenciones y catálogo (coordinador).
- ✅ B. Esquema, catálogo y etapas iniciales. `prisma/schema.prisma`, migración nueva (siembra las etapas), `scripts/cargar-catalogo.ts`. Verifica: `npx prisma migrate dev` aplica en `proges_dev`, el catálogo carga, existen las seis listas de etapas, build.
- ⏳ A. Login, alcance y accesos. `src/proxy.ts`, `src/lib/sesion.ts`, `src/app/layout.tsx`, `src/app/(app)/layout.tsx`, `src/app/(app)/equipo/` (usuarios; con el enlace a Etapas), pantalla de entrar, `src/lib/nav.ts` (ítem Equipo). Depende de B. Verifica: común, y entrar en local con un EQUIPO, un CLIENTE de todo el grupo y uno limitado a una sociedad.
- ✅ E. Carga inicial. `scripts/carga-inicial.ts`. Depende de B. Verifica: correrlo dos veces en `proges_dev`; el segundo no crea nada.
- ✅ G. Reglas e indicadores. `src/lib/servicios.ts`, `scripts/probar-indicadores.ts`. Depende de B. Verifica: `npx tsx scripts/probar-indicadores.ts`.
- ◻️ T. Etapas editables. `src/app/(app)/equipo/etapas/`. Depende de A y B. Verifica: común; agregar, renombrar, reordenar, desactivar; una con servicios no se borra; aviso si falta la etapa que cierra o la publicada.
- ◻️ S. Servicios en la ficha. `src/app/(app)/propiedades/[id]/servicios-*.tsx`, `src/app/(app)/propiedades/[id]/servicios/[sid]/page.tsx`, `src/app/(app)/propiedades/servicios-actions.ts`, y en `[id]/page.tsx` la pestaña nueva y el enlace al Drive. Depende de A, B y G. Verifica: común; dos servicios en una propiedad, moverlos por separado, cerrar uno y cancelar el otro.
- ◻️ C. Venta y arriendo. `src/app/(app)/propiedades/[id]/comercial-*.tsx`, `src/app/(app)/propiedades/comercial-actions.ts`. Depende de A, B y G. Verifica: común; precio, visita, oferta y recomendación, también a ancho de celular. No toca la página del servicio (es de S): el coordinador enchufa su componente al terminar la ola.
- ◻️ D. Operación. `src/app/(app)/operacion/`, `src/lib/nav.ts` (ítem Operación; A ya soltó ese archivo en la ola anterior). Depende de A, B y G. Verifica: común; los servicios por tipo y etapa con datos de la carga inicial.
- ◻️ F. Panel del cliente. `src/app/cliente/`, `src/lib/cliente.ts`. Depende de A, B y G. Verifica: común; la prueba con tres clientes (otro grupo, todo el grupo, limitado a una sociedad).

## 9. Riesgos
- R1. Una consulta del cliente olvida el filtro por alcance (p 2, i 3; datos). Todas en `src/lib/cliente.ts`; prueba con tres clientes; lo mira el revisor.
- R2. Publicar el login cambia producción, que hoy es pública (p 2, i 2; producción). Diego se crea su usuario antes de subir; si falla, se revierte el commit. Los datos son inventados.
- R3. Los servicios deducidos del Drive están mal (p 3, i 1; datos). Entran «por confirmar»; solo 27 de 62 carpetas tienen confianza alta.
- R4. El equipo no registra las visitas y el panel queda vacío (p 2, i 3; datos). Registro corto desde el celular; Diego conversa con el equipo antes de abrir el panel.
- R5. La migración falla en producción (p 1, i 2; producción). Solo agrega; si falla, el build se detiene y sigue la versión anterior.
- R6. Clerk en local y en producción con instancias distintas (p 2, i 1; producción). Se revisan las llaves en Vercel antes de subir.
- R7. Las etapas propuestas no calzan con cómo trabaja el equipo (p 3, i 1; datos). Se editan en el portal; revisarlas con Leo, François y Cecilia antes de la carga real.
- R8. Una lista de etapas queda sin etapa final o sin «publicada» (p 2, i 1; datos). La pantalla de etapas avisa.
- R9. El cliente no se organiza por sociedad (p 2, i 1; datos). Parte con todos viendo todo el grupo.

## 10. Documentos accesorios y qué queda fuera
- `AGENTS.md`: sección «Convenciones de frontend» (pieza 0).
- ADR 0010 «Dos caras: quién ve qué». Nuevo.
- ADR 0011 «El servicio en curso como unidad» (tipos fijos, etapas editables con dos marcas, historial por eventos, venta y arriendo; Nexxos solo publica). En «Lo que queda fuera», con su gatillo: DuckDB y dbt (cuando entre Odoo), pedir un servicio desde el panel, costos por propiedad, correo semanal. Nuevo.
- `BRIEF.md`: actualizar «Lo que NO hacemos ahora» y el usuario.
- `PENDIENTES.md`: cobranza en espera; quitar «Producción es pública»; agregar la puesta en uso (crear usuarios, revisar etapas con el equipo, borrar los datos inventados, confirmar la lista y cargar, abrir el panel al cliente y al piloto) y la respuesta de Convecta.
- Fuera: DuckDB y dbt; tipos de servicio nuevos creados desde el portal; roles por sección y que el cliente administre a sus usuarios; pedir un servicio desde el panel; partidas, costos y resultado por propiedad; Odoo (cobros); leer Nexxos; propietarios externos que se registran solos; la API para clientes grandes; el correo semanal; ordenar las carpetas del Drive; cobrar según cada contrato.

## 11. Qué revisar una vez construido
Diego:
- v1. Entra como cliente de prueba: ve solo las propiedades de ese grupo, con sus servicios abiertos y su etapa.
- v2. Como cliente, pega la dirección de una propiedad de otro grupo: no la ve.
- v3. Entra como cliente limitado a una sociedad: ve solo las de esa sociedad.
- v4. Abre un servicio de venta y uno de arriendo en la misma propiedad: avanzan por separado.
- v5. En `/equipo/etapas`, agrega una etapa a Obra y renombra otra: aparecen al tiro; el historial viejo conserva el nombre anterior.
- v6. Intenta borrar una etapa con servicios adentro: no deja, ofrece desactivarla.
- v7. Registra una visita desde el celular: aparece en el panel del cliente, sin el teléfono del interesado.
- v8. Baja un precio dos veces (una como propietario, otra como sugerido por Proges): el historial muestra los dos con quién lo fijó, y «días desde la última rebaja» vuelve a cero.
- v9. Cuenta a mano los días publicada y las visitas: coinciden con los indicadores en la ficha y en el panel.
- v10. Asigna un servicio a Leo y cancela otro con motivo: el primero aparece en «Operación» bajo Leo; el cancelado sale de los abiertos.
- v11. Revisa «Operación» después de la carga inicial: los servicios deducidos aparecen «por confirmar».
- v12. Toca el enlace al Drive y después mira `/equipo`: abre la carpeta; el cliente no tiene el enlace; queda el último ingreso.
Claude: tipos, lint y build; `npx tsx scripts/probar-indicadores.ts`; la carga inicial dos veces sin duplicar; cada acción del servidor con sesión de cliente responde «sin permiso»; el SQL de la migración leído; `wc -l` de los archivos tocados.

## Respuestas de Diego
**A la v2 (2026-11-18):** «ok, con workflow», con d1 a, d2 b, d3 b, d4 a, d5 b (distinto de lo propuesto) y d6 b. Marcó falsos cuatro supuestos (etapa única y una sola gestión; datos de prueba que conviven; el precio lo decide el propietario; siete etapas consecutivas) y «no sé» el de separar por sociedad. No se ejecutó: las correcciones cambiaban el diseño. El texto completo está en el commit `2a0b1e9`.

**A la v3 (2026-11-18):**
```
ok, con workflow
Plan: etapa 1 de Proges, versión 3

Decisiones:
- ¿Cuánta revisión antes de mezclar? Enfocada ahora, completa antes de abrirle el panel al cliente real

Supuestos que no son así:
- ninguno marcado

Supuestos que no sé:
- Una obra se registra como un solo servicio (presupuesto → entregada), sin el detalle de sus partidas ni costos.
```
