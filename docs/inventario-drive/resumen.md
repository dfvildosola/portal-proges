# Inventario del Drive de Proges (2026-11-18)

Inventario de solo lectura. La etapa de cada propiedad se dedujo del título de sus archivos, no de su contenido: hay que confirmarla con el equipo.

- **62 propiedades** y una carpeta de formatos. Suman 2.167 archivos, de los cuales 1.266 son fotos o videos.
- **Carpetas creadas por año:** 9 en 2022, 5 en 2023, 7 en 2024, 14 en 2025 y 28 en 2026.
- **Movimiento:** 30 carpetas tuvieron cambios en los últimos 6 meses y 20 llevan más de 12 meses quietas.
- **Confianza en la etapa deducida:** alta en 27, media en 15 y baja en 21.

## Etapa probable
| Etapa | N° |
|---|---|
| Venta en cierre o posiblemente vendida | 20 |
| Arrendada | 6 |
| Reparada o en venta | 6 |
| En reparación | 6 |
| Evaluación inicial (acercamiento) | 6 |
| Toma de posesión | 4 |
| Con oferta o promesa | 4 |
| En regularización | 1 |
| Sin clasificar o vacía | 10 |

## Cómo están ordenadas hoy por dentro
23 carpetas no tienen subcarpetas. En las demás se repite una convención a medias, con nombres distintos para lo mismo («toma de posesion» y «toma de posesión», «estudio de titulos» y «documentacion estudio de titulos»). Las subcarpetas más comunes son: Constructora (15, con Fotos adentro), Corretaje (5), Toma de posesión (7), Fotos (5), Estudio de títulos (6, con Gastos adentro) y Acercamiento comercial (2).

## Estructura estándar propuesta (sale de lo que ya usan)
```
<Comuna>, <Dirección>/
  1 Acercamiento comercial/
  2 Estudio de títulos/   (con Gastos)
  3 Toma de posesión/     (con Fotos)
  4 Constructora/         (con Presupuestos y Fotos)
  5 Corretaje/            (avisos, ofertas, promesa)
  6 Administración/       (contrato de arriendo, cobros)
```
Una carpeta por cada etapa del recorrido. Así el portal sabe dónde buscar cada documento.

## Pendiente de revisar
- Duplicados sospechados: Mirador 1851 (dos carpetas). También unidades de un mismo edificio que van en carpetas separadas: Agustinas 715, Monjitas 550 y Eluchans 2255.
- Las 20 «posiblemente vendidas»: si están cerradas, se archivan y no entran a la carga inicial.
- El detalle por propiedad está en inventario.csv.
