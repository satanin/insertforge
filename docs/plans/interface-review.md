# Revisión de interfaz Beta — 2026-10-25

Estado del bloque: el usuario autoriza el commit como v1.2.34. Las notas de validación y «sin commit» de las iteraciones siguientes describen su estado durante el desarrollo; los hallazgos adicionales no implementados permanecen pendientes. Check/build y pruebas de interfaz/defaults verificados.

## Correcciones solicitadas, en validación

- Centrar etiquetas y recuentos de tabs de Dimensions.
- Limitar los campos numéricos de medidas a 11,5 rem, manteniendo etiquetas y campos de texto libres. Dos columnas de medidas con separación regular; valores alineados en filas con etiquetas largas.
- Mover Auto-adjust height to layer de Card Well a Manufacturing en Beta; conservar su ubicación en Classic.
- Llamar Manufacturing a las secciones de estructura en ambas variantes de miniaturas.
- Dar al stepper de miniaturas una columna de 7 rem y una etiqueta de tamaño de texto normal, sin sobresalir del marco.
- Un único scroll del editor sobre el export fijo. Causa comprobada en la app: `.ui-modern .traysPanel` empataba en especificidad con `.traysPanel.svelte-*`; la regla original posterior ganaba y mantenía `height:100%` y `overflow:hidden`. Se aumentó la especificidad y se dejó crecer el formulario.
- Miniature Tray: separar Distribution de Miniatures con tarjetas como las de Miniature Rack; agrupar Lid y Text. Unificar tamaño, peso e interlineado de las etiquetas nativas y de biblioteca en Beta, con ayudas de tamaño secundario uniforme. Cantidades, filas y columnas sin sufijos vacíos, también en modo por modelos.

No se modifica el tamaño del visor, parámetros de geometría ni exports. Sin nueva versión ni commit. Pendiente aceptación del usuario.

## Hallazgos adicionales: pendientes de confirmar antes de implementar

1. **Unidades vacías en cantidades.** Incorporado a la iteración de consistencia de Miniature Tray solicitada después; pendiente aceptación visual.
2. **Dimensiones repetidas.** Miniature Tray muestra medidas en la cabecera y otra vez en Rack summary, y varios editores repiten las mismas cotas dentro de Manufacturing. Propuesta: dejar las dimensiones principales en la cabecera; usar el resumen para capacidad y apilado.
3. **Orden y categorías inconsistentes.** Tile Tray combina Content and dimensions; Dice Tray mezcla Dimensions, lid and finish y Distribution and manufacturing; Card Storage agrupa Content, dimensions and lid; Card Draw divide Content en dos. Propuesta: ordenar por Content, Distribution (cuando aplique), Dimensions, Manufacturing y opciones específicas (Lid/Labels/Finish).
4. **Nombres técnicos en la cabecera.** Aparecen miniatureRack, cardWell, etc. Propuesta: usar nombres visibles con espacios: Miniature Rack, Card Well, etc.
5. **Ayudas extensas siempre visibles.** Usuario solicita convertirlas en botones de ayuda. Implementado en miniaturas, cartas, dados, cajas, capas, boards, medidas generales y exportación: componente `HelpTip` compartido con hover/foco y clic para fijar, clic exterior/Escape para cerrar. Popover nativo en la capa superior y posicionamiento con Floating UI para evitar recortes por el scroll. Datos actuales y avisos activos visibles. Ayudas existentes del inventario conservadas. Pendiente aceptación visual.

## Verificación

- Comprobar 1280 y 1920 px, ambos racks, todos los grupos abiertos, último campo accesible sin quedar bajo Export.
- Comprobar autoHeight en Manufacturing de Card Well y persistencia del valor.
- Comprobar límites del stepper, tipografía de Miniatures, centrado de tabs, ancho de medidas y conservación del canvas.
- `pnpm run check` y build; aceptación visual pendiente.

Resultado local: check sin errores/avisos, build correcto y nueve pruebas de interfaz pasan (dos nuevas de layout y siete de regresión). Comprobados también en la app del usuario el scroll de Miniature Tray y la contención/tipografía del stepper de Miniature Rack. Captura de referencia: `/tmp/insertforge-ui-review/miniature-rack.png`.

Iteración Miniature Tray: check sin errores/avisos y build correcto. Las dos pruebas de layout ampliadas pasan a 1280 y 1920 px: modos libre/modelos/grid, ausencia de sufijos en cantidades y etiquetas de tapa/texto/color con idéntico tamaño, peso e interlineado. Capturas locales de contenido y tapa en `/tmp/insertforge-ui-review/miniature-content-consistency.png` y `miniature-lid-consistency.png`. Pendiente confirmación visual del usuario.

Ayuda contextual: check sin errores/avisos y build correcto. Nueve pruebas desktop/regresión pasan; prueba táctil a 390 px pasa tras ajustar el test para expandir el editor y tocar fuera del popover. Cubren hover, clic fijo, foco/teclado, Escape, cierre exterior y límites del viewport. Verificado en la app local; captura `/tmp/insertforge-ui-review/contextual-help.png`. Sin commit; pendiente aceptación del usuario.

Revisión de colocación solicitada después: las ayudas comparten `HelpRow` con su casilla, campo, dato o título relacionado. Incluye Manufacturing/Lid/Content de miniaturas, medidas de cartas/dados, exportación y ajustes generales. Se retiran las filas exclusivas; los campos y textos pueden reducir su ancho dentro de la fila sin producir scroll horizontal. El popover ajusta también su eje horizontal cuando ninguna posición lateral cabe en móvil. Captura `/tmp/insertforge-ui-review/inline-help.png`. Pendiente aceptación visual; sin versión/commit.

Validación de colocación: check sin errores/avisos, build correcto, siete regresiones de interfaz y las tres pruebas finales de layout/ayuda pasan (390 táctil, 1280 y 1920 px). Se comprueba la alineación horizontal de casilla/ayuda, radio/ayuda y capacidad/ayuda, además del visor, scroll y apertura/cierre del popover.

Revisión de ancho de inputs: `HelpRow` con FormControl usa una cuadrícula; etiqueta y ayuda comparten la primera fila, y el input con su unidad ocupa todo el ancho en la segunda. Se mantienen las asociaciones label/input y el orden de tabulación. Evita estrechar Rack Base Depth y el resto de campos con ayuda. Captura `/tmp/insertforge-ui-review/help-beside-label.png`. Pendiente aceptación visual del usuario; sin commit.

Verificación: check sin errores/avisos, build correcto y tres pruebas pasan (390 táctil, 1280 y 1920). Se comprueba igualdad de ancho de Rack Base Depth y Wall Thickness, ayuda sobre el input y alineada con su etiqueta, además del scroll y visor.

Card Well Beta: se eliminan las secciones Extraction y Corner finish. Manufacturing incluye radio de esquina en la cuadrícula de medidas y extracción después del ajuste de altura; habilitar Extraction notches revela su diámetro y ayuda. Se reutilizan controles y callbacks; Classic conserva su distribución. Pendiente validación visual del usuario; sin commit. Captura `/tmp/insertforge-ui-review/cardwell-manufacturing.png`.

Verificación de esta agrupación: check sin errores/avisos, build correcto y dos pruebas a 1280/1920 px pasan. Comprueban ausencia de las secciones antiguas, controles dentro de Manufacturing y persistencia de radio, activación de extracción y diámetro.

Box/Empty Box y Layered Box: se corrige la agrupación heredada. Dimensions contiene ancho/fondo/altura y ajuste al espacio; Manufacturing contiene tolerancia, paredes/suelo y opciones estructurales (relleno/aligerado); Lid contiene nombre/texto. Medidas numéricas en celdas iguales sin spans de dos columnas. Selectores con texto a ancho disponible. Se retiran separadores clásicos duplicados en Beta. El resto de editores conserva por ahora sus categorías específicas, incluidas decisiones previas sobre autoHeight de Card Well.

Sólo `addBox(..., 'empty')` inicia fillSolidEmpty=false; las cajas con trays y los proyectos existentes conservan su valor. Dos tests de defaults/persistencia pasan. Pendiente validación visual del usuario; sin commit.

Verificación de cajas: check sin errores/avisos, build correcto, dos tests unitarios y dos pruebas de interfaz a 1280/1920 px pasan. Crean Empty Box y Empty Layered Box, verifican categorías, igualdad del ancho de medidas, ausencia de desbordamiento y relleno sólido inicialmente desmarcado en Empty Box. Sin versión/commit.

## Revisión global de categorías

Petición posterior del usuario: aplicar el mismo criterio a todas las piezas. Dimensions = envolvente, límites, ajuste de altura; Manufacturing = estructura, espesores, holguras, redondeos, extracción y retención. Content conserva medidas del componente; Distribution conserva colocación y espaciado. Lid conserva tipo, espesores/holguras propios de tapa y texto. No se añaden capacidades geométricas ni se cambian valores guardados.

| Editor | Dimensions | Manufacturing / otras categorías |
| --- | --- | --- |
| Counter Tray | Ancho personalizado, autoHeight | Paredes, suelo, borde, holguras, radios y recortes |
| Cup Tray | Ancho, fondo, altura de cavidad, autoHeight | Paredes/suelo y radios; layout en Distribution |
| Tile Tray | autoHeight; tamaño calculado desde contenido | Paredes/suelo/borde, holgura y radio |
| Card Draw | autoHeight; tamaño calculado desde cartas | Espesores, holgura, pendiente, radios y huecos de imanes |
| Card Divider | Altura máxima y autoHeight | Paredes/suelo/borde, holgura, radios y grabado |
| Card Well | Mínimos exteriores y autoHeight | Paredes/suelo/borde, holgura, radios y extracción |
| Miniature Rack | Altura, fondo de base, autoHeight | Márgenes, espesores de raíles, tolerancias; medidas de miniaturas en Content |
| Miniature Tray / sockets | Máximos y tamaños fijos | Espesores, holguras, postes y retención; espaciado en Distribution |
| Card Storage | Modo de dimensionado, longitud exterior, altura máxima | Espesores/holguras/radios; cierre y medidas de tapa en Lid; sin autoHeight |
| Dice Tray | Mínimos exteriores | Estructura, holguras, radios y acceso; espaciado/columnas/exposición en Distribution; tapa en Lid |
| Box / Layered Box | Envolvente y ajuste al espacio | Tolerancias, espesores, relleno/aligerado; texto en Lid |

Esta decisión global sustituye el criterio previo de autoHeight en Manufacturing (incluido Card Well). Board sigue siendo un volumen visual de planificación, sin opciones ficticias de fabricación. Las variantes internas reutilizan sus editores. Pendiente validación visual del usuario; sin commit.

Validación global: check sin errores/avisos y build correcto. Pasan siete regresiones de interfaz y las seis pruebas finales sobre la compilación: recorrido por los diez tipos, variantes condicionales de Card Storage/Dice, Board (tres medidas en Dimensions, sin Manufacturing), cajas, ayuda táctil, scroll y conservación del canvas a 1280/1920 px. Se repitió el layout sobre preview estable tras una recarga del servidor de desarrollo durante la primera pasada. Board agrupa ahora ancho/fondo/altura en Dimensions. Captura `/tmp/insertforge-ui-review/all-piece-categories.png`. Pendiente aceptación visual; sin versión/commit.
