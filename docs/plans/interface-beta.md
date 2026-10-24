# Interfaz opcional · Beta

## Decisiones aceptadas

- Desde 2026-10-24, New · Beta predeterminada por decisión del usuario. Classic sigue disponible y se respeta su preferencia guardada. Skeleton retirado tras valorar el piloto; reevaluar librerías solo si aparecen necesidades concretas.
- Selector `Interface` en cabecera; recordar la elección por navegador.
- Mantener el visor actual, interacción orbital, zoom, desplazamiento, ViewCube y tamaños de paneles. El mockup no define el tamaño real del visor.
- Compartir parámetros, selección, generación y exports; no crear otro proyecto ni otro motor geométrico.
- La preferencia visual no se guarda en el JSON del proyecto.

## Implementación local

- Skin aislada bajo `.ui-modern`, con paletas clara/oscura y presentación renovada de paneles, controles y cuadrícula/base del visor. Los colores guardados de las piezas se conservan.
- Navegación flotante plegable; no consume ancho adicional del canvas.
- Accesos Perspective / Top / Front / Right reutilizando los presets de cámara existentes. No se cambia el zoom ni la posición al alternar interfaz.
- `EditorSection` mantiene los controles originales en clásica y los agrupa en secciones desplegables en Beta, abiertas independientemente.
- Card Well: contenido, distribución, dimensiones, fabricación, extracción y acabado. Resto de bandejas/cajas agrupadas según las categorías reales ya disponibles, sin inventar parámetros de modelos.
- `QuantityInput` compartido para cantidades en editores y asignaciones. El inventario mantiene su control existente con estilo alineado en Beta.
- Cabecera de pieza: tamaño exterior natural identificado explícitamente; los tamaños ajustados siguen disponibles en los editores que ya los calculaban.
- No se altera la generación ni el contenido/export de piezas. No hay cambio de versión ni commit/push.

## Verificación

- Pruebas de navegador para alternar interfaces a 1280 y 1920 px: mismo canvas conectado y dimensiones exactamente iguales, proyecto y selección conservados, edición y persistencia tras recarga.
- Regresión Card Well: mínimos exteriores, extracción, nombres y acabado en clásica.
- Regresión de asignación de inventario con carga superior/lateral.
- Preferencia con almacenamiento bloqueado y revisión responsive/tema claro/oscuro.
- `pnpm run check` sin errores ni avisos durante la iteración.
- Compilación de producción completada con `pnpm run build`.
- Siete casos de navegador pasan entre las comprobaciones de interfaz y las regresiones focalizadas. Incluyen igualdad de altura entre campo y botones de cantidad en inventario/editor (35 px en la configuración probada).
- Suite unitaria: primera ejecución concurrente agotó el timeout de 5 s en cuatro pruebas de geometría. Los tres archivos afectados pasan completos (49 pruebas) al repetirlos con dos workers; el resto pasó inicialmente.

## Pendiente

- Revisión 2026-10-23: usuario señala centrado de −/+ y unidad `mm` más baja que su input. Corregido el centrado explícito y la altura/radio de los sufijos de FormControl en Beta; test de navegador y `check` pasan. Pendiente comprobación visual del usuario.

- Validación del usuario en proyectos reales y pantallas habituales, especialmente editores largos de miniaturas y capas internas de Layered Box.
- Afinar densidad y secciones a partir de esa validación. La Beta todavía no se considera aceptada para publicar.
