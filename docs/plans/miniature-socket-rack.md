# Miniature Rack: alojamientos individuales apilables

Estado: entrega experimental v1.2.17 autorizada para commit/push por el usuario; pendiente de laminado y prueba física. Las iteraciones locales provisionales 1.2.17/1.2.18 se agrupan en esta única entrega.

## Referencia y comportamiento

Referencia: fotografías aportadas por el usuario el 2026-10-18, con alojamientos circulares, pestaña lateral y apoyos de apilado. La peana se introduce desde arriba inclinándola bajo la pestaña y se baja hasta apoyarla. No hay presión ni encaje elástico; la pestaña retiene por solape y no constituye un bloqueo ante movimientos bruscos.

## Primera iteración

- Variante `sockets` de `Miniature Rack`, solo como loose tray. Los proyectos anteriores siguen usando los raíles verticales.
- Un diámetro de peana por rack y rejilla rectangular configurable de hasta 10 × 10 alojamientos.
- Holgura diametral total y holgura vertical independientes. Solape en porcentaje del diámetro (1–45%, predeterminado 25%): 25% de 32 mm son 8 mm. Los valores antiguos en mm se convierten conservando la medida; comprobar retención con la holgura elegida.
- Pestaña rígida en un lado y apertura de acceso al borde de la peana en el lado contrario.
- Fondo continuo, marco perimetral elevado y cuatro postes. Opción de perforar el fondo de cada alojamiento manteniendo un apoyo anular.
- Postes con hombros de apoyo, tetones superiores de 2 mm y huecos inferiores de 2,2 mm para racks de idéntica configuración. La holgura del encaje se aplica por lado.
- Altura de miniatura medida incluyendo su peana, desde el suelo del alojamiento. Se añade margen superior; la altura exterior incluye los tetones y permanece fija aunque la capa sea más alta.
- La preview muestra las peanas; no representa armas o voladizos. La separación adicional la configura el usuario.
- Reutiliza el worker y los exports generales STL/3MF. No incorpora texto grabado en esta variante.

## Validación y siguiente paso

- Tests: dimensiones declaradas frente a geometría, peanas sin intersección en reposo, presencia de retención superior, apilado sin interferencias, aligerado, normalización, serialización y altura fija en la distribución por capas.
- Comprobar en la app: cambiar variante, editar rejilla, preview, duplicar, persistencia y exportación.
- Imprimir primero una muestra de 1 × 2 alojamientos con las medidas reales de la peana. Comprobar introducción inclinada y extracción sujetando la base, sin forzar la miniatura.
- Laminar el modelo y comprobar pestañas y techos de los huecos de apilado. Ajustar tolerancias a la impresora antes de imprimir varias bandejas.
- Validar rigidez bajo carga y estabilidad del apilado físicamente. No considerar estos puntos demostrados por las pruebas geométricas.

## Iteración local: capacidad, espaciado y modelos (2026-10-18)

Sin nueva versión durante las pruebas. Agrupar versión/changelog al preparar el bloque para push.

- Modo libre: cantidad y ancho/fondo exteriores máximos. Calcula filas/columnas y genera exactamente los alojamientos pedidos con una huella compacta; no rellena todos los huecos posibles. Indica capacidad y falta de espacio.
- Modo por modelos: hasta diez tipos con nombre, cantidad, diámetro/grosor de peana y ancho/fondo/altura máximos incluyendo la peana. Mezcla diámetros en una pieza y respeta las cantidades.
- Envolventes rectangulares centradas sobre cada peana, orientaciones fijas. El usuario debe ampliar las medidas si hay elementos descentrados. La búsqueda usa el empaquetador existente sin giros; un resultado negativo no demuestra imposibilidad geométrica.
- Espaciado X/Y enlazado por defecto, separable. En modo libre mide entre exteriores de alojamientos; por modelos, entre las envolventes o alojamientos, lo que sea mayor.
- Altura de apilado según la miniatura más alta, margen superior y suelo. Límite opcional de altura exterior que incluye tetones.
- Volúmenes aproximados visibles con Preview counters, excluidos de exportación.
- Conserva las rejillas antiguas como modo manual. Conserva tolerancias, espesores y solapes guardados; los valores nuevos se normalizan sin reemplazar un proyecto.
- Suelo mínimo 1,2 mm y predeterminado 2 mm. El antiguo mínimo 3,2 mm era innecesario en toda la superficie: los huecos inferiores están dentro de los postes altos, que conservan material sobre ellos.
- Si una configuración no cabe o la búsqueda no encuentra disposición completa, muestra un error y la geometría/exportación falla explícitamente; no exporta una distribución parcial.
- Límite inicial de cálculo: cien miniaturas por rack. Validar capacidades, distribución mixta, suelo y apilado; pendiente de validación física.

## Iteración local: medidas fijas y llenado (2026-10-18)

- Ancho, fondo y altura exteriores fijos opcionales: en blanco no afectan. Incluyen tetones en altura. Si superan los máximos o no dejan altura para el contenido, se muestra error; no se alteran silenciosamente.
- Para apilar racks con contenidos diferentes, usar ancho/fondo fijos iguales y los mismos parámetros de postes y holgura. Pueden tener alturas distintas; cada altura fija debe contener su miniatura más alta y el margen superior.
- Cantidad completa (comportamiento anterior): exige que entren todas las miniaturas.
- Colocar lo que quepa: genera una distribución parcial y exportable, con aviso y cantidades colocadas/pendientes por modelo. Los modelos que no caben en altura quedan pendientes. Sin ninguna miniatura colocable, la configuración sigue siendo inválida.
- Llenar espacio: en modo libre calcula cantidad desde la huella disponible. Por modelos se elige un modelo de relleno; primero se respetan las cantidades de los demás y después se busca cuántas copias del elegido caben. La cantidad del modelo de relleno se calcula y no es un objetivo pendiente.
- En llenado se conserva la huella fija o máxima completa. Fuera de llenado, solo las dimensiones fijas impiden que se compacte la huella.
- Límite de cien miniaturas: se avisa cuando el llenado alcanza ese límite para no presentarlo como capacidad física demostrada. La búsqueda mixta no garantiza el óptimo.
- Los proyectos existentes mantienen cantidad completa y dimensiones fijas vacías. La duplicación conserva la selección del modelo de relleno al renovar identificadores.
- Pendiente de validación del usuario y del encaje físico de racks con contenidos distintos. No se sube versión durante estas pruebas.

## Evolución posterior

Ajuste local tras prueba de inserción/extracción ajustada (2026-10-20): holgura diametral predeterminada 1 → 1,4 mm (+0,2 mm por lado) y grosor de solapa 1,6 → 1,4 mm. Altura libre sobre peana y porcentaje de retención se conservan. No se migran valores explícitos guardados; aplicar esos dos valores a la bandeja existente para probar. Adelgazar la solapa reduce material y mejora la maniobra, pero no aumenta por sí solo la holgura bajo ella. Pendiente prueba física de acceso y retención; sin commit/push.

2026-10-20: el usuario confirma impresión de bandeja con etiquetas bastante bien y aporta fotos de miniaturas que sobresalen ampliamente de las peanas. Corregido en local el clamp de espaciado de 40 mm a 600 mm en normalización y UI, sin cambiar el defecto 6 mm ni las envolventes/cantidades guardadas. Sigue aplicándose el tamaño máximo/fijo del rack: no se reduce silenciosamente una separación para que quepa. Medir ancho y fondo completos por modelo; el modo libre sigue separando sockets, no volúmenes. Las envolventes actuales están centradas en la peana: para voladizos asimétricos hay que reservar conservadoramente dos veces la mayor distancia desde el centro en cada eje. Offsets o extensiones por lado quedan para una iteración posterior. Fotos orientativas, sin inferir medidas exactas por perspectiva.

### Prototipo de etiquetas de sockets (local, posterior a f7c84b7)

Publicación v1.2.19 autorizada por el usuario el 2026-10-19, junto al commit previo de tapa/export v1.2.18. Validación física prevista para el 2026-10-20; mantener Experimental. Las notas de estado local siguientes describen las iteraciones previas al bloque publicado.

Compactación por modelos: al ajustar todas las miniaturas (o cantidad parcial), se prueban también contenedores más estrechos/bajos, no solo el máximo disponible. Se prioriza cantidad colocada y luego área exterior/perímetro, sin girar ni reducir envolventes. Búsqueda acotada a 32 candidatos por eje libre; conserva medidas fijas y no altera Fill. Regresión de referencia: 3 Runners de peana 26 mm + 3 Tanks de 32 mm, envolventes 32 × 32 mm, rack previo 90 × 174 mm. Pendiente revisión visual del usuario; no garantiza el óptimo global.

- Activación opcional, apagada en proyectos existentes. Placa recta exterior detrás de cada socket (lado de la solapa, sin cubrir la entrada opuesta), al nivel superior de la solapa. Apoyo sólido hasta suelo para imprimir sin una repisa suspendida.
- Anchura igual al diámetro exterior del socket. Profundidad como máximo gap Y + pared, recortada por límite del rack, postes y bounds conservadores de sockets/envolventes vecinos. No cambia colocación, capacidad ni tamaño exterior. Si falta hueco, error; no fuerza crecimiento. Comprueba solapes entre placas y posible invasión de la envolvente del propio modelo.
- Modo por modelos: nombre completo como texto predeterminado, campo de abreviatura opcional por modelo. Modo libre/rejilla: texto común configurable. No se trunca ni reduce texto para encajarlo.
- Altura real de glifo configurable desde 4 mm, mínimo conservador máximo entre 4 mm y 10 veces nozzle. Trazo mínimo máximo entre 0,8 mm y 2 veces nozzle. Grabado de 0,4 mm. Perfil dimensional orientativo, no garantía de legibilidad; validar laminado/impresión.
- Modos opcionales: grabado (predeterminado), inserción a ras de 0,4 mm y relieve de 0,6 mm. Inserción/relieve admiten color: un único cuerpo de texto por rack en 3MF, agrupado con el rack y procesado por group3mf. STL une cuerpo y texto, sin color. Preview incluye texto; pendiente validación real en laminador/impresión de estos modos.
- Nombres largos, texto vacío o espacio insuficiente invalidan geometría/exportación con aviso de abreviar/aumentar espaciado/desactivar. Preview y exports comparten geometría. Etiquetas sin commit/push ni cambio de versión mientras se explora.
- El cruce con la envolvente aproximada del propio modelo solo genera advertencia de comprobar acceso/holgura con la miniatura real: no demuestra colisión y no implica texto demasiado largo. Se mantienen los errores de encaje real del texto y solapes de placas.
- Tests: bounds sin crecer, placas dentro de diámetro/gap, sin colisión de peanas en reposo, modelos mixtos y abreviaturas, rechazo de texto largo y nozzle incompatible. Pendiente prueba real con dos sockets contiguos, lectura con miniaturas, acceso inclinado y rigidez.

### Tapa y export individual (2026-10-19, local)

Opciones de texto de tapa aceptadas para commit/push v1.2.20 el 2026-10-19. El usuario probará la tapa con texto el 2026-10-20. La aceptación funcional no cierra la validación física de encaje, letras y apilado.

Iteración posterior a v1.2.19: tapa de miniaturas usa los mismos controles reutilizables de modos/color que las etiquetas: grabado, inserción a ras de 0,4 mm y relieve de 0,6 mm. Texto de tapa como un cuerpo independiente agrupado con la tapa en 3MF, también al exportar solo tapa; STL fusionado. Preview conserva colores. Altura fija/máxima incluye relieve; orientación de impresión con letras hacia arriba si hay relieve (verificar puentes de cavidades inferiores). Grabado/inlay conservan superficie plana; relieve afecta apoyo de otros objetos. Se normalizan nombres de modos existentes en Box/Layered Box sin modificar su geometría de tapa deslizante. Pendiente validación en app/laminador/impresión, sin versión/commit/push durante la iteración.

El usuario confirma que las primeras pruebas impresas son correctas. Se mantiene Experimental para iteraciones nuevas.

Aligerado bajo cada base activo por defecto en bandejas nuevas; se respeta `perforated: false` guardado. Etiquetado de alojamientos pendiente de decidir: preferir códigos cortos junto al socket y leyenda en borde/tapa para evitar nombres ilegibles o tapados por peanas.

- Tapa opcional plana apoyada en cuatro postes, con cavidades ciegas para los tetones y la misma holgura de apilado. Espesor por defecto 3 mm, mínimo 2,8 mm para conservar material sobre cavidades de 2,2 mm. No tiene cierre ni sella los laterales.
- Texto de tapa opcional, activo por defecto: campo vacío sigue el nombre actual de bandeja, texto personalizado lo sustituye. Grabado de 0,4 mm con ajuste a superficie central, sin alterar altura/apilado ni invadir cavidades de tetones. Se conserva en preview y export de tapa; pendiente prueba impresa.
- Corrección local: retirado reflejo Y del texto, que lo mostraba invertido desde arriba. Test con letra asimétrica F en tapa montada y orientada para impresión; pendiente confirmación visual del usuario.
- Huella igual al rack; la altura fija/máxima pasa a incluir la tapa cuando está activa. Sin tapa los proyectos mantienen la geometría anterior. En preview se muestra montada; para ver el interior desactivar temporalmente la tapa.
- STL/3MF general separa cuerpo y tapa. Tapa exportada con cara plana hacia la cama y cavidades hacia arriba. Export individual permite rack+tapa, solo rack o solo tapa.
- Sección de export común para bandejas, cajas con contenido, cajas por capas, capas internas y secciones; Card Storage conserva su selector específico. Los boards permiten exportar su volumen sólido de referencia, no una reproducción del tablero original.
- Export individual conserva alturas calculadas en contexto del proyecto y filtra por ID, no por nombre. Worker independiente para no alterar la caché de la vista. 3MF conserva el paso por group3mf.
- Usuario acepta el bloque para commit local v1.2.18 como punto de retorno antes de explorar etiquetas de sockets. Sin push. Pendiente encaje físico de tapa, flexión y carga admisible. Etiquetado de sockets todavía sin implementar.

Descubrimiento: Add loose tray ofrece `Miniature rack` (raíles) y `Miniature tray` (alojamientos individuales apilables), cada uno con su preview giratoria y creación directa. `miniatureTray` es un identificador de creación/preview; se guarda como `miniatureRack` con variante `sockets`, conservando proyectos existentes y la posibilidad de cambiar de variante.

UI local: el rack individual usa un único panel con resumen y secciones de dimensiones (máximas/fijas), estructura/apilado, miniaturas/distribución y alojamientos/retención. Los desplegables nativos llevan un indicador de flecha explícito y textos más cortos. La pestaña Slots se conserva para el rack de raíles, donde sí edita sus canales individuales. Pendiente de revisión del usuario.

- Peanas ovaladas, filas alternadas y desplazamiento del volumen respecto al centro de la peana.
- Comparar refuerzos y aligerados con impresiones reales.
- Mejorar el acceso y la densidad según las miniaturas de prueba.
- Mantener esta iteración antes del generador automático de insertos; no iniciar el resto de piezas sugeridas hasta revisar este rack.

## Compactación con rotaciones (2026-10-20, local)

El modo por modelos compara distribuciones con y sin giros individuales de 90° usando área exterior y perímetro. Se mantienen todos los componentes antes de minimizar área. El giro incluye solapa, apertura de extracción, placa, texto y envolvente de preview. Con espaciados X/Y distintos, las propuestas con giros reservan el mayor de ambos para conservar separaciones mínimas. Fill y dos dimensiones fijas conservan su comportamiento. Si una propuesta girada impide una etiqueta imprimible, se conserva una alternativa válida sin giros. La búsqueda es heurística y acotada; no garantiza el mínimo absoluto. Pendiente validación visual/física del usuario.
