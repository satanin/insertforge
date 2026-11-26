# Sistema de interfaz de InsertForge

Estado: usuario autoriza aplicar el sistema el 2026-11-26. Base compartida aplicada a New · Beta y Shelf Storage, pendiente de validación visual del usuario. Classic sigue disponible. No se modifican geometría, proyecto guardado ni exports por cambiar apariencia.

## Reglas confirmadas

- Inputs de texto, numéricos y selects comparten fondo, borde, radio y altura dentro de una misma densidad. Ocupan el ancho disponible de su celda, sin límites arbitrarios por tipo de dato. Las celdas numéricas de una fila son iguales. Un campo aislado ocupa toda la fila.
- No variar el fondo de un campo por ser numérico, desplegable o estar en otra sección. Incluso deshabilitado conserva el fondo común; el estado se comunica con texto, iconografía, borde y semántica. Un fondo distinto exige una razón funcional concreta, por ejemplo un error activo, y un tratamiento compartido.
- Las acciones de formulario/panel usan filas de ancho completo: un botón ocupa el 100%; dos botones ocupan columnas iguales, cada una de (ancho disponible menos gap) / 2. No dimensionar cada botón según su texto ni dejar huecos sobrantes.
- Los botones de una fila tienen la misma altura, padding, alineación y escala tipográfica. Texto ajustable dentro de una escala acotada; si no cabe al tamaño mínimo, reorganizar en filas separadas de ancho completo. No cortar texto, usar puntos suspensivos, encoger sin límite ni permitir que un botón se desborde mientras su vecino sigue estrecho.
- Excepciones funcionales explícitas: botones de solo icono, controles del visor, selector segmentado y ayuda integrada. Las excepciones comparten componentes; no justifican medidas locales arbitrarias.
- En Export parts, separar nombre, metadatos y dimensiones en filas estructuradas. Ajustar tipografía al ancho hasta el mínimo permitido; después recomponer filas por unidades lógicas. No cortar números, partir la unidad de su valor ni ocultar medidas completas con ellipsis.
- Las acciones con pareja (View set / Download 3MF) se presentan 50/50; acciones aisladas (muestra de frontal, export de proyecto, etc.) al 100%. Los mensajes y medidas no se estilizan como botones.
- Las ayudas de acciones se activan sobre el propio botón por hover y foco; proporcionar acceso táctil cuando sea necesario. No añadir un botón `?` lateral que reduzca el ancho o rompa la cuadrícula. Las ayudas de campos se asocian a etiqueta/control sin alterar su ancho. Datos actuales, errores y advertencias siguen visibles.
- Proyecto, pieza y vista mantienen ámbitos distinguibles. Cambiar la densidad no cambia el comportamiento, el alcance ni la geometría.

## Valores aplicados, pendientes de revisión visual

Equilibrada: texto base14 px, controles36 px; compacta técnica: base13 px, controles32 px. Mínimo para texto de botones/medidas adaptables12 px. Texto importante no se reduce por debajo del mínimo; se recompone la distribución. En táctil, controles con objetivo44 px y campos editables16 px. Tokens expresados en rem sobre raíz histórica14 px, sin cambiarla para Classic.

Tema claro: superficies blancas/grises neutras y azul vivo para acciones; tema oscuro: carbón, campos gris oscuro uniforme y selección azul suave. Densidad y tema son preferencias independientes del navegador, fuera del JSON del proyecto. El selector Density está junto a Interface; tema conserva el control de sol/luna.

Base: `src/routes/design-system.css`; ajuste de filas/medidas: `src/lib/actions/harmonizeControls.ts`; medidas estructuradas: `DimensionReadout.svelte`. Las ayudas de acciones usan el botón como ancla por hover/foco y pulsación larga táctil, sin consumir una columna lateral.

## Implementación y revisión

Centralizar tokens y primitivas compartidas. No resolver discrepancias añadiendo fondos, tamaños o anchos particulares a cada editor. Probar paneles a distintos anchos, textos largos, estados deshabilitados, errores y ambos temas. Comprobar que todas las medidas siguen visibles y las acciones continúan accesibles por teclado/táctil.

Mantener el catálogo como referencia y validar la implementación en pantallas completas, además de pruebas aisladas de controles.
