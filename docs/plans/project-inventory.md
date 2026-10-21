# Inventario de componentes

2026-10-21. Usuario confirma buen funcionamiento y autoriza commit del bloque como v1.2.23. Push no autorizado.

## Diseño acordado

- Inventario central editable en tabla, con alta directa y duplicado de filas. Datos del manual y medidas introducidos progresivamente.
- Cartas, tokens/losetas, dados, tableros, miniaturas y otros. Selectores de formatos/formas existentes y dados d4/d6/d8/d10/d12/d20.
- Cartas: sin fundas, normales, premium o grosor manual; formato y fundas del primer grupo como valores iniciales de los siguientes, con excepciones por grupo. Grosor de pila completa convertible a grosor por carta.
- Asignación desde el editor de cada pieza, con cantidades parciales y nombres/rutas de las otras piezas que contienen el mismo grupo.
- Creación manual conservada. Concepto aceptado; diseño visual sujeto a iteración.

## Implementación

- `Project.inventory` contiene grupos con ID y revisión. `inventoryAssignments` vive en trays, secciones de Layered Box y boards. Proyectos antiguos parten de inventario vacío; import/export JSON y guardado local conservan los datos.
- Aplicación explícita: crea snapshots de tamaños/formas por pieza/grupo/revisión y adapta los parámetros existentes. Cambiar medidas del inventario marca asignaciones desactualizadas; no redimensiona piezas silenciosamente. Los snapshots no aparecen en el catálogo editable de Dimensions.
- Card Storage y Card Draw comparten hueco y exigen medidas iguales entre grupos; Card Divider, Card Well y Counter Tray crean un stack/hueco por grupo. Tile Tray y Board admiten un grupo.
- Cup Tray permite varios tipos, incluidos dados: estima una distribución conservadora en una sola capa usando envolventes rectangulares, un compartimento por grupo. No introduce un nuevo generador de dados ni preview de dados poliédricos.
- Miniature Tray usa los modelos existentes; el rack de raíles asigna una miniatura por slot. Los límites de modelos del generador de sockets se comprueban antes de aplicar.
- Las cantidades asignadas no pueden superar el inventario. Borrado/cambio de tipo bloqueado mientras el grupo esté asignado. Duplicar piezas conserva geometría y libera el vínculo de inventario para no duplicar existencias. Convertir sección a loose tray conserva la asignación.
- Volver a manual libera cantidades, conservando la geometría actual. Aplicar contenido reemplaza los stacks/layouts de contenido anteriores; no configura holguras ni espesores de impresión.
- La generación automática del inserto sigue pendiente en su [plan independiente](automatic-insert-design.md).

## Validación

Usuario acepta el funcionamiento del inventario, incluyendo los ajustes de disponibilidad y carga Top/Edge-loaded, y autoriza commit. El diseño puede seguir iterándose; las nuevas piezas requieren su validación física habitual.

- Tokens en Counter Tray / Player Board: selección por grupo de Top-loaded o Edge-loaded, con orientación Lengthwise/Crosswise para Edge-loaded. Se conserva en la asignación, JSON y al reaplicar. Asignaciones anteriores mantienen Top-loaded por defecto. Cubierto por regresión del store y flujo de navegador; aceptado por el usuario.

- Ajuste solicitado: los grupos sin unidades disponibles en otras piezas se muestran marcados y desactivados en el selector, sin incorporarse al contenido de la pieza actual. Prueba Playwright cubre grupos agotados, parciales, propios y libres. Aceptado por el usuario.

Comprobaciones locales realizadas: `pnpm run check` sin errores ni avisos; suite de tests unitarios (9 del inventario); ESLint de los archivos nuevos; build de producción; pruebas Playwright de alta, herencia, selectores de tokens/dados, asignación real a Card Storage, persistencia, disponibilidad, Top/Edge-loaded y tabla responsive sin desbordamiento. La prueba de límites cubre rollback de geometría/asignaciones si una Layered Box fija rechaza el contenido.

- Funcionamiento aceptado por el usuario; alineaciones y campos pueden seguir afinándose con juegos reales.
- Los presets de grosor son estimaciones editables; verificar medidas reales antes de imprimir.
- Revisar físicamente capacidad, holguras y exportaciones mediante el flujo normal de la app.
