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

## Referencia inicial

Miniature Tray: caché acotada de layouts y última geometría, preview sin unión booleana adicional, preparación de cuerpo/tapa en worker, grabado por socket y taladros en suelo antes de unir el conjunto. La prueba local de 20 miniaturas grabadas pasó de unos 19,5 a 7,6 segundos al localizar taladros. Son mediciones orientativas de desarrollo, no una garantía para otros equipos o piezas.
