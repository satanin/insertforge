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

### Tapa y export individual (2026-10-19, local)

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
