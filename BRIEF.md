# Brief — Proges

> Documento de dirección. El "por qué" y las decisiones de fondo.
> Para el "cómo" y el detalle de construcción, ver `PLAN.md`.
> Última actualización: 2026-05-30.

**Qué es:** Web app para administrar un patrimonio inmobiliario (Chile). Reemplaza el
Excel con el que hoy se gestionan propiedades, arriendos y cobranza — y, sobre todo,
*avisa* cuando algo está inconsistente.

---

## 1. Usuario y objetivo
- **Usuario:** el dueño de una cartera de propiedades, que la administra en su portal
  (propiedades, contratos, cobranza, cuentas) y le pide servicios a Proges. Cada cliente
  tiene su propio espacio y no ve el de otro (ADR 0010). Hoy: el piloto (Diego con una
  propiedad, un amigo con tres) y NPL, que compra carteras de deuda (4 o 5 empresas
  dueñas, unas 80 propiedades) y cuya cartera carga Proges con un usuario de NPL.
- **Proges es el proveedor:** el equipo (Álvaro, Cecilia, Leo, François, Diego) ve la
  cartera de cada cliente sin editarla, recibe los pedidos de todos en «Operación» y
  lleva cada servicio por sus etapas (ADR 0011).
- **Objetivo de la etapa 1:** que el cliente pida servicios desde su portal y vea su
  avance en vivo, y que el equipo registre ahí cada servicio que lleva.

## 2. El núcleo (lo que justifica existir)
**Autocontrol + cobranza son un solo producto:** el sistema cruza contratos con pagos y
*avisa* lo que está mal (arrendada sin contrato, arriendo atrasado, contribución impaga,
contrato por vencer). Eso es lo que un Excel no hace. Todo lo demás es la base necesaria
para que ese autocontrol tenga de dónde alertar.

## 3. Orden de construcción
```
Propiedades  →  Contratos + arrendatarios  →  Cobros y su estado  →  Alertas
   base              substrato                   corazón            diferenciador
```
No se puede saltar: para alertar "arriendo atrasado" hay que tener antes propiedades y
contratos cargados. Lo documental, en cambio, no saca a nadie del Excel → se difiere.

## 4. Arquitectura
- **Un espacio por cliente** desde la etapa 1: el `organizationId` que cada tabla lleva
  desde el día 1 es el del cliente. Catálogo y etapas viven en el espacio de Proges.
- **Login:** Clerk; roles CLIENTE y EQUIPO en la tabla `Usuario` (ADR 0010).

## 5. Stack
| Capa | Decisión |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript |
| UI | Tailwind + shadcn/ui — tema neutro, color de marca se ajusta después |
| Base de datos | **Neon / Postgres** + Prisma *(DuckDB descartado: es analítico, no transaccional, y no corre en serverless)* |
| Auth | Clerk + tabla `Usuario` (un espacio por cliente) |
| Hosting | Vercel |
| *(diferido)* | Vercel Blob (documentos), Resend (emails de alerta), AI SDK + Gateway (buscador) |

## 6. Front / UX
- **Principio:** "Excel ordenado", no software empresarial. Que se sienta obvio.
- **Responsive**, desktop-first pero el celular importa (revisar alertas/cobranza a mano alzada).
- **Navegación** — barra lateral en dos grupos:
  - **Trabajo diario:** Inicio · Pendientes (alertas) · Cobranza
  - **Cartera:** Propiedades · Contratos · Contactos
- **Ficha de propiedad** = el caballo de batalla, con pestañas
  (Resumen · Documentos · Contrato · Económico · Contribuciones · Alertas).
- **Regla de escalamiento:** lo que pertenece a *una* propiedad → pestaña en la ficha;
  lo que cruza *toda* la cartera → ítem de menú. El menú se queda en ~6 ítems para siempre.

## 7. Lo que NO hacemos ahora
Pasarela de pago · auto-registro · portal de arrendatarios · RAG/OCR de documentos ·
mora automática · boleta/factura SII · conciliación bancaria · roles por sección ·
usuarios que solo miran · límite por sociedad · que el cliente cree sus usuarios ·
IA o correo para las solicitudes · cotizar o cobrar un servicio en el portal ·
costos y resultado por propiedad · leer Nexxos · escribir en Odoo · DuckDB y dbt
(hasta que entre Odoo) · correo semanal al cliente · API para clientes grandes.
