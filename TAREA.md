# TAREA — Etapa 1: el portal con dos caras (equipo Proges + cliente)

**Estado: plan v5 ESPERANDO APROBACIÓN de Diego (2026-11-19).** Tamaño: grande (regla 1). Página: https://claude.ai/artifact/1dW6hvZhqjEXQxVoSB1Vgo (v5). Branch: `plan/etapa-1-dos-caras` (sin mezclar; la v4 está construida y cerrada, commits `19ef648` a `92bcc14`; el plano de la v4 queda en git, commit `92bcc14`).

**Paso siguiente exacto:** Diego recorre la página v5, marca d12 a d16 y los supuestos, y pega su respuesta. Con «ok, con workflow»: anotar la respuesta acá, commit, y lanzar el workflow de la sección 8 (molde: `~/.claude/projects/-Users-diegofigueroa-Code/6d01402a-ffd5-4528-a638-dead11bb388b/workflows/scripts/proges-etapa1-v4-wf_8cb15232-5e1.js`). La base de pruebas es `proges_dev_v4` (Diego todavía no eligió entre reiniciar `proges_dev` o pasar `.env` a esa base).

## Por qué hay una v5

Al ver la v4, Diego dijo (2026-11-19): «el portal interno para Proges no está enfocado en la gestión ni desarrollo de las actividades o tareas que ellos tienen a partir de los servicios ofrecidos». La v4 registra en qué etapa va cada servicio (un marcador), pero no ayuda a hacer el trabajo (una pizarra).

Cómo se trabaja hoy, según Diego (2026-11-19):
- Un servicio nuevo lo toma Cecilia o Álvaro, y ellos reparten quién hace qué. No hay un curso fijo: puede llegar una toma de posesión de una propiedad que no conocían, o un servicio nuevo para una propiedad donde ya trabajaron.
- Lo más común: tomas de posesión, regularización documental, venta, mostrar propiedades, ir a ver o recepcionar para un cliente, y reparaciones y mantenimiento con maestros.
- Hoy las tareas no se llevan en ningún lado: están en la cabeza de cada uno y en WhatsApp. Al terminar, alguien las vacía en un Word. No queda registro ni las jefaturas pueden seguirlas.
- Lo que más problemas da: **las reparaciones y mantenimientos**, y **el reporte de una propiedad en venta** (visitas, anuncios, historial de precios) para que el dueño decida.
- Reparaciones: los maestros son en general los mismos. El maestro manda un presupuesto que se aprueba: es gran parte del costo de Proges y la base del presupuesto que Proges le presenta al dueño. **Proges le paga al maestro y gestiona el trabajo.** Falta rigurosidad y trazabilidad durante la gestión, en la recepción del trabajo y después al comparar con lo planificado.

**Lo de la v4 que sigue tal cual:** espacios por cliente, solicitudes, la vista del cliente, el catálogo, las etapas, venta y arriendo, los indicadores.
**Lo que cambia:** la cara del equipo pasa a girar en torno a las tareas y la bitácora de cada servicio, y entra el módulo de reparaciones.

## 1. Qué va a existir
- **Cecilia o Álvaro (jefatura):** al abrir o aceptar un servicio, le anotan las tareas: qué, quién y para cuándo. En «Trabajo del equipo» ven las tareas de todos: atrasadas, de la semana, por persona. Aprueban el presupuesto del maestro.
- **Cada persona del equipo:** en «Mi trabajo» ve sus tareas abiertas y atrasadas. Desde el celular anota en la **bitácora** del servicio lo que pasa, con fotos, en el momento: «fui, faltaba la llave del medidor». Marca sus tareas hechas.
- **Reparaciones** (servicios de tipo Obra): se cargan los maestros; el presupuesto de cada maestro, por partidas, con su PDF; se aprueba; se registran los adicionales y los pagos al maestro; el avance de cada partida; la **recepción** partida por partida, con fotos, conforme u observada; y al cerrar, **lo planificado contra lo real**: costo, plazo y partidas.
- **El dueño (cliente):** en su servicio ve el avance de la obra y las notas y fotos de la bitácora que el equipo marca para él. Nunca ve el costo del maestro ni sus pagos.
- **Listo:** pasan tipos, lint y build; un cliente nunca ve costos, presupuestos ni pagos de maestros, ni notas no marcadas para él; una obra muestra aprobado, adicionales, pagado y saldo, y la comparación plan contra real; no se cierra una obra con partidas sin recibir; «Mi trabajo» muestra las atrasadas; la bitácora se usa bien a 390 px de ancho; ningún archivo sobre 800 líneas; ADRs y `PENDIENTES.md` al día.

## 2. Flujo de los usuarios
1. Jefatura abre o acepta el servicio y le anota las tareas (qué, quién, para cuándo). Pieza B.
2. Cada uno ve lo suyo en «Mi trabajo». Pieza B.
3. En terreno, anota en la bitácora con fotos. Pieza C.
4. Marca la tarea hecha; la jefatura lo ve en «Trabajo del equipo». Pieza B.
5. (Obra) Carga el presupuesto del maestro por partidas, con el PDF. Pieza D.
6. (Obra) Jefatura lo aprueba: queda como el plan de costo y plazo. Pieza D.
7. (Obra) Anota el presupuesto aprobado por el dueño (d13) y la fecha de inicio. Pieza D.
8. (Obra) Durante el trabajo: avance por partida, adicionales aprobados, pagos al maestro, todo con su nota. Pieza E.
9. (Obra) Recepción partida por partida, con fotos: conforme u observada; una observada abre una tarea para corregirla. Pieza E.
10. (Obra) Cierre: lo planificado contra lo real. Pieza F.
11. El dueño ve el avance y las notas marcadas para él. Pieza F.

## 3. Flujo de datos
- Postgres (nuevo, en el espacio del cliente salvo los maestros):
  - `Tarea` (servicio en curso, qué, responsable, vence, hecha el, hecha por, creada por).
  - `Nota` (servicio en curso, autor, texto, fecha, la ve el dueño sí/no, tarea opcional) y `Foto` (nota, archivo, nombre).
  - `Maestro` (en `org_proges`: nombre, especialidad, teléfono, RUT, activo). Son proveedores de Proges, no del cliente.
  - `PresupuestoMaestro` (servicio OBRA, maestro, tipo ORIGINAL o ADICIONAL, plazo en días, PDF, estado RECIBIDO/APROBADO/RECHAZADO, quién y cuándo) con sus `Partida` (descripción, monto, avance %, recepción: pendiente/conforme/observada, observación).
  - `PagoMaestro` (presupuesto, monto, fecha, concepto, comprobante opcional).
  - En `ServicioEnCurso` (obra): presupuesto al dueño (monto y moneda, número de Odoo), fecha de inicio y fecha comprometida.
- Fotos y PDF: según d12.
- Servidor: `src/lib/obra.ts` con las cuentas como funciones puras (aprobado, adicionales, pagado, saldo, avance ponderado, plan contra real) que usan la pantalla y la prueba; `src/lib/vista-cliente.ts` suma el avance y las notas marcadas, nunca montos del maestro.
- Pantallas: la página del servicio se reordena (tareas y bitácora arriba, el resto debajo); «Mi trabajo» y «Trabajo del equipo» (reemplaza la parte de cifras de «Operación», que queda con la bandeja de solicitudes); `/equipo/maestros`; la sección Obra del servicio.

## 4. Permisos
- EQUIPO: crea tareas, notas, presupuestos, pagos y recepciones en el cliente activo; ve los costos.
- Jefatura (marca nueva en el usuario, la pone el admin; d14): aprueba presupuestos de maestros y adicionales, y cierra la obra.
- CLIENTE: ve el avance de sus obras y las notas marcadas «la ve el dueño», con sus fotos. Nada de montos del maestro, pagos ni presupuestos.
- Todo en el servidor: las acciones nuevas exigen EQUIPO (y jefatura donde corresponde) y comprueban cada id contra el espacio; lo del cliente sale solo de `vista-cliente.ts`.

## 5. Decisiones
De Diego:
- **d12. Dónde se guardan las fotos y los PDF:** (a) un almacén privado nuevo en Vercel Blob, solo para el portal [rec.]; (b) en la carpeta del Drive de la propiedad.
- **d13. El presupuesto al dueño:** (a) se anota solo el total aprobado y el número de la cotización de Odoo [rec.]; (b) se arma en el portal, partida por partida con margen.
- **d14. Quién aprueba el presupuesto del maestro:** (a) Cecilia y Álvaro, con una marca «jefatura» [rec.]; (b) cualquiera del equipo; (c) solo el admin.
- **d15. Qué ve el dueño de la bitácora:** (a) solo las notas que el equipo marca para él [rec.]; (b) todas, menos los montos; (c) nada, solo el avance.
- **d16. Cómo se recibe una obra:** (a) partida por partida, conforme u observada con fotos; no se cierra con partidas sin recibir [rec.]; (b) un acta general con fotos.

De Claude:
- La tarea es lo mínimo: qué, quién, para cuándo, hecha. Sin estados intermedios ni dependencias entre tareas.
- La bitácora reemplaza el Word final: el informe para el dueño se lee de ahí.
- Las cuentas de la obra son funciones puras en `src/lib/obra.ts` y se calculan al mirar; no se guardan.
- Los maestros viven en el espacio de Proges y valen para todos los clientes.
- El costo del maestro nunca sale de `vista-cliente.ts`.
- Plata en Decimal con su moneda; el presupuesto del maestro va en pesos.
- Las etapas de la v4 siguen, pero dejan de ser lo principal de la pantalla del equipo.
- WhatsApp no se conecta: se anota en el portal (conectarlo es otra herramienta y otro costo).
- El reporte de venta para el dueño queda para la tarea siguiente: ya hay visitas, ofertas y precios; falta lo de los portales y el resumen.

## 6. Supuestos
- t10. Los maestros son en general los mismos: basta un listado simple.
- t11. Una obra puede tener varios maestros, cada uno con su presupuesto.
- t12. El presupuesto del maestro llega en PDF o por WhatsApp, y alguien del equipo lo copia al portal por partidas.
- t13. Proges le paga al maestro fuera del portal (transferencia); el portal solo registra el pago.
- t14. La cotización al dueño se sigue haciendo en Odoo.
- t15. Las jefaturas son Cecilia y Álvaro.
- t16. El equipo anota desde el celular en terreno.
- t17. Un cambio de alcance durante la obra se maneja como presupuesto adicional que se aprueba igual que el original.

## 7. Lo que no debe pasar
- Un dueño ve el costo del maestro, sus pagos o el presupuesto. Cómo: `scripts/probar-obra.ts` recorre lo que entrega `vista-cliente.ts`.
- Un dueño ve una nota no marcada para él. Cómo: la misma prueba.
- Se cierra una obra con partidas sin recibir u observadas. Cómo: prueba de la acción.
- El saldo del maestro está mal. Cómo: `probar-obra.ts` con casos de anticipo, adicional y pago final.
- Alguien sin la marca de jefatura aprueba un presupuesto. Cómo: la acción lo rechaza; prueba.
- Las fotos quedan en una dirección pública. Cómo: revisar cómo se guardan (d12).
- La migración borra datos. Cómo: leer el SQL: solo crea y agrega.
- Un archivo pasa de 800 líneas. Cómo: `wc -l`.

## 8. Piezas y orden
Olas: [A] → [B, C, D] → [E] → [F, G]. 7 agentes en Sonnet. Verificación común: `npx tsc --noEmit && npm run lint`; build al final de cada ola.
- ◻️ A. Modelo y archivos. `prisma/schema.prisma` y una migración nueva; `src/lib/archivos.ts` (subir y leer según d12); `src/lib/obra.ts` (las cuentas, funciones puras); marca de jefatura en `/equipo`.
- ◻️ B. Tareas, Mi trabajo y Trabajo del equipo. Depende de A.
- ◻️ C. Bitácora con fotos, pensada para el celular. Depende de A.
- ◻️ D. Maestros y presupuestos (cargar, aprobar, adicionales, presupuesto al dueño). Depende de A.
- ◻️ E. Avance, pagos y recepción de la obra. Depende de D.
- ◻️ F. Plan contra real, vista del dueño (avance y notas marcadas) y página del servicio reordenada. Depende de B, C y E.
- ◻️ G. `scripts/probar-obra.ts`. Depende de E.

## 9. Riesgos
- R7. El equipo no anota y vuelve a WhatsApp (p 3, i 3; uso). La nota tiene que ser tan rápida como un mensaje: un campo y las fotos, sin formulario largo. Se prueba en el celular.
- R8. El dueño ve un costo (p 1, i 3; plata). Una sola puerta (`vista-cliente.ts`) y prueba.
- R9. Las fotos quedan públicas (p 2, i 2; datos). d12 y revisión.
- R10. Copiar el presupuesto del maestro por partidas da flojera y se salta (p 2, i 2; uso). Se puede cargar con una sola partida y el PDF; partir en más es opcional.
- R11. Las cuentas del saldo fallan (p 1, i 2; plata). Funciones puras con prueba.

## 10. Documentos accesorios y qué queda fuera
- ADR 0012 «El trabajo del equipo: tareas y bitácora».
- ADR 0013 «Reparaciones: presupuesto del maestro, recepción y plan contra real».
- ADR 0011: la etapa deja de ser lo principal para el equipo.
- `PENDIENTES.md`: la línea «seguimiento de obra» se reemplaza por lo que quede fuera.
- Fuera: el reporte de venta para el dueño (tarea siguiente); traer la cotización desde Odoo; conectar WhatsApp; IA que pule la bitácora o arma el informe; plantillas de tareas por tipo de servicio (cuando se vea qué se repite); pagar al maestro desde el portal; que el maestro entre al portal.

## 11. Qué revisar una vez construido
Diego:
- v10. Como jefatura, abre un servicio y anota tres tareas para dos personas: cada una las ve en «Mi trabajo».
- v11. Desde el celular, anota en la bitácora con dos fotos: se ven en el servicio.
- v12. Carga un presupuesto de maestro con tres partidas y su PDF, y apruébalo.
- v13. Registra un adicional y dos pagos: el saldo calza con tu cuenta.
- v14. Recibe dos partidas conformes y una observada: la obra no se deja cerrar y la observada abrió una tarea.
- v15. Cierra la obra: ves lo planificado contra lo real.
- v16. Como dueño, abre la obra: ves el avance y la nota marcada para ti, y ningún monto del maestro.
Claude: tipos, lint y build; `npx tsx scripts/probar-obra.ts`; `npx tsx scripts/probar-espacios.ts`; SQL leído; `wc -l`.

## Historia
- v1 y v2: commits `8feafed` a `2a0b1e9`. v3 aprobada y construida el 2026-11-18: commits `740d374` a `a478988`.
- v4 aprobada el 2026-11-18 («ok, con workflow»: d8 a, d9 b todos administran, d10 a, d11 a; el equipo ve la cartera sin editarla; NPL con su propio usuario, a cargo de Proges al principio). Construida, revisada y cerrada: commits `9107728` a `92bcc14`; su cierre es la versión 6 de la página.
- Lo que ya cerró Diego y sigue en pie: Nexxos solo publica; cobrar según cada contrato en espera; DuckDB y dbt con Odoo; el cliente ve las visitas sin los datos del interesado (d2 b); carga inicial de las 42 sin las 20 posiblemente vendidas (d3 b); el cliente ve en vivo (d4 a); etapas propias por tipo de servicio, editables (d5 b); revisión enfocada y completa antes de abrirle el portal al cliente real (d7 a); ningún archivo sobre 800 líneas.
