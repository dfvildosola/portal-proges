# 0004 — Papeles en regla

Fecha: 2026-10-01 · Estado: aceptada

## Contexto

Hasta ahora la pestaña Documentos guardaba cada archivo en un **cajón**: Escrituras y títulos, Legales y judiciales, Municipalidad, Seguros… Sirve para ordenar, pero no para saber si un papel en particular está: que haya algo en «Legales» no dice si es el dominio vigente o una demanda. Quien revisa una cartera de 20 a 200 propiedades pregunta justamente eso: «¿están los papeles en regla?».

Se agrega una lista de papeles por defecto según el tipo de propiedad, y la ficha marca cuáles están y cuáles faltan. Para eso hay que decidir cómo sabe el portal qué papel es cada documento, qué cuenta como papel «viejo», dónde se muestra la lista y quién define la lista.

## Decisiones cerradas con Diego (2026-10-01)

1. **Campo nuevo «papel» en el documento, aparte del cajón.** El cajón (`Document.tipo`) no cambia, y se agrega `papel` (opcional) con 14 valores. Al subir, se elige qué papel es. Si es uno de la lista, el cajón lo pone el código (`PAPEL_CATEGORIA` en `src/lib/papeles.ts`); si es «Otro documento», se elige el cajón como antes.

   Es como un archivador con carpetas colgantes: el cajón dice dónde se guarda el papel, y la etiqueta de la carpeta dice qué papel es. La lista de papeles revisa las etiquetas, no los cajones.
2. **El dominio vigente y el certificado de hipotecas y gravámenes no se marcan «viejos».** Se muestran con su fecha de emisión y su antigüedad («emitido hace 8 meses»). La ley no les pone vencimiento. El banco o el notario los piden con menos de 30 días, pero solo al vender o al pedir un crédito, y cada uno cuesta algunos miles de pesos. Con una regla de 30 días, casi toda la cartera quedaría siempre en ámbar y el aviso dejaría de significar algo. Sale en rojo solo un papel con fecha de vencimiento ya pasada (una póliza, un contrato), igual que antes.
3. **Una línea en el Resumen y la lista completa en Documentos.** En «Datos al día» se suma una línea («Papeles: 5 de 7, faltan …»), para que se vea de un vistazo. La lista con ✓/✗ y un botón «Subir» en cada papel que falta va arriba en la pestaña Documentos, donde se actúa.
4. **La fecha de emisión es la del documento.** El documento ya tenía un campo «Fecha emisión». Si alguien lo deja vacío, la lista muestra «subido el …» en gris, sin antigüedad: la fecha de subida no dice de cuándo es el papel.
5. **La lista vive en el código y es igual para todos los clientes.** Es como un formulario impreso: todos llenan el mismo. La alternativa es una plantilla por empresa, que cada cliente edita, pero exige pantallas para armarla y nadie la ha pedido todavía (regla de código 1). Cuando un cliente pida la suya, se pasa a plantilla (`PENDIENTES.md`).
6. **En «Datos al día», la línea de papeles solo cuenta los que faltan.** Un papel vencido ya aparece en la línea «documentos vencidos» y no se marca dos veces.

## La lista por defecto

| Papel | Cajón | Se pide en |
|---|---|---|
| Escritura | Escrituras y títulos | todas |
| Dominio vigente (CBR) | Escrituras y títulos | todas |
| Hipotecas y gravámenes (CBR) | Escrituras y títulos | todas |
| Certificado de avalúo (SII) | Avalúos y tasaciones | todas |
| Plano | Municipalidad | todas |
| Certificado de informaciones previas (DOM) | Municipalidad | todas |
| Recepción final (DOM) | Municipalidad | departamento, casa, oficina, local, bodega, estacionamiento |
| Póliza de incendio y sismo | Seguros | departamento, casa, oficina, local, bodega, estacionamiento |
| Permiso de edificación (DOM) | Municipalidad | casa, local |
| Certificado de número (DOM) | Municipalidad | casa, local |
| Reglamento de copropiedad | Legales y judiciales | departamento, oficina, bodega, estacionamiento |
| Subdivisión SAG | Legales y judiciales | parcela, agrícola |
| Derechos de agua (CBR/DGA) | Escrituras y títulos | parcela, agrícola |
| Contrato de arriendo | Contratos | toda propiedad con estado «Arrendada» |

Sale de la investigación de la etapa 1 (ver `TAREA.md` de la ficha, en la historia de la branch `feat/ficha-propiedad`). Diego sumó el plano y el certificado de informaciones previas a todas las propiedades. Quedan entre 6 papeles (un terreno) y 11 (una casa arrendada).

## Alternativas descartadas

- **Sumar los papeles a la lista de cajones:** cambiaba menos la base, pero dejaba 23 opciones mezcladas en un solo selector («Legales y judiciales» al lado de «Dominio vigente») y la pestaña Documentos agrupaba raro.
- **Buscar el papel por el nombre del archivo:** frágil. «dominio.pdf», «DV 2025» y «certificado CBR» son el mismo papel.
- **Marcar «viejo» el dominio y las hipotecas a los 30 días, o solo en las propiedades en venta:** ver decisión 2. El flujo de venta todavía no está diseñado (regla 8), así que no se le cuelgan reglas.
- **Plantilla por empresa desde ya:** ver decisión 5.

## Consecuencias

- Los documentos subidos antes de este cambio no tienen papel. Siguen en su cajón, pero no cuentan para la lista hasta que se vuelvan a subir eligiendo el papel. Hoy no hay ninguno cargado.
- Un papel que se subió con «Otro documento» tampoco cuenta, aunque sea el que falta. La lista no adivina.
- La lista de papeles depende del tipo y del estado de la propiedad. Si una propiedad pasa a «Arrendada», empieza a pedir el contrato de arriendo.
- La lista no distingue un departamento en edificio de una casa en condominio: la casa no pide reglamento de copropiedad aunque lo tenga. Se puede subir igual. Si la diferencia importa, hay que guardar en la propiedad si está en un condominio.
