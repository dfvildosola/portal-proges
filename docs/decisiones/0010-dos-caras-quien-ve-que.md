# 0010 — Dos caras: cada cliente en su portal, Proges en todos

Fecha: 2026-11-18 · Estado: aceptada (plan v4 de la etapa 1, aprobado por Diego; reemplaza la versión de la v3 del mismo día) · Reemplaza el pendiente «Producción es pública: falta el login»

## Contexto

Hasta hoy el portal no tenía login: cualquiera con la dirección podía ver, crear y borrar. Servía porque los datos eran inventados. La etapa 1 trae datos reales, y con ellos hay que resolver quién entra, qué ve cada uno y cómo se asegura que un cliente nunca vea lo de otro.

La v3 de este ADR se equivocó de concepto: trató las pantallas de siempre (propiedades, contratos, cobranza, cuentas) como herramienta interna de Proges y le armó al cliente una vitrina aparte de solo lectura (`/cliente`). Diego lo corrigió el 2026-11-18: **ese portal es el producto para el cliente.** Ahí cada dueño administra su cartera y le pide servicios a Proges. Proges es el proveedor: ve las carteras de todos para hacer su trabajo, pero no las edita.

Los clientes de hoy:
- **Los dueños del piloto** (Diego con una propiedad, un amigo con tres): administran su cartera ellos mismos.
- **NPL**, el que compra carteras: tiene 4 o 5 empresas dueñas de las propiedades. Comunica las propiedades en reuniones y Proges las gestiona; antes usaban un portal antiguo y poco claro. Ninguna propiedad es de Proges.

## Decisión

**Quién entra lo dice Clerk; qué puede hacer lo dice la tabla `Usuario`.** Clerk es el servicio que revisa la identidad (código por correo o Google). Funciona como la portería de un edificio: Clerk revisa el carnet, y la lista de residentes autorizados es la tabla `Usuario`, que el admin llena en `/equipo`. Un correo que pasa por Clerk pero no está en la tabla llega a «Tu correo no tiene acceso». Nadie se registra solo.

**Cada cliente es un espacio** (tabla `Organizacion`, tipo CLIENTE). Es como un edificio de departamentos: cada cliente tiene su departamento con llave propia, y nadie entra al de otro. Técnicamente, el espacio es el campo `organizationId` que ya tenían todas las tablas desde el principio: antes valía siempre `org_proges`; ahora vale el del cliente dueño de esos datos. El espacio de Proges (`org_proges`, tipo PROGES) guarda lo que es común a todos: el catálogo de servicios y las etapas.

**Dos roles:**
- **CLIENTE**: pertenece a un solo cliente y **administra** su espacio: edita propiedades, contratos, cobranza y cuentas, y pide servicios (decisión d9 b: todos administran, no hay usuarios que solo miran).
- **EQUIPO** (Álvaro, Cecilia, Leo, François, Diego): elige un **cliente activo** en la cabecera y ve su cartera **en solo lectura**. Gestiona los servicios: acepta o rechaza pedidos, mueve etapas, registra precios, visitas y ofertas. En «Operación» ve a todos los clientes a la vez.
- **admin**: una marca del EQUIPO; crea clientes, usuarios y edita las etapas.

**NPL tiene su usuario como cualquier cliente.** Parte con uno a cargo de Proges, con un correo que controla Proges, para cargar sus propiedades. Cuando NPL quiera, se le dan usuarios propios. Sus empresas son las sociedades dueñas (`Owner`) dentro de su espacio. Así no hace falta una regla especial para NPL.

**El permiso se exige en el servidor, en puntos que no dependen de que alguien se acuerde:**
1. `src/proxy.ts`: sin sesión de Clerk no se ve ninguna página, salvo `/entrar`.
2. **Un solo punto para leer: `getOrgId()`** (`src/lib/org.ts`). Para un cliente devuelve su espacio y punto; para el equipo, el cliente activo, guardado en una cookie y validado contra la tabla. Un cliente que manda una cookie ajena no cambia nada: para él la cookie ni se lee.
3. **Un solo punto para escribir la cartera: `orgParaEscribir()`.** Solo un cliente pasa; al equipo le responde «La cartera la edita el cliente. Proges solo la ve». Todas las acciones de la cartera lo usan.
4. **Las acciones de servicios exigen EQUIPO** (`equipoEnAccion()` en `src/lib/sesion.ts`).
5. **Lo que cruza clientes vive en un solo archivo:** `src/lib/operacion.ts`, que exige EQUIPO. Es la única puerta por la que se ven varios espacios a la vez.
6. **Lo que el cliente ve de un servicio sale de `src/lib/vista-cliente.ts`.** Es como la ventanilla de un banco: el cliente no entra a la bóveda, recibe lo que la ventanilla le pasa. Usa `select` explícito, así que una columna nueva no le llega al cliente sin que alguien lo decida ahí.

**Lo que el cliente no ve** (decisión d2 b): el nombre y contacto del interesado de una visita, quién hizo la visita, el oferente y la nota de una oferta, el autor y el motivo de un cambio de precio, el responsable, el enlace del aviso, el motivo de cierre, el enlace del Drive, el ROL y los servicios «por confirmar» (son suposiciones de la carga inicial hasta que el equipo los revise).

**El cliente ve en vivo** (decisión d4 a): lo que el equipo registra aparece al tiro en su portal.

## Alternativas descartadas

- **Pantallas del equipo y vitrina aparte para el cliente** (la v3). Al revés de lo que es el producto: el cliente es quien administra su cartera.
- **Organizaciones de Clerk, una por cliente.** Habría dejado la lista de quién puede qué en un servicio externo, fuera de las consultas. El `organizationId` ya estaba en todas las tablas.
- **El equipo edita la cartera de cualquier cliente.** Diego lo descartó: el dueño de los datos es el cliente. Para NPL, que no carga sus propiedades, Proges usa un usuario de NPL, no un permiso especial.
- **Usuarios de cliente que solo miran** (d9 a). Diego eligió que todos administren: más simple, y no hay hoy un cliente que lo necesite.
- **Límite por sociedad dentro de un cliente** (d6 b de la v3, d10 de la v4). Habría que aplicarlo en todo el portal y nadie lo ha pedido. Se agrega cuando un cliente lo pida.

## Consecuencias

- `scripts/probar-espacios.ts` prueba con dos clientes que nadie ve lo ajeno, que la cookie no le sirve a un cliente, que el equipo no escribe la cartera y que no sale ningún dato interno. Se corre antes de mezclar un cambio en `src/lib/org.ts`, `src/lib/sesion.ts`, `src/lib/vista-cliente.ts` o `src/lib/operacion.ts`.
- **El comentario de una visita lo lee el cliente.** Es texto libre: el formulario lo advierte para que no se escriban ahí datos del interesado.
- El primer admin no puede crearse desde `/equipo` (todavía no hay quien entre): se crea con `npx tsx scripts/crear-usuario.ts --email … --nombre … --admin`.
- Local y producción usan instancias distintas de Clerk (llaves `pk_test` y `pk_live`); hay que revisarlas en Vercel antes de subir.
- Los datos inventados de antes quedan en `org_proges`, que no es un cliente y no aparece en el selector: en producción no los ve nadie y se borran.
- **Fuera por ahora:** usuarios que solo miran, límite por sociedad, que un cliente cree sus propios usuarios, un usuario en varios clientes, propietarios que se registran solos y la API para clientes grandes.
