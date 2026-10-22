# Revisión de rendimiento de geometría

## Estado y prioridad

2026-10-21: el usuario confirma una mejora muy notable tras optimizar Miniature Tray. Indica que la lentitud afecta también a otras piezas, especialmente a **Card Dividers**. Este documento registra trabajo pendiente; no implica que las demás piezas estén diagnosticadas ni optimizadas.

## Orden de trabajo

1. Card Dividers: reproducir casos lentos con muchos separadores y con texto, registrando parámetros y cantidades.
2. Card Storage con separadores y tapa: medir tanto piezas individuales como el conjunto.
3. Revisar los demás tipos con casos representativos, priorizando los de mayor tiempo de generación.

## Método

- Medir por separado distribución, construcción CSG, texto, conversión a mallas, transferencia desde el worker y render. Separar primera generación de edición, navegación y cambios de preview.
- Buscar construcciones repetidas, trabajo geométrico en el hilo principal, cortes sobre conjuntos completos y reconstrucciones innecesarias por opciones visuales.
- Aplicar mejoras pequeñas: operaciones locales antes de unir piezas, reutilización de geometrías iguales, cachés acotadas e invalidación por parámetros; mover el trabajo costoso al worker cuando corresponda.
- Registrar tiempos antes/después con el mismo caso, incluyendo una prueba en un equipo antiguo cuando esté disponible. No fijar umbrales de tiempo dependientes del equipo en tests unitarios.
- Verificar cambios de parámetros, texto, colores, dimensiones y exportaciones STL/3MF. Mantener la geometría imprimible y las garantías de `group3mf`: vértices coincidentes compartidos y un cuerpo de texto por pieza. Consultar la investigación de laminado antes de cambiar texto de Card Storage.
- Validar con el usuario antes de dar cada caso por cerrado.

## Card Divider: primera iteración local (2026-10-21)

- Caché de la última geometría, invalidada por parámetros, medidas de cartas, nombre, altura, espaciador y opciones de texto. Una sola entrada para limitar memoria.
- Curvas de texto con 24 segmentos en vez de 128: desviación de contorno inferior a 0,006 mm para radios de trazo de 0,5/0,6 mm. Se conservan grosor, profundidad y orientación del texto.
- Huecos de dedos con resolución adaptativa: error de aproximación máximo de 0,02 mm, también para cartas personalizadas grandes.
- Caso medido: cuatro mazos estándar de 30 cartas, orientación horizontal, front-to-back, etiquetas `Deck 1`…`Deck 4`, nombre inferior `Cards`. Primera generación: 3.380 ms → 712 ms; polígonos: 12.728 → 3.464; diferencia de volumen: ~0,012 %. Repetición en caché: ~0,05 ms. Tiempos orientativos del equipo de desarrollo.
- Tests de invalidación de caché y referencia geométrica con tolerancia del 0,02 % de volumen. Usuario acepta la mejora y autoriza commit/push v1.2.22 (2026-10-21). Validación impresa pendiente.

## Referencia inicial: Miniature Tray

Caché acotada de layouts y última geometría, preview sin unión booleana adicional, preparación de cuerpo/tapa en worker, grabado por socket y taladros en suelo antes de unir el conjunto. La prueba local de 20 miniaturas grabadas pasó de unos 19,5 a 7,6 segundos al localizar taladros. Son mediciones orientativas de desarrollo, no una garantía para otros equipos o piezas.

## Proyecto por defecto: revisión del 2026-10-22

Usuario solicita medir todas sus piezas y mejorar las más lentas. Usuario acepta el bloque y autoriza commit/push como v1.2.27 (2026-10-22). Validación impresa pendiente.

### Medición reproducible

Benchmark manual del worker completo con `src/lib/data/defaultProject.json`, normalizando `boards` y `layeredBoxes` vacíos como hace el store al crear el ejemplo. Solicitud `scope: all`, sin selección: genera las tres capas, caja/tapa y siete bandejas, usando alturas y espaciadores reales. Tres pasadas con módulos nuevos para evitar cachés de geometría; tabla de medianas en milisegundos. No utiliza ni reemplaza el proyecto guardado en el navegador.

```bash
BENCH_GEOMETRY=1 BENCH_OUTPUT=/tmp/geometry-benchmark.json pnpm exec vitest run src/lib/workers/geometry.performance.test.ts
```

El JSON guarda tiempos por pasada y tamaños/volúmenes/envolventes de las mallas. El test se omite en la suite habitual. Los tiempos son del entorno de desarrollo, no incluyen dibujo GPU ni arranque del navegador; el total incluye ejecución del harness, importación del módulo y entrega de la respuesta. No extrapolar a otros equipos ni a tipos ausentes del ejemplo (racks, Card Storage, Tile Tray, Layered Box).

| Pieza / etapa | Antes | Después |
| --- | ---: | ---: |
| Counter Box, cuerpo | 3225 | 646 |
| Counter tray | 2223 | 905 |
| More counters | 2516 | 954 |
| Counter Box, tapa | 1163 | 1149 |
| Cup tray | 717 | 196 |
| Split cup tray | 1112 | 259 |
| Card draw | 968 | 150 |
| Card well | 985 | 133 |
| Card Divider | 148 | 145 |
| Conversión a mallas, media de la suma por pasada | 277 | 106 |
| Total, mediana de tres pasadas | 13403 | 4895 |

### Cambios y garantías

- El registro anterior omitía las bandejas sueltas y la conversión a malla. Se registran todas las construcciones de bandejas y conversiones, también en vista individual; se elimina un cronómetro duplicado. El total mostrado es tiempo transcurrido, incluyendo distribución y esperas, en lugar de sumar sólo algunas operaciones.
- Los nombres grabados en los fondos de Counter/Player Board, Cup, Card Draw, Card Well y las etiquetas de bandeja en el suelo de Box pasan de 128 a 24 segmentos por curva, como Card Divider. Radio máximo del trazo 0,6 mm: error de aproximación menor de 0,006 mm. Se mantienen fuente, grosor, profundidad, escala, posición y orientación.
- No se modifica la geometría de texto de tapa, texto de Card Storage, agrupación multicolor ni serialización 3MF. La tapa sigue siendo una de las operaciones más costosas (~1,15 s); se conserva en esta iteración para mantener intacto el texto compartido con Card Storage.
- Medidas exteriores sin cambios; diferencia de volumen máxima observada ~0,00024 %. Referencias de regresión independientes del código optimizado: ocho tests verifican envolventes, volumen con tolerancia del 0,001 %, menor número de triángulos y error de aproximación.
- Prueba en navegador con el proyecto por defecto desde `127.0.0.1:5175`, aislado del proyecto del usuario en `localhost:5175`: termina la generación, vista 3D visible y sin errores/avisos de consola. Validación del acabado impreso pendiente.
- Total de triángulos del conjunto: 129846 → 51883 (~60 % menos). `pnpm run check`: 0 errores/avisos. Suite completa: `pnpm exec vitest run --maxWorkers=2`, 209 tests correctos y benchmark manual omitido. Se limita la concurrencia de la suite porque una primera ejecución simultánea con el navegador/check excedió el límite de 5 s de un test de tapa; no se alteró ese test ni su timeout.
