# 0010 — Dos caras: cada cliente en su portal, Proges en todos

Fecha: 2026-11-18, reescrita el 2026-11-19 · Estado: aceptada (plan v6 de la etapa 1, d17 b y d25 a; aprobado por Diego). Reemplaza la versión de la v4, en la que el equipo elegía un «cliente activo» y solo miraba su cartera.

## Contexto

Hasta hoy el portal no tenía login: cualquiera con la dirección podía ver, crear y borrar. Servía porque los datos eran inventados. La etapa 1 trae datos reales, y con ellos hay que resolver quién entra, qué ve cada uno y cómo se asegura que un cliente nunca vea lo de otro.

**Ese portal es el producto para el cliente.** Cada dueño administra su cartera (propiedades, contratos, cobranza, cuentas) y le pide servicios a Proges. Proges es el proveedor: trabaja con las carteras de todos los clientes.

La v4 de este ADR dejaba al equipo mirando **un cliente a la vez** y sin poder editar su cartera. En la práctica eso estorbaba: el equipo trabaja con varios clientes en el mismo día, y para cargar o corregir un dato tenía que pedírselo al dueño. Diego lo cambió el 2026-11-19: el equipo ve a todos los clientes juntos y escribe en cualquiera (d17 b), y el dueño sigue editando lo suyo pero no toca la obra ni las tareas (d25 a).

Los clientes de hoy:
- **Los dueños del piloto** (Diego con una propiedad, un amigo con tres): administran su cartera ellos mismos.
- **NPL**, el que compra carteras: tiene 4 o 5 empresas dueñas de las propiedades. Comunica las propiedades en reuniones y Proges las gestiona. Ninguna propiedad es de Proges.

## Decisión

**Quién entra lo dice Clerk; qué puede hacer lo dice la tabla `Usuario`.** Clerk es el servicio que revisa la identidad (código por correo o Google). Funciona como la portería de un edificio: Clerk revisa el carnet, y la lista de residentes autorizados es la tabla `Usuario`, que el admin llena en `/equipo`. Un correo que pasa por Clerk pero no está en la tabla llega a «Tu correo no tiene acceso». Nadie se registra solo.

**Cada cliente es un espacio** (tabla `Organizacion`, tipo CLIENTE). Piensa en un edificio de oficinas: cada cliente tiene su piso. Técnicamente, el espacio es el campo `organizationId` que llevan todas las tablas: vale el id del cliente dueño de esos datos. El espacio de Proges (`org_proges`, tipo PROGES) guarda lo que es común a todos: el catálogo de servicios, las etapas, el equipo y los maestros.

**Quién puede qué:**
- **CLIENTE** (el dueño): pertenece a un solo cliente. **Lee y escribe solo su piso**: edita propiedades, contratos, cobranza, cuentas, dueños y contactos, marca un arriendo pagado y pide servicios. No toca tareas, bitácora, presupuestos ni nada de la obra, y nunca ve el costo del maestro (d25 a).
- **EQUIPO** (Álvaro, Cecilia, Leo, François, Diego): lleva la llave maestra. **Lee todos los pisos a la vez** (con un filtro «Cliente» en las listas) y **escribe en cualquiera**, siempre en el piso del registro que toca. Además gestiona los servicios y la obra.
- **Jefatura** y **admin** son marcas del EQUIPO: la jefatura aprueba presupuestos de maestros y cierra obras; el admin crea clientes y usuarios y edita las etapas.

**Si el dueño y el equipo cambian lo mismo, vale el último que guarda, y queda quién fue.** No hay bloqueo ni aviso de conflicto: es como dos personas que corrigen la misma planilla, gana la última y la celda dice quién. Propiedades, contratos y cobros llevan el campo `modificadoPorId`, y la ficha de la propiedad y del contrato muestra «Modificado por <nombre> el <fecha>».

**NPL tiene su usuario como cualquier cliente.** Parte con uno a cargo de Proges, con un correo que controla Proges. Sus empresas son las sociedades dueñas (`Owner`) dentro de su espacio. No hace falta una regla especial.

**El permiso se exige en el servidor, en puntos que no dependen de que alguien se acuerde.** Las puertas están en `src/lib/org.ts`:
1. `src/proxy.ts`: sin sesión de Clerk no se ve ninguna página, salvo `/entrar`.
2. **`espaciosQueLee(filtro?)`: para las listas.** Devuelve los pisos que se pueden leer: para un cliente, el suyo (ignora el filtro); para el equipo, todos los clientes activos o solo el del filtro si es un cliente válido. Las listas consultan `organizationId in espaciosQueLee(...)`.
3. **`exigirLectura(orgIdDelRegistro)` (y su versión que responde sí o no, `puedeLeerEn`): para los detalles.** La página busca el registro por su id y comprueba que su piso se puede leer; si no, responde «no encontrado» como si no existiera.
4. **`espacioParaEscribirEn(orgIdDelRegistro)`: para escribir.** El piso de una escritura sale **del registro que se toca** (el de la propiedad, el del contrato, el del cobro), nunca de algo que mande el navegador. El cliente solo pasa si el registro es de su piso; el equipo, si es de un cliente activo. Para crear una propiedad, un contacto o un dueño, que no cuelgan de nada, el cliente crea en el suyo y el equipo elige el cliente en el formulario (`espacioParaCrear`).
5. **Las acciones de servicios y obra exigen EQUIPO** (`equipoEnAccion()` en `src/lib/sesion.ts`), y las que aprueban o cierran, jefatura (`jefaturaEnAccion()`).
6. **Lo que cruza clientes con filtros propios vive en `src/lib/operacion.ts`** (la bandeja y Operación), que exige EQUIPO.
7. **Lo que el cliente ve de un servicio o una obra sale de `src/lib/vista-cliente.ts`.** Es como la ventanilla de un banco: el cliente no entra a la bóveda, recibe lo que la ventanilla le pasa. Usa `select` explícito, así que una columna nueva no le llega al cliente sin que alguien lo decida ahí.

**Lo que el cliente no ve** (decisión d2 b): el nombre y contacto del interesado de una visita, quién hizo la visita, el oferente y la nota de una oferta, el autor y el motivo de un cambio de precio, el responsable, el enlace del aviso, el motivo de cierre, el enlace del Drive, el ROL y los servicios «por confirmar» (son suposiciones de la carga inicial hasta que el equipo los revise). Con la obra se suman: los montos del maestro, sus presupuestos, facturas y pagos, y las notas de la bitácora que no se marcaron «la ve el dueño».

**El cliente ve en vivo** (decisión d4 a): lo que el equipo registra aparece al tiro en su portal.

## Alternativas descartadas

- **El equipo elige un «cliente activo» y mira solo ese** (la v4, con una cookie en la cabecera). Obligaba a cambiar de cliente para cada cosa y no dejaba ver el trabajo de todos juntos. Se quita el selector y la cookie.
- **El equipo ve la cartera pero no la edita** (la v4). Dejaba al equipo pidiéndole al dueño que corrigiera sus propios datos. Se revierte: el equipo escribe, y el campo «modificado por» deja el rastro.
- **Bloquear la edición mientras otro la tiene abierta.** Con tan pocas personas editando lo mismo, un bloqueo molesta más de lo que protege. Vale el último que guarda.
- **Pantallas del equipo y vitrina aparte para el cliente** (la v3). Al revés de lo que es el producto: el cliente es quien administra su cartera.
- **Organizaciones de Clerk, una por cliente.** Habría dejado la lista de quién puede qué en un servicio externo, fuera de las consultas. El `organizationId` ya estaba en todas las tablas.
- **Usuarios de cliente que solo miran** (d9 a). Diego eligió que todos administren: más simple, y no hay hoy un cliente que lo necesite.
- **Límite por sociedad dentro de un cliente** (d6 b de la v3, d10 de la v4). Habría que aplicarlo en todo el portal y nadie lo ha pedido. Se agrega cuando un cliente lo pida.

## Consecuencias

- `scripts/probar-espacios.ts` prueba con dos clientes que nadie ve lo ajeno (un cliente que pide el filtro de otro sigue leyendo solo lo suyo), que el equipo lee todos los clientes o el del filtro, que el equipo escribe en cualquier cliente activo y el cliente solo en el suyo, y que no sale ningún dato interno. Se corre antes de mezclar un cambio en `src/lib/org.ts`, `src/lib/sesion.ts`, `src/lib/vista-cliente.ts` o `src/lib/operacion.ts`.
- **Ahora el equipo escribe en el piso equivocado si una acción se equivoca de registro.** Por eso cada acción saca el piso del registro que toca y comprueba además que lo que cuelga de él (el arrendatario de un contrato, el grupo de un dueño) es del mismo piso.
- **El comentario de una visita lo lee el cliente.** Es texto libre: el formulario lo advierte para que no se escriban ahí datos del interesado.
- **Las listas del equipo mezclan clientes**, así que llevan el nombre del cliente en cada fila y un filtro «Cliente» (`?cliente=`) en propiedades, contratos, cobranza, cuentas, dueños, contactos, pendientes y resumen.
- **Desactivar un cliente le corta la entrada a todos sus usuarios** y saca sus datos de las listas del equipo; sus datos quedan intactos y se puede reactivar.
- El primer admin no puede crearse desde `/equipo` (todavía no hay quien entre): se crea con `npx tsx scripts/crear-usuario.ts --email … --nombre … --admin`.
- Local y producción usan instancias distintas de Clerk (llaves `pk_test` y `pk_live`); hay que revisarlas en Vercel antes de subir.
- Los datos inventados de antes quedan en `org_proges`, que no es un cliente y no aparece en el filtro: en producción no los ve nadie y se borran.
- **Fuera por ahora:** usuarios que solo miran, límite por sociedad, que un cliente cree sus propios usuarios, un usuario en varios clientes, propietarios que se registran solos y la API para clientes grandes.
