# TAREA — Etapa 1: el portal con dos caras (propietario + operación Proges)

**Estado: conversación cerrada, plan SIN escribir.** Paso siguiente: armar el plan como página (guía `~/Code/.claude/guias/paginas.md` y su plantilla HTML, igual que en Portal RASA) y este archivo como plano. Antes, leer `prisma/schema.prisma`, `BRIEF.md` y `docs/inventario-drive/resumen.md`. Tamaño: grande (regla 1).

## Lo que se conversó con Diego (2026-11-18)
- **Dos caras sobre la misma ficha de propiedad.** Por un lado, el portal del propietario: el chico (de 1 a 3 propiedades, quizás gratis) y el grande (50 a 80), con control, reportes y la opción de pedir servicios a Proges. Por otro, la operación interna de Proges, donde se gestionan servicios, solicitudes y procesos estándar.
- **El cliente actual** compra cartera de deuda. Tiene unas 80 propiedades, de las cuales 20 a 25 están activas en venta o arriendo. Lo que más pide es reportes de corretaje: visitas, historial de precio, recomendación de bajar el precio, ofertas y fase de la venta. Hoy se le manda un Word en la reunión semanal. Diego quiere que el cliente entre al portal muy cerca de la etapa 1.
- **Piloto de propietarios:** Diego (1 propiedad) y un amigo (3), sobre lo que el portal ya hace.
- **El equipo:** Álvaro (dueño), Cecilia (venta), Leo Maris (reparaciones, con François de apoyo) y François. No hay responsable fijo por propiedad. Las visitas las hace cualquiera de los tres. Los perfiles de cargo están por definir.
- **Fases de la venta:** captada → publicada → con visitas → con oferta → promesa firmada → escritura → inscrita y entregada.
- **Fases del arriendo:** captada → publicada → con visitas → postulante en evaluación → contrato firmado → entregada con inventario → pasa a administración.
- **Catálogo de servicios:** está en la Sheet `18YgGpb6fEHPLkq5TCAb6lKEWWtiXUANzrKEAIrihQEs` (familias ET, IRP, NV, RR y ADMP) y ya está cargado en Odoo como productos. Diego es administrador de Odoo (ventas y contabilidad).
- **Nexxos (prop360, de Convecta)** es el CRM de corretaje que ya usan. Tiene 32 avisos publicados en Portal Inmobiliario/Mercado Libre, TocToc, Proppit, Yapo y otros portales. Registra órdenes de visita (61 desde mayo, con evaluación y exportables a Excel), contactos (99 en 30 días), ofertas e «Informe a Propietario» (nunca enviado). Usan un solo usuario compartido, así que no se sabe quién hizo cada visita. No se vio una API.
- **Drive:** inventario en `docs/inventario-drive/`. Son 62 propiedades, 30 con movimiento en los últimos 6 meses y 20 posiblemente vendidas. Se propuso una estructura estándar de 6 subcarpetas.
- **API para clientes grandes** (lectura del estado; después contabilidad y conciliación): etapa posterior.

## Propuesta de Claude, por confirmar en la página
- Nexxos para el corretaje, leído desde el portal (por API si Convecta la tiene; si no, importando el Excel cada semana). El portal se encarga de servicios en curso, papeles, obras y costos, y de mostrar el panel unido al cliente. Odoo guarda lo que se cobra.
- La etapa 1 incluye: login con permisos por persona (equipo / cliente / propietario), corretaje leído de Nexxos, servicios en curso con código del catálogo y responsable, panel del cliente, carga inicial desde el inventario y el piloto de propietarios.
- Después vendrían: obras y costeo, Odoo, la apertura a propietarios externos y la API.
- Sin código: un usuario de Nexxos por persona, cerrar las órdenes de visita y mandar el «Informe a Propietario» que Nexxos ya trae.

## Esperan respuesta de Diego
1. La respuesta de Convecta sobre la API o la exportación automática.
2. El ok al reparto Nexxos / portal / Odoo.
3. Si se pausa «Cobrar según cada contrato» (está en PENDIENTES.md).
