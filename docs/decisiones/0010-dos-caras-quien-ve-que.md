# 0010 — Dos caras: quién ve qué

Fecha: 2026-11-18 · Estado: aceptada (plan v3 de la etapa 1, aprobado por Diego) · Reemplaza el pendiente «Producción es pública: falta el login»

## Contexto

Hasta hoy el portal no tenía login: cualquiera con la dirección podía ver, crear y borrar. Servía porque los datos eran inventados. La etapa 1 trae dos cosas que no aguantan eso: los datos reales de la cartera y un cliente (el que compra cartera de deuda) que va a mirar sus propiedades desde afuera. Hoy ese cliente recibe un Word semanal; la idea es que lo vea en vivo.

Hay que resolver tres preguntas: quién entra, qué ve cada uno y cómo se asegura que un cliente nunca vea lo de otro.

## Decisión

**Quién entra lo dice Clerk; qué puede hacer lo dice la tabla `Usuario`.** Clerk es el servicio que revisa la identidad (código por correo o Google). Funciona como la portería de un edificio: Clerk revisa el carnet, y la lista de residentes autorizados es la tabla `Usuario`, que el admin llena en `/equipo`. Un correo que pasa por Clerk pero no está en la tabla llega a «Tu correo no tiene acceso». Nadie se registra solo.

**Dos roles y una marca** (decisión d1 a):
- **EQUIPO** (Álvaro, Cecilia, Leo, François, Diego): todo lo de siempre, con permiso para escribir.
- **CLIENTE**: solo lectura, en sus propias pantallas (`/cliente`), sin el menú del equipo.
- **admin**: una marca de EQUIPO; crea usuarios y edita las etapas.

**El alcance de un cliente es su grupo o algunas de sus sociedades** (decisión d6 b). El `Grupo` es el cliente; sus `Owner` (sociedades) son dueñas de las propiedades. Un usuario cliente ve todo el grupo, o solo las sociedades que se le marcan. Una propiedad con varios dueños se ve si alguna de sus sociedades está en el alcance. Se parte con todos viendo todo el grupo, porque no se sabe todavía si el cliente se organiza por sociedad.

**El permiso se exige en el servidor, en tres puntos que no dependen de que alguien se acuerde:**
1. `src/proxy.ts`: sin sesión de Clerk no se ve ninguna página, salvo `/entrar`.
2. `getOrgId()` (`src/lib/org.ts`) exige un EQUIPO activo. Como **todas** las pantallas y acciones del equipo ya la llamaban para filtrar por organización, quedaron protegidas sin tocarlas. Las acciones nuevas parten con `equipoEnAccion()` o `adminEnAccion()` (`src/lib/sesion.ts`).
3. **El cliente tiene una sola puerta de datos:** `src/lib/cliente.ts`. Es como la ventanilla de un banco: el cliente no entra a la bóveda, recibe lo que la ventanilla le pasa. Cada función recibe el usuario, filtra por su alcance (escrito una vez) y usa `select` explícito, así que una columna nueva no sale al cliente sin que alguien lo decida ahí.

**Lo que el cliente no ve** (decisión d2 b): el enlace al Drive, el ROL, el nombre y contacto del interesado de una visita, quién hizo la visita, el oferente y la nota de una oferta, el autor y el motivo de un cambio de precio, el responsable, el enlace del aviso, el motivo de cierre y los servicios «por confirmar» (son suposiciones de la carga inicial hasta que el equipo los revise).

**El cliente ve en vivo** (decisión d4 a): lo que el equipo registra aparece al tiro en su panel.

## Alternativas descartadas

- **Rol y alcance guardados en Clerk** (sus «metadatos»). Habría dejado la lista de quién puede qué en un servicio externo, fuera de la base y de las consultas. La tabla `Usuario` se consulta junto con lo demás.
- **Organizaciones de Clerk, una por cliente.** Resuelve el aislamiento entre empresas, pero no el alcance por sociedad dentro de un mismo cliente, y agrega una pieza más. `organizationId` sigue fijo en `org_proges`.
- **Pantallas compartidas con botones escondidos para el cliente.** Un botón escondido no es un permiso: la acción sigue existiendo. Por eso el cliente tiene pantallas propias, de solo lectura y sin acciones.

## Consecuencias

- `scripts/probar-alcance.ts` prueba con tres clientes (otro grupo, todo el grupo, limitado a una sociedad) que nadie ve lo ajeno y que no sale ningún dato interno. Se corre antes de mezclar un cambio en `src/lib/cliente.ts`.
- El primer admin no puede crearse desde `/equipo` (todavía no hay quien entre): se crea con `npx tsx scripts/crear-usuario.ts --email … --nombre … --admin`.
- Local y producción usan instancias distintas de Clerk (llaves `pk_test` y `pk_live`); hay que revisarlas en Vercel antes de subir.
- **Fuera por ahora:** roles por sección, que el cliente administre a sus usuarios, propietarios externos que se registran solos y la API para clientes grandes.
