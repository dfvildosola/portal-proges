# Brief — Proges

> Documento de dirección. El "por qué" y las decisiones de fondo.
> Para el "cómo" y el detalle de construcción, ver `PLAN.md`.
> Última actualización: 2026-05-30.

**Qué es:** Web app para administrar un patrimonio inmobiliario (Chile). Reemplaza el
Excel con el que hoy se gestionan propiedades, arriendos y cobranza — y, sobre todo,
*avisa* cuando algo está inconsistente.

---

## 1. Usuario y objetivo
- **Usuarios (desde la etapa 1, 2026-11-18):** el equipo de Proges (Álvaro, Cecilia,
  Leo, François, Diego), que gestiona la cartera, y el cliente que compra cartera de
  deuda (unas 80 propiedades, 20 a 25 activas), que mira la suya en vivo en `/cliente`
  en vez del Word semanal. Después, el piloto de propietarios (Diego y un amigo).
- **Objetivo de la etapa 1:** que el equipo registre en el portal cada servicio que
  lleva en cada propiedad (ADR 0011) y que el cliente vea su avance sin pedirlo (ADR 0010).

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
- **Single-tenant** para arrancar, pero con `organizationId` en cada tabla desde el día 1
  (seguro barato). Sin roles ni cambio de organización todavía.
- **Login:** Clerk.
- **Multi-tenant real** (orgs, roles, switching) se agrega *aditivamente* cuando aparezca
  el 2º cliente — sin reescribir, porque el modelo ya lleva `organizationId`.

## 5. Stack
| Capa | Decisión |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript |
| UI | Tailwind + shadcn/ui — tema neutro, color de marca se ajusta después |
| Base de datos | **Neon / Postgres** + Prisma *(DuckDB descartado: es analítico, no transaccional, y no corre en serverless)* |
| Auth | Clerk (single-tenant por ahora) |
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
que el cliente administre a sus usuarios · pedir un servicio desde el panel ·
costos y resultado por propiedad · leer Nexxos · escribir en Odoo · DuckDB y dbt
(hasta que entre Odoo) · correo semanal al cliente · API para clientes grandes.
