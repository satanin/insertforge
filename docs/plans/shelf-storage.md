# Proyectos de almacenamiento para estantería

## Alojamientos pasantes hasta el frontal — propuesta 2026-11-26

Próximo cambio a estudiar por petición del usuario, sin implementación autorizada todavía. Extender los alojamientos hembra de conexión entre shells hasta la cara frontal, eliminando el tope actual de aproximadamente 10 mm. Objetivo: permitir desplazar longitudinalmente un módulo completo (shell y cajón) respecto a sus vecinos y combinar profundidades/posiciones distintas. No es un cambio del recorrido del cajón dentro de su shell ni de la unión de fabricación entre tramos del cajón.

El usuario considera aceptable estudiar la pérdida del alineamiento frontal automático a cambio de mayor configurabilidad. Comparar una variante opcional pasante con la actual con tope; no sustituir ni migrar piezas existentes silenciosamente. Conservar perfil, paso y holguras de la interfaz impresa salvo decisión explícita de revisión.

Antes de implementar, comprobar el recorrido completo en ambos sentidos con vecinos arriba, abajo, izquierda y derecha, combinaciones de simples/dobles, profundidades distintas y shells anteriores. Revisar longitud mínima de contacto y retención al desplazar, riesgo de movimiento involuntario durante extracción, material residual en suelo/lateral/frontal, transmisión de carga y fabricación en las orientaciones actuales. Si hace falta recuperar el posicionamiento, estudiar un tope desmontable o bloqueo impreso opcional sin fijar todavía una solución.

Validar primero geometría, colisiones y compatibilidad; después imprimir una muestra para comprobar encaje, desplazamiento, estabilidad y uso con carga. Una comprobación geométrica no valida resistencia ni durabilidad. La alineación frontal/trasera de la vista actual sigue siendo una colocación del conjunto completo, no evidencia de que módulos individuales puedan desplazarse con la geometría actual.

Validación física 2026-10-31 con cajón lleno de cartas enfundadas: el usuario confirma que el peso se nota pero no impide meter y sacar el cajón sin problemas. Quedan validados en este ensayo el espacio para cartas enfundadas y el deslizamiento con carga. Se suma al montaje revisado del cajón y encaje/robustez de shell con llaves ya confirmados. Las notas históricas que los marcan pendientes quedan superadas por esta prueba; durabilidad con uso continuado y carga máxima no evaluadas, interfaz aún no congelada.

Validación física 2026-10-31 del cajón revisado: el usuario confirma que insertar las llaves del suelo desde el interior mejora mucho la facilidad de ensamblaje y el resultado queda bien. Impresión y montaje de esta revisión validados; pendientes carga, deslizamiento con peso y espacio libre real con cartas enfundadas.

Pendientes confirmados por el usuario2026-10-31 para el cajón completo: carga, deslizamiento y espacio libre real con cartas enfundadas dentro; comprobar también la revisión de asientos interiores del suelo. Mantener estas comprobaciones separadas de la robustez y encaje de la shell ya validados.

Validación física 2026-10-31: el usuario confirma que la shell dividida impresa con llaves encaja de maravilla y queda robusta; ensamblaje de shell validado en encaje y robustez para la prueba realizada. No se ha indicado en esta prueba si usó adhesivo. La validación no se extiende al cajón, sus nuevos asientos de suelo desde el interior ni a carga y deslizamiento del conjunto, aún pendientes.

Estado: iniciado el 2026-10-26. Selector y primer módulo implementados localmente; pendiente validación del usuario y física.

## División en profundidad para impresión — ensayo 2026-10-29

### Llaves inferiores en suelo de 2 mm

`manufacturing.floorKeys` explícito, por defecto false. Con C+F y suelo≥2 se añaden dos llaves del suelo por junta, a1/4 y3/4 del ancho; mantienen las4 laterales. Revisión2026-10-31 tras prueba física: inserción desde el interior hacia abajo, cabeza a0,1 mm bajo superficie interior y asiento a0,9 desde esa cara; el hombro ocupa1,1 mm de espesor en suelo2. Evita el techo suspendido del asiento anterior al imprimir el tramo delantero suelo abajo. Reexportar ambos tramos: no mezclar alojamientos de ambas revisiones; la llave suelta conserva su geometría. El asiento NO atraviesa la media lengüeta: reservar franjas completas hasta1,5 mm más allá del bolsillo y distribuir el solape en el resto del ancho. Sin aumentar envolvente ni reducir hueco útil. La retención normal sigue por fricción/adhesivo; el tope no es un pestillo bilateral. Laminado y prueba física pendientes.

Muestras de esquina ampliadas30→42 mm para un asiento inferior y solape a sus lados, con las mismas funciones de generación que el cajón. Kit4 cuerpos: dos mitades, una llave lateral y una de suelo (dos copias idénticas si ambos espesores2). Archivo lleva `floor-keys-4-parts` para no confundir con el kit anterior. Vista ensamblada muestra llave inferior separándose hacia abajo. Los asientos inferiores introducen hombros/puentes cortos: inspección de laminado pendiente, sin prometer impresión sin soportes en cualquier perfil. Falta probar flexión, adhesivo, retención y deslizamiento a escala completa.

### Suelo de 2 mm autorizado tras ensayo pegado

Usuario confirma que la muestra C+F pegada no se separa al tirar fuerte de ambos lados. Esto valida esa muestra con adhesivo frente al tirón manual, no la retención sin pegamento ni flexión/carga del cajón. Shells de3,6 impresas caben con6 mm libres sobre milano superior en su hueco. Autoriza aumentar suelo1,7→2 y altura de shell+0,3, manteniendo caras útiles y holguras. Paso80,2×109,55, shell exterior82,6×111,95; 4×3=323,2×331,05. En referencia335 sobran3,95 mm verticales totales; margen visor1,5 por cara conserva12 (margen2 exigiría335,05). Muestras C+F regeneradas con labios0,95 y hueco0,1; llaves/asientos sin cambios de perfil. Marco2×2 nuevo cuerpo160,4×219,1/envolvente162,8×221,5. Cambia compatibilidad vertical con retícula anterior; sincronización explícita, no migración silenciosa ni estándar congelado.

### C+F y muestras pequeñas — siguiente ensayo

- Selección explícita `jointStyle: 'lap-keys'`; fallback `keys` reproduce la primera prueba F. No cambia envolvente ni retícula. Shell mantiene juntas a tope con llaves ahora con asiento; el cajón combina llaves laterales con un solape central del fondo.
- Fondo1,7: solape12 mm (11,85 mm efectivos entre holguras de hombros), dos lengüetas0,8 y hueco vertical0,1. Bandas de ancho `drawerWall+1` bajo laterales conservan suelo completo; no hay paredes suspendidas sobre la media lengüeta. Delantero con lengua inferior impreso suelo abajo, trasero con lengua superior impreso extremo trasero abajo. No es un encaje cautivo frente a ambas direcciones de flexión.
- Llaves C+F: cabeza0,8 mm, cara exterior retranqueada0,1 y asiento a0,9 mm. Vástago de perfil menor, hombro alrededor≥1,2 nominal, pared lateral2 conserva1,1 mm de profundidad en el asiento. Cabeza detiene inserción, no impide extracción; cuatro puntas de interferencia en el vástago aportan retención por fricción. Nuevo perfil manual con caras conectadas, sin uniones CSG en el escalón de la llave. No intercambiables con llaves F originales.
- Muestra combinada: dos esquinas30 mm de ancho/alto y longitud máxima29,925, más una llave de pared2. Orientaciones coinciden con tramos completos. Botón `C+F corner test set · 3MF` prepara una placa con3 cuerpos independientes; cada muestra y llave sigue exportable individualmente. Vista ensamblada/explosionada de la muestra; otras muestras aíslan el fondo o el asiento de pared.
- Ensayo dimensionado con referencia de boquilla0,4/capa0,2: labios0,8 equivalen a4 capas nominales, sin perfil de impresora confirmado. Comprobar laminado real. Muestras prueban asiento, montaje, fricción y solape local; no sustituyen carga/deslizamiento del cajón completo.
- Calcula cama útil para delantero y altura útil para trasero, contando la lengua que sobresale6 mm de cada plano de junta; ajusta corte para respetar ambas. Primer ensayo C+F limitado a2 tramos de cajón; más tramos necesitan resolver orientación de fabricación antes de habilitarse. Muestras disponibles también cuando la profundidad elegida cabe de una pieza.
- Export de fabricación: preparar aristas compartidas antes de triangular para evitar T-junctions en los asientos escalonados, con unión de vértices a0,0000001 mm. Sólo para export, nunca reutilizar esa malla en booleanas. 3MF pasa además por `group3mf`. Pendiente impresión/laminado/validación usuario; sin commit/push.

### Intercambio de carriles inferiores por suelo más grueso

Usuario autoriza conservar exactamente la envolvente actual de shell. `bottomTracks: false` elimina sólo los dos apoyos inferiores de0,5 mm; el suelo del cajón pasa1,2→1,7 y su origen baja0,5. El piso útil, altura ensamblada del frontal/asa, caras de labios superiores y holgura2 mm conservan posición. Laterales2 mm, pasos80,2×109,25 y marcos intactos. Configuraciones antiguas conservan carriles por fallback; acción explícita intercambia la misma altura, preset actual3,6 incluye nuevo suelo. Exportar pareja shell/cajón; no mezclar el cajón más grueso con shell antigua de carriles. Pendientes planitud/deslizamiento y carga; este cambio no incorpora aún solape C ni tope de profundidad en las llaves F.

- El usuario adelanta esta fase para evitar ensayos largos antes de descubrir cambios necesarios en la sección. No cambiar la retícula ni los huecos útiles. Shell en curso de impresión con techo3,6; no se altera esa pieza sin activar explícitamente la división.
- `manufacturing` opcional por cajón: cama X/Y, altura útil Z, margen por borde, división automática y holgura de llaves. Defaults250×250×250, margen5 y holgura0,15 por borde. Los archivos antiguos siguen como piezas enteras. La altura se comprueba porque las shells se fabrican sobre el extremo trasero. Se permite giro90° en cama, sin giro arbitrario ni división X/Z.
- Juntas a tope con separación0,15 dentro de la longitud original. Llaves impresas de doble milano atravesando sólo las paredes, con ambas caras0,1 mm retranqueadas. Shell: ocho por junta, dos en cada pared, lejos de milanos exteriores/carriles/labios. Cajón: cuatro por junta en los laterales, sin cortar el fondo1,2. Cuello6 y cabezas14 mm, longitud32; llaves de espesor pared−0,2. Cuatro resaltes sacrificables generan interferencia local0,08 más allá de la holgura nominal. El doble milano resiste separación longitudinal, pero la retención normal es por fricción, sin pestillo positivo; pendiente prueba real.
- Restricciones explícitas de sección/espesores evitan taladrar encajes o dejar restos de una línea: shell cuerpo mínimo76×96, piel/techo≥2,4; cajón laterales≥2 y altura útil lateral≥38. No se engrosa ni redimensiona silenciosamente para hacer caber las llaves.
- Tramos equilibrados de shell según altura Z y de cajón según cama útil. Junta del cajón desplazada hasta25 mm respecto al reparto equilibrado cuando cabe, fuera de la transición frontal/asa. Ejemplo390 mm/250³: shell2×194,925; cajón167,625+217,625 con hueco0,15; mismo ancho82,6/alto111,65 y paso80,2×109,25. Cajón/shell tienen juntas desfasadas.
- Vista de juntas con piezas separadas y llaves coloreadas; vista de fabricación individual con contorno de cama/margen. Export por tramo y tipo de llave, cantidad indicada y en nombre, una copia por archivo; 3MF siempre `group3mf`. Bloquear export entero de shell/cajón cuando la división está activada. Muestras A/B de pared con la misma orientación + llave permiten ensayo barato antes de piezas largas.
- Riesgos pendientes: extracción/inserción de llaves, retención por fricción tras ciclos, resistencia entre capas, flexión del fondo del cajón en la junta, alineación de carriles y milanos longitudinales entre tramos. No hay unión de flexión específica en el fondo. Sin ensayo de carga ni laminado real: no declarar validado. Marcos abiertos no se dividen en esta iteración; snapshots permanecen intactos.

## Rediseño modular con orientación de impresión — vigente

### U continua y captura del cajón — revisión vigente

#### Continuidad de los caminos de carga

- El usuario detecta que el alojamiento de la rama posterior del asa deja un corte vertical en la unión frontal/lateral. Se retiran tanto ese vaciado como las muescas de los extremos del cajón: las uniones superiores permanecen completamente continuas.
- La rama posterior del asa incorpora dos pasos con 0,25 mm de holgura por lado alrededor de las paredes del cajón. Esas paredes también limitan el desplazamiento lateral. Los pasos terminan debajo del puente superior: la U sigue siendo una sola pieza con puente continuo y apoyo distribuido sobre el frontal.
- No cambia la ventana, reserva Premium, envolvente, holgura de labios ni orientación de fabricación. Se conserva por ahora la reserva de fondo detrás del frontal para la rama interior; no recuperar capacidad sin comprobar el contenido.
- 19 pruebas focalizadas y check correctos. Test nuevo muestrea material real en los dos encuentros para paredes de 1,2/2/4 mm, ausencia de colisión con el asa, retirada vertical y continuidad del puente sobre los pasos. Eso no sustituye el ensayo de resistencia ni permite asignar carga admisible.

#### Reserva Premium de la etiqueta y refuerzo frontal

- Las entradas de etiqueta son medidas de carta sin funda. Se añaden 1,5 mm por borde como reserva explícita de envolvente de funda: 63×88 → 66×91 mm, más 0,3 mm de holgura de deslizamiento por lado. Es una reserva de diseño, no una medida universal de todas las marcas; comprobar funda real y ajustar entradas si fuera necesario.
- Grosor de etiqueta = al menos 0,8 mm, usando un Premium mayor cuando venga de la proyección `getProjectCardSizes(project)`. No depende de la funda seleccionada para el contenido. Profundidad útil = max(1,4 mm, grosor Premium + 0,6 mm).
- Labios de ventana de 2,4 mm y fondo sólido de al menos 2,4 mm. Frontal mínimo 6,2 mm con presets; aumenta si aumenta el grosor Premium o el espesor introducido. La U, su hueco posterior y las reservas de contenido siguen el espesor efectivo. Estos criterios sustituyen los antiguos labios/fondo de 1,6 mm y ranura de 1 mm.
- El editor muestra envolvente Premium, profundidad de ranura, refuerzo frontal y material de apoyo. El crecimiento se aplica a la envolvente y se descuenta de capacidad donde corresponde, sin comprimir contenido ni ocultar el refuerzo.
- Tests verifican inserción de la etiqueta de 0,8 mm, adaptación a Premium de 1,2 mm (ranura 1,8/frontal 6,6), material real de labios y fondo, montaje de U y exports. Pendiente funda medida, laminado y prueba física.

- Sustituye el montaje lateral por una única U invertida continua a todo el ancho del frontal. Ramas anterior/posterior de 2,4 mm, canal con holgura nominal de 0,25 mm por cara, caída 18 mm y puente superior 2,4 mm. Los pasos de la rama posterior rodean las paredes sin cortarlas; no hay ya muescas de montaje en el cajón.
- La rama posterior transmite el tirón al frontal; la anterior limita empuje y los pasos alrededor de las paredes limitan movimiento lateral. Retirada hacia arriba con cajón abierto; no hay pestaña anti-elevación todavía. El techo de la carcasa limita la elevación cuando está cerrado. No confundir ese límite con un seguro liberable ni con un ensayo de carga.
- La U tapa la entrada de la carta identificativa: retirar el asa antes de cambiarla. La carta cabe detrás del asa montada; el marco no suma altura. Se reserva fondo útil para la rama posterior y se descuenta de capacidad. La parte alta de los laterales lleva un alojamiento abierto por arriba para esa rama.
- Dos rebordes exteriores del cajón pasan bajo sendos labios interiores de la shell. Reborde saliente 4 mm, parte plana de 2,4 mm e inferior a 45°. Labio de 2,4 mm de espesor, 2 mm de solape, 2 mm de separación vertical sobre el reborde y 2 mm lateral respecto al cuerpo del cajón. El aumento de ancho exterior reserva ese espacio; el contenido no se comprime.
- Pistas inferiores soportan el peso normal. El labio entra en contacto después de consumir la holgura al inclinar/elevar el cajón, mientras exista solape longitudinal. No es un tope de extracción: el cajón sigue saliendo por completo y debe sujetarse al final. El mini cierre por resalte y lengüeta queda pendiente, no incluido en esta revisión.
- Frontal ensanchado tapa los espacios laterales sin rozar la shell. Su base ancha se imprime desde Z=0, evitando un saliente inicial sin apoyo sobre el fondo más estrecho. Los rebordes crecen a 45° desde las paredes. Los labios de la shell se unen a la trasera y crecen desde ella en su orientación de impresión.
- Asa impresa invertida sobre el puente superior de la U, no sobre la barra de agarre anterior. Empuñadura con alma continua y pendientes de crecimiento de hasta 45°, sin puente largo entre dos brazos. Preview y export usan la nueva rotación común; Z=0 y volumen conservado comprobados. La forma cubre parte de la zona superior de la carta.
- `Explode`: 0–70% extrae cajón con asa; 70–100% eleva la U hasta separarla. Tests de trayectoria, encaje por ambas caras y extremos, ventana libre al retirar U, contacto de labios tras 2 mm de elevación y ausencia de contacto a 1,99 mm mientras desliza. Pendiente usuario, laminado y prueba física.
- Verificación local: 17 pruebas focalizadas correctas, check sin errores/avisos y build correcto. Revisadas vista de corte/despiece y nueva orientación de impresión. Configuración de sesión: 91,8 × 250 × 110,7 mm, 292 cartas estimadas frente a 83,8 × 250 × 108 mm y 296 cartas previas. La anchura extra aloja rebordes/holguras y la reserva del asa se descuenta del fondo útil. Sin versión/commit/push.

### Frontal compacto — revisión posterior

- Preview de despiece: `Explode` 0–70% extrae el cajón con el asa; 70–100% mantiene el cajón fuera y desliza el asa hacia la derecha hasta separar sus anclajes. Los módulos vecinos permanecen montados. Solo presentación; no modifica piezas, JSON de fabricación ni exports. Prueba de secuencia y ausencia de interferencia durante desmontaje.

- Ventana encastrada en el frontal, detrás del asa; empieza en Z=suelo+2 mm. Altura = máximo entre cartas almacenadas+headroom y carta identificativa+sus márgenes; no sumar altura de asa y ventana.
- Frontal mínimo 4,2 mm con ventana: labios exteriores de 1,6 mm, ranura de 1 mm y fondo cerrado de al menos 1,6 mm. Hueco de ventana abierto por arriba, sin marco saliente ni travesaño superior. La ranura y la apertura se forman desde el suelo durante la impresión vertical.
- La carta identificativa queda parcialmente tapada por el tirador, en un plano posterior, sin interferir con su desmontaje lateral. Se conserva ese montaje porque resuelve la colisión y tiene perfiles inferiores inclinados; montaje superior/inferior queda como alternativa futura si las pruebas lo justifican.
- Mayor espesor frontal se descuenta de capacidad, sin comprimir contenido. Altura con los ajustes de la sesión baja de 137,6 a 108 mm. Ventanas mayores que el contenido todavía pueden exigir crecimiento, por su propia medida.
- Tests comprueban que el ejemplo estándar no crece en altura al activar ventana, inserción/extracción de carta sin colisión con cajón ni asa, fondo sólido, montaje del asa y orientación de export. 15 tests y check correctos; validación del usuario y física pendientes.

Sustituye las llaves rectas segmentadas y el asa integral de las revisiones anteriores.

- Mirando desde la entrada: macho superior/derecho, hembra inferior/izquierda. El lado izquierdo no tiene salientes, para colocarlo junto a una pared. Una cola de milano longitudinal por cara, con cuello 6 mm, cabeza 9 mm, altura 2,4 mm y holgura nominal 0,2 mm. Arranca a 10 mm del frontal y llega a la trasera.
- Ranuras abiertas por detrás y cerradas delante. **El tope ciego bloquea el retroceso del módulo hembra; no su avance hacia delante**, que recorre el montaje al revés. El usuario elige explícitamente probar sin seguro trasero, tras explicar esta limitación. No afirmar que bloquea la extracción de ambos módulos ni que las disposiciones en voladizo están validadas.
- El socavado se opone a separar directamente módulos en vertical/lateral. Montaje/desmontaje por deslizamiento longitudinal, con acceso trasero. Sin carga máxima validada. Pasos de montaje: ancho/alto del cuerpo, excluyendo los machos que se alojan en el vecino.
- Panel efectivo mínimo de 3,8 mm con conexiones: reserva 2,4 mm de llave + 0,2 mm de holgura + 1,2 mm detrás del alojamiento. Crece el exterior, manteniendo el contenido. Paneles simétricos para permitir uniones en ambos ejes; el espesor efectivo se muestra en Manufacturing.
- Carta identificativa independiente del contenido: ventana opcional, 63 × 88 mm por defecto, editable. Fondo cerrado y marco en U con entrada superior; ranura de 1 mm de fondo y holgura lateral 0,3 mm por lado, labios de 1,6 mm y solape frontal de 3 mm. Base del marco con chaflán, sin travesaño superior que cree un puente largo. La ventana puede aumentar ancho y alto del módulo para conservar tanto la carta como el contenido.
- Tirador separado a todo el ancho, color por módulo y dos anclajes junto a los laterales. Desliza desde la derecha sobre hombros impresos; extremo cerrado de la ranura establece su alineación. Se retira hacia la derecha. El montaje vertical se descartó porque chocaba con el marco de identificación. No hay todavía una pestaña de bloqueo contra el desmontaje lateral; no presentar la retención como validada.
- Shell: trasera sobre la cama y abertura hacia arriba; las colas de milano longitudinales crecen verticalmente. Cajón: fondo plano sobre la cama, apoyos de anclaje y base de marco inclinados. Tirador: barra sobre la cama, eliminando el puente largo de la posición de uso. Los finales ciegos de ranura y pequeños puentes del perfil requieren revisión en laminador.
- `shelfPrintGeometry` centraliza giro y apoyo en Z=0. Vista `Print orientation` y exportaciones individuales STL/3MF usan exactamente esa transformación. Las piezas se muestran separadas, sin garantizar que quepan en una cama concreta. 3MF pasa por `group3mf`.
- Controles de preview: extracción, contenido/etiqueta, corte, módulo superior, módulo adyacente y orientación de impresión. Los controles de montaje se desactivan al mostrar la orientación de impresión.
- Verificación: geometría ensamblada sin solape, recorrido del cajón, inserción superior de la carta, montaje lateral del tirador, topes y sentidos de liberación de colas de milano, pared residual, lateral izquierdo sin salientes, conservación de volumen al orientar y Z=0 en geometría/3MF. Validación física e imprimibilidad pendientes de ensayo.
- Resultado local: 15 pruebas focalizadas correctas, check sin errores/avisos y build correcto; vistas de impresión y conjunto superior/lateral revisadas en navegador. Sin versión/commit/push.

## Primer módulo y vista principal

## Revisión mecánica — 2026-10-26

Propuesta implementada para revisión, no validada mecánicamente. El archivo de proyecto puede contener módulos sueltos; no exige diseñar una colección ni un mueble completo.

### Revisión de imprimibilidad del alojamiento

- El usuario rechaza el resto exterior de 0,4 mm de la primera revisión. Era una pared demasiado fina como decisión de diseño; se retira.
- Llave de ancho fijo 2 mm, holgura de 0,2 mm por lado y material residual mínimo 1,2 mm exterior/interior: ancho de banda mínimo 4,8 mm. Encima del alojamiento se conserva al menos 1,2 mm de material. Estos son márgenes de diseño, no certificación para cualquier boquilla/material.
- Solo se ensanchan bandas superiores e inferiores; el centro de los laterales mantiene el espesor introducido. La banda inferior también guía la parte baja del cajón. El crecimiento exterior preserva el hueco, la capacidad y las holguras de cartas; el editor muestra ancho de banda y pared residual efectivos.
- Tests muestrean material y vacío en la geometría resultante con paneles de 2,4, 3 y 6 mm, incluidos techo del alojamiento y ausencia de engrosado en el centro del panel. Recorrido del cajón, apilado, liberación y exports siguen cubiertos. 16 pruebas focalizadas correctas.
- El puente libre del tirador se muestra como advertencia concreta para revisión de orientación/soportes. No asumir impresión sin soportes, ni escoger espesores solo por viabilidad del booleano. Pendiente perfil de impresión, laminado, cupones y ensayo físico.

### Sección y caminos de carga

- Tracción: asa baja a todo el ancho del cajón → dos cartelas triangulares alineadas con sus paredes → frontal de al menos 3 mm → suelo y laterales. Abertura amplia para varios dedos. Laterales de altura completa junto al frontal, que descienden hacia la zona de acceso. Cartelas exteriores; la envolvente de cartas permanece libre. Revisar el puente más largo del tirador en laminador y necesidad de soportes.
- Peso del contenido: fondo del cajón → dos bandas laterales de apoyo en su cara inferior plana → pistas de la carcasa cerca de las paredes → base. Pistas de 1,5 mm de alto y ancho max(3 mm, pared del cajón), con rampas de entrada. Contacto nominal real en esas superficies; el resto del fondo está separado 1,5 mm del suelo interior de la carcasa. Se descartaron patines salientes bajo el cajón porque elevaban el fondo durante la impresión y generaban un puente ancho. El fondo continuo plano se imprime sobre la cama.
- Guiado lateral: holgura contra las paredes de la carcasa. Este diseño no retiene el cajón verticalmente ni incluye todavía un tope de extracción. Al abrir, disminuye el apoyo; la extracción completa requiere sujetar el cajón. El slider es ilustrativo, no certifica estabilidad abierto.
- Apilado y freno longitudinal: tres llaves separadas por lado entran en seis alojamientos inferiores cerrados. Sus seis caras de extremo se oponen a la extracción horizontal de una carcasa respecto a la otra, tras consumir 0,2 mm de juego. Hombros planos de las bandas reforzadas apoyan entre módulos. Llaves de 2,4 mm de alto, alojamientos de 2,7 mm de profundidad y holgura lateral/longitudinal de 0,2 mm por lado. La punta conserva 0,3 mm libres; no se suspende el peso por la llave. El material residual sigue los mínimos de la revisión de imprimibilidad anterior.
- Separación intencional: levantar el módulo superior más de 2,4 mm y retirarlo. No hay retención vertical ni fijación a la estantería; la pila entera puede desplazarse al tirar. Pendiente medir fuerza de extracción frente al peso, fricción y riesgo de vuelco de la pila.
- Espesor mínimo de carcasa 2,4 mm con encajes; desactivarlos permite seguir usando el mínimo de 1,2 mm. No se deduce una carga admisible de esos mínimos.

### Dimensiones y fabricación

- El refuerzo frontal consume fondo útil: se descuenta la diferencia entre frontal y pared del resolvedor de capacidad. No comprime las cartas ni invade su holgura.
- La altura considera pistas, holgura superior y llaves. El editor diferencia altura exterior de paso de apilado: dos módulos miden dos pasos más la llave superior.
- El asa proyecta 18 mm desde el frontal del cajón. La cota exterior con asa incluye su posición ensamblada.
- Exports conservan las piezas completas. El cajón se coloca sobre el fondo plano y la carcasa sobre la trasera. Revisar puentes del tirador, orientación de capas y geometría de encajes en laminador; la orientación no implica impresión sin soportes.
- `Cutaway shell` omite techo y pared derecha solo en preview; `Preview stack` añade otro módulo cerrado a la separación de montaje. No modifican el export.

### Verificación y pendientes

- Tests de ausencia de interferencias a distintas extracciones y de contacto de apoyo al bajar 0,02 mm el cajón; envolvente de cartas sin colisión con refuerzos. Apilado sin solape nominal, apoyo en hombros al bajar 0,02 mm y bloqueo de desplazamiento lateral mayor que la holgura.
- Verificación de esta revisión: 15 tests focalizados de geometría, persistencia y export correctos; `pnpm run check` sin errores/avisos. Incluyen ancho del asa, abertura de dedos, juego longitudinal ±0,1 mm, bloqueo ±0,5 mm y liberación tras levantar por encima de las llaves. Corte y pila de dos módulos revisados en navegador. No equivale a validación del usuario o física.
- Pendientes físicos: fuerza de extracción con carga, desgaste y agarrotamiento, flexión del frontal/fondo, unión del asa entre capas, deformación del techo al apilar y vuelco con cajón abierto. Una menor superficie de contacto no demuestra menor fricción. Sin carga máxima publicada.
- Antes de fabricar un módulo completo, preparar cupones cortos de pista/banda de apoyo y llave/alojamiento; luego ensayar un cajón con carga y una pila bajo condiciones definidas. No interpretar tests geométricos como ensayo de resistencia.

## Implementación inicial (histórico)

- Lista de módulos a la izquierda, visor compartido y editor a la derecha (75/25 desktop). Los módulos viven en `Project.shelfModules`, con selección propia; no se crean capas.
- `card-drawer`: carcasa cerrada por cinco caras con frente abierto, cajón de laterales bajos y frontal completo con tirador integral. Sin mecanizado de apilado, retención/topes, separadores ni particiones en este bloque.
- Fondo exterior fijo; ancho/alto derivados de cartas, holguras, paredes, suelo y espacio superior. Orientación vertical/apaisada y funda por módulo; usa `getProjectCardSizes(project)` y el resolvedor de Card Storage para capacidad. Cartas verticales sin inclinación automática en este primer módulo.
- Extracción 0–100% y bloque de cartas ilustrativo, sin representar cantidades por grupo. Los controles de preview no alteran los exports.
- Export de cada carcasa/cajón por separado, STL o 3MF mediante `group3mf`. Carcasa orientada sobre su trasera, cajón sobre el fondo; aún sin perfil de impresora ni división por tramos.
- Geometría simple de cuboides calculada localmente en esta primera iteración; mover generación al worker cuando la complejidad lo requiera. Se liberan los buffers de preview reemplazados.
- Tests: dimensiones exteriores, capacidad con funda, orientación, ausencia de solape carcasa/cajón cerrado, errores de cabida, persistencia y separación de layers, export de cuerpos independientes STL/3MF. Ensayo real de holguras, tirador, resistencia y laminado pendiente.
- Verificación local: 10 tests focalizados de modelo/store/export correctos (más 39 tests del store existente verificados durante esta iteración), `pnpm run check` sin errores/avisos y build correcto. Vista revisada en navegador a 0%, 70% y 100% de extracción. Pendiente confirmación del usuario; sin versión/commit/push.

## Primera iteración

- Menú en cabecera con nombre/tipo actual y diálogo de nuevo proyecto; inserto seleccionado por defecto, nombre opcional, aviso de reemplazo, export del JSON actual e importación de JSON.
- `Project.projectType` persistido; ausencia en archivos antiguos se interpreta como `insert`.
- Creación de estantería sin capas ficticias y pantalla experimental sin exports imprimibles. Volver a crear un inserto recupera navegación/editor habituales y limpia selección/cachés anteriores.
- 43 tests de proyecto pasan, incluidos cuatro casos nuevos de tipo, persistencia y compatibilidad. Check sin errores ni avisos; navegador: creación, recarga y vuelta a inserto. La suite general reproduce tres fallos de volumen ya presentes en main y dos timeouts al ejecutarse en paralelo.
- Prototipo en puerto 5176 para mantener independiente el autosave del navegador respecto a main en 5175. Crear reemplaza el proyecto local con aviso y opción de exportación previa; aún no hay biblioteca de proyectos ni recuperación automática de proyectos anteriores.

## Decisiones de partida

- InsertForge tendrá dos tipos de proyecto: inserto para caja (predeterminado) y almacenamiento para estantería.
- El tipo pertenece al archivo del proyecto. Los proyectos existentes se interpretan como insertos. No habrá conversión automática entre tipos.
- El inserto conserva capas, distribución y comportamiento actuales.
- Los módulos de estantería viven fuera de `Layer`: cada módulo representa un conjunto funcional con componentes dependientes.
- Primer conjunto: carcasa apilable y cajón completamente extraíble de un canal para cartas. La carcasa permanece en la estantería al extraer el cajón.
- El cajón no necesita tapa propia. Cerrado, su frontal y la carcasa protegen el contenido; no se presupone un cierre hermético.
- Reutilizar cálculos de cartas, fundas, capacidad y separadores de Card Storage sin cambiar el comportamiento de las bandejas existentes.
- Ahorrar material considerando carcasa y cajón juntos, evitando duplicar paredes altas y gruesas. No fijar espesores definitivos sin pruebas.
- Los separadores móviles sujetos al cajón son parte del objetivo; su mecanismo está pendiente de diseño.

## Modelo y límites

Separar tres niveles:

1. Proyecto: tipo, catálogo de contenido, inventario y restricciones comunes.
2. Conjunto ensamblado: módulo y componentes funcionales (carcasa, cajón, separadores y posibles piezas de unión).
3. Fabricación: cuerpos imprimibles, orientación, particiones y uniones.

El dimensionado útil y la capacidad se resuelven sobre el conjunto ensamblado. La división para impresión no puede reducirlos silenciosamente. Los espesores y las uniones sí pueden exigir crecimiento exterior explícito o producir un error de cabida.

El perfil de impresora describe el volumen útil X/Y/Z y puede compartirse entre tipos de proyecto. Adaptar una pieza requiere comprobar su orientación y las uniones: no prometer impresión en cualquier máquina ni resolverlo con cortes genéricos sin conexión física.

Primera estrategia de partición: tramos previstos por diseño con uniones específicas. Aplazar un cortador universal. Examinar especialmente las juntas del fondo del cajón y el camino de cargas del apilado.

## Iteraciones pequeñas

1. **Tipo de proyecto y persistencia.** Introducir un discriminante compatible con archivos antiguos y creación explícita de proyectos. Selector al crear, inserto por defecto; confirmar reemplazo cuando corresponda. Una vista de estantería inicial debe identificar su estado experimental sin mostrar controles de capas. Verificar carga, guardado y regreso a un inserto. No habilitar exports de conjuntos aún inexistentes.
2. **Módulo entero.** Resolver sección cartas/pestañas → cajón → holguras → carcasa. Editor, preview ensamblada y extracción ilustrativa. Calcular envolvente completa y exportar carcasa y cajón por separado con nombres claros. Mantener el visor compartido cuando sea viable.
3. **Uso real y material.** Diseñar apilado, tirador, cierre frontal, retención y tope liberable. Comparar volúmenes de geometría bajo la misma capacidad; medir consumo real en laminador. Validar deslizamiento y deformación con carga antes de reducir espesores por defecto.
4. **Separadores sujetos.** Prototipo corto de guía y encaje. Diferenciar clasificación y sujeción de una pila parcial; decidir desplazamiento continuo o posiciones discretas. Comprobar impresión, inserción, liberación, inclinación y acceso a cartas.
5. **Fabricación por tramos.** Perfil de impresora, particiones, uniones, vista ensamblada/despiece y export por parte. Probar cupones de unión antes de imprimir un módulo completo. Comprobar tolerancias acumuladas y resistencia con carga.

Cada iteración técnica incluye pruebas focalizadas y `pnpm run check`. Validación visual del usuario y pruebas físicas permanecen pendientes hasta confirmación explícita. Sin versión, commit o push por cada ensayo.

## Decisiones abiertas

- Relación entre tamaño exterior objetivo, capacidad y volumen de impresora.
- Apilado por simple encaje o conexión entre módulos; conexión lateral opcional.
- Orientación de impresión de la carcasa y necesidad de dividirla para evitar soportes.
- Altura de los laterales del cajón y refuerzos del fondo/frontal.
- Mecanismo de separadores y compatibilidad con cartas inclinadas.
- Etiqueta o carta identificativa frontal, sin exponer el contenido almacenado.
- Alcance de extracción segura y liberación para sacar completamente el cajón.

## Compatibilidad y verificación

- No alojar módulos en capas ficticias ni cambiar las dimensiones globales de insertos para representar la estantería.
- Auditar store, persistencia, navegación, generación, selección y export: actualmente muchos recorridos parten de `project.layers`.
- Mantener catálogo y grosores de funda proyectados mediante `getProjectCardSizes(project)`.
- Separar claves de autosave por tipo o adoptar una gestión explícita de proyectos antes de alternarlos; no perder el proyecto abierto al probar el selector.
- Mantener exportaciones 3MF mediante `group3mf` y seguir las restricciones del texto de Card Storage.
- Las pruebas geométricas no sustituyen laminado, impresión ni ensayo de carga/apilado.
# Revisión 2026-10-26: retención desde la shell

## Actualización explícita de Open Frames (2026-10-28)

Usuario pide actualizar marcos a medidas actuales. Los nuevos ya toman snapshot del cajón seleccionado; para existentes se añade `Update all frames` al seleccionar un cajón y selector `Reference drawer` + `Update from reference drawer` al editar marco. Copian sólo pasoX/Z y profundidad, preservan identidad, filas/columnas, grosor y selección. Rechazan origen inválido o sin conexiones. Cambios posteriores siguen sin alterar snapshots automáticamente. Interfaz actual de ensayo: paso80,2×108,85; marco2×2 cuerpo160,4×217,7, envolvente162,8×220,1, profundidad del cajón origen. Tests comprueban compatibilidad con todas las celdas del perímetro de las shells3,6/3,2 y persistencia de sincronización individual/global.

## Ensayo 3,6 / 3,2 mm y retención del asa (2026-10-28)

Usuario autoriza paredes de suelo/laterales/trasera3,6 mm, techo3,2 y material residual mínimo1 mm detrás de alojamientos. Perfil de milanos 27/30×2,4 y holgura0,2 conservados. Nuevos parámetros opcionales `roofThickness`, `socketWebThickness` permiten reproducir también la variante anterior (fallbacks techo=shellThickness, web1,2). Botón explícito de ensayo aplica estos valores, suelo cajón1,2, paredes2, headroom1, holgura deslizamiento0,5 y cartas1. Para contenido66×91 y etiquetaPremium completa: paso80,2×108,85; conjunto4×3=323,2×328,95. Visor del ensayo inicia margen0,5 por cara, editable; el margen total vertical sigue siendo sólo1,05 mm.

Prueba física anterior de cajón/asa: usuario informa juego excesivo y poca sujeción. Ensayo reduce `handleClearance` de0,25 a0,12 por cara (canal mínimo1,64 con lengua1,4); no reduce el espacio de carta con funda. Nuevo `handleRetention` crea pestaña trasera de6 mm de ancho y0,8 de espesor aislada por dos ranuras abiertas de0,6, unida al puente superior. Resalte simétrico con rampas de0,3 mm encaja en rebaje0,35 mm del respaldo (queda al menos2,05 mm de respaldo sólido). Interferencia al pasar de unos0,18 mm exige flexión; no afirmar validación por ensayo de booleanos. La pestaña crece del puente al imprimir invertida, sin viga suspendida, y el resalte crece con rampas. Respaldo y U rígida transmiten el tirón; clip sólo retiene elevación y permite retirada elástica hacia arriba. Sin herrajes. Fallback sin clip y holgura0,25 mantiene disponibilidad del montaje previo; exports usan parámetros guardados.

Pendiente impresión/laminado para confirmar juego, fuerza de montaje, liberación, fatiga y adhesión entre capas del clip. Paredes/paso nuevos requieren shell nueva; cajón/asa nuevos se exportan juntos. Marcos conservan snapshots y deben recrearse o actualizarse explícitamente desde esta retícula, nunca cambiar silenciosamente.

## Prueba compacta y petición de espesores iguales (2026-10-28)

Usuario comunica que la prueba impresa compacta ha ido bien. Quiere estudiar que techo/lateral derecho tengan el mismo grosor que suelo/izquierda. Asumiendo referencia compacta de 2 frente a 3,8 mm, conservar el interior aumenta paso 1,8 mm en X/Z: composición 4×3 de 324,8×331,35 mm sin márgenes. Ancho cabe en 330, altura no. Mantener envolvente exterior engrosando hacia dentro consume 1,8 mm de espacio útil por eje, incluyendo zona de carta/asa en altura: no aplicar silenciosamente. Aclarar la diferencia entre holgura total (4,05 mm vertical) y el incremento acumulado (5,4 mm). No hay cambio geométrico en esta revisión; prueba de carga sostenida sobre raíles para piso futuro sigue pendiente.

## Hito: Modular drawer prototype v0.1

2026-10-27: usuario autoriza commit del trabajo pendiente en la rama de estantería; versión de aplicación 1.2.35. Este hito conserva el prototipo completo como punto de retorno antes de la siguiente impresión. No congela la interfaz ni marca como validados los componentes compactos. Encaje del perfil de milanos original confirmado físicamente; nueva impresión compacta, resistencia/carga sostenida, retícula común fija e interfaz con/sin carta siguen pendientes. Sin push solicitado.

## Labios como raíles planos (2026-10-27)

Usuario solicita aplicar antes de siguiente impresión lo acordado: caras superior/inferior horizontales, sección rectangular con grosor completo de raíz hasta punta. En compacto: proyección 2,5 mm y grosor 4,9 mm. Se añade material sólo por encima de la antigua punta, sin reducir la raíz ni los 2 mm inferiores de holgura, y sin cambiar envolvente o conexiones. Contacto superior disponible para futuro segundo piso; validar carga sostenida/fluencia e interfaz de ese futuro cajón por separado. Impresión trasera mantiene raíles unidos a pared posterior. Opción futura de cajón sin asa con rebaje de dedos queda aplazada y debe respetar misma unidad exterior.

## Regla de unidad común confirmada por usuario (2026-10-27)

Corrige la propuesta de alturas distintas según frontal. Todas las cajoneras de una unidad comparten envolvente, paso X/Z, profundidad de interfaz y posiciones/perfil de conexión, incluyan o no carta/ventana. Los interiores y frentes se diseñan dentro de esa envolvente; desactivar ventana no reduce tamaño exterior. Permitir que un asa oculte parcialmente la carta es una opción de interior/frontal, no otra unidad. Módulos de varias celdas usan múltiplos enteros y conexiones alineadas por celda. Aún se prueban las dimensiones: el preset compacto no constituye una interfaz congelada. Antes de fijarla, migrar el resolver actual, que todavía calcula medidas desde contenido/ventana, a una definición común explícita. Tras validación del usuario, no modificar esa interfaz silenciosamente; revisión incompatible debe ser explícita y conservar generación de la anterior. Esta aclaración sólo documenta el requisito; no afirma que el código ya lo implemente.

## Configuración compacta 4 columnas × 3 filas (2026-10-27)

Petición del usuario antes de próxima impresión: acortar lengüeta/faldón a 8 mm y eliminar espacio superfluo para probar 12 unidades en Kallax. Frente conserva carta Premium 66×91 completa y holgura vertical 0,6 mm después de asiento. Apoyo de etiqueta sobre suelo del cajón, sin margen inferior duplicado. Separación lateral = holgura real de deslizamiento (retirados 4 mm por lado de hombros antiguos), fachada sin sobreancho. Pistas 0,5 mm; retirada sobrealtura histórica 2,65 mm. Techo/derecha/trasera usan shellThickness; suelo/izquierda conservan 3,8 mm mínimo porque contienen sockets. Los labios se reflejan respecto al nuevo lateral interior derecho y se unen a la nueva trasera para impresión.

Preset explícito `Compact for Kallax`: shellThickness 2, drawerFloor 1,2, drawerWall 2, slidingClearance 0,5, cardClearance 1, headroom 1. No altera profundidad, formato ni funda. Para carta 66×91 y etiqueta 63×88 sin funda (66×91 reservados), cuerpo/paso 78,8×107,85 mm; envolvente individual 81,2×110,25, conjunto ensamblado 4×3 =317,6×325,95 mm. Hueco de referencia 330×330 con margen 2 mm por cara: cabe geométricamente, profundidad se revisa por separado. Las medidas reales del mueble siguen editables. Tests verifican esos 12 módulos, volumen de cartas, material residual en sockets y ausencia de colisión cajón/asa/shell durante extracción y entre vecinos. No certifica resistencia de techo/suelo finos; imprimir y ensayar carga antes de fijar interfaz. Perfil y tolerancia del milano se conservan pero las posiciones/pasos cambian y snapshots anteriores de marcos no se redimensionan.

Siguiente iteración de lengüeta (2026-10-27), solicitada por usuario: anterior 1,4 mm, canal mínimo 1,9 mm, frontal mínimo 6,7 mm. Puente y trasera mantienen 2,4 mm; 0,25 mm de holgura por cara. Sustituye el valor de 1,8 mm para la siguiente prueba física. Envolvente y paso exterior conservados.

Revisión de lengüeta anterior (2026-10-27): espesor 1,8 mm en canal mínimo de 2,3 mm, con holgura 0,25 por cara. Conserva puente/rama trasera de 2,4 mm y respaldo continuo. Frontal mínimo baja de 7,7 a 7,1 mm; aumenta profundidad útil sin cambiar pasos X/Z ni envolvente exterior. Fundas más gruesas siguen imponiendo su mínimo de canal. Pendiente ensayo impreso.

## Corrección del respaldo superior señalado en rojo (2026-10-27)

La imagen del usuario identifica la franja posterior de la estructura de carta retirada incorrectamente. Se restaura como respaldo continuo hasta h−2,65 mm, justo bajo puente 2,4 mm y holgura 0,25 mm. El asiento no retira 15,25 mm ni deja el hueco anterior. La U abraza ese respaldo, con lengua anterior de 2,4 mm dentro del canal y lengua posterior de igual caída de 12 mm detrás. Canal mínimo 2,9 mm (0,25 mm por cara de lengua), pieles frontal/posterior conservan 2,4 mm: frente mínimo 7,7 mm. Al ser canal común a carta/asa, cambiar carta requiere retirar asa. Se conserva la banda de carta completa bajo tirador y 0,6 mm mínimo tras asentar.

El apoyo del puente se distribuye por el respaldo recuperado, incluidos ambos extremos; las zonas de tope lateral son parte de ese respaldo continuo. Se eliminan prolongación de 10 mm y webs macizas que compensaban la falta de respaldo. Impresión invertida sobre puente/repisa plana: lenguas crecen desde cama sin puente suspendido. Mayor reserva frontal reduce capacidad estimada; no comprime cartas ni cambia ancho/alto respecto a revisión inmediatamente anterior. Pendiente ensayo físico, incluida fuerza de tirón sobre respaldo.

## Revisión de abertura frontal con topes (2026-10-27)

Sustituye el asiento superficial anterior: carta enfundada completa debajo de la banda de 12 mm del tirador. Altura mínima del cajón = apoyo de carta + altura de funda +12+0,85 mm. Dos escalones laterales de 3 mm de ancho/alto, construidos en las pieles frontal y posterior sin invadir el canal de inserción, frenan el asa tras 0,25 mm de descenso, dejando 0,6 mm sobre la carta. Extremos del asa cerrados desde su cara superior para apoyar sin puentes al imprimir invertida. Rama posterior se prolonga 10 mm por debajo del faldón, detrás de la carta, para transmitir tirón al respaldo sólido; no añade obstrucción visual. Sin seguro anti-elevación.

Ancho mínimo de ventana pasa de funda+9,8 a funda+0,6+2 paredes; el contenido también puede determinar el ancho. No se reduce la holgura de cartas almacenadas ni el volumen de funda. Esta revisión cambia el paso X/Z de la shell (se conserva perfil de milano y tolerancia, no la retícula anterior). Marcos existentes guardan el snapshot anterior y no deben suponerse compatibles con nuevos módulos: crear el marco desde el cajón revisado. Configuración anterior permanece documentada; no declarar compatibilidad con piezas ya impresas. Pendiente ensayo físico y laminado.

## Asa compacta en L enrasada (2026-10-27)

Sustituye la cuña de 25 mm por perfil L de 12 mm de caída y alcance delantero 16 mm. Una sola U central, x entre pared lateral+0,25 mm y pared opuesta−0,25 mm, aloja su puente de 2,4 mm en un asiento frontal de 2,65 mm. Sólo se rebaja el borde central del frontal: las esquinas y paredes laterales continúan hasta arriba y guían lateralmente el asa. La rama posterior recibe el tirón, la anterior limita movimiento opuesto. No incorpora seguro de elevación. Carta identificativa con funda mantiene dimensiones y holguras; se baja 1 mm su apoyo para dejar al menos 0,6 mm bajo el puente en el mínimo de altura. Retirar asa antes de cambiar carta.

Impresión del asa invertida, cara superior plana sobre cama: puente de U y repisa del tirador continuos; las ramas y faldón crecen verticales. Bisel inferior de 1 mm en el faldón. Preview/export comparten giro y Z=0. No estrecha aún shell/cajón ni altera el paso ya impreso; se retiene la reserva histórica de 2,65 mm en la altura de shell. El nuevo cajón y asa se exportan como pareja; el asa nueva no es intercambiable con el cajón anterior sin asiento. Pendiente prueba real de impresión/carga.

## Resultado impreso y auditoría de espacio (2026-10-27)

Usuario confirma excelente encaje entre dos shells impresas con milanos 27/30 mm y holgura 0,2 mm; validación limitada a esa prueba, no certifica carga ni cajón. Observa shell excesivamente resistente/ancha y prepara prueba del cajón. No cambiar tolerancia/perfil de conexión sin nueva evidencia.

Con la configuración revisada (carta almacenada de 66 mm, etiqueta sin funda 63 mm, paredes de cajón 2 mm, holgura carta 1 mm, deslizamiento 0,5 mm): ancho natural del cajón 72 mm, pero ventana exige 66+9,8=75,8 mm. Separación shell/cajón: 4,5 mm por lado, de los cuales 4 mm proceden de hombros exteriores ya retirados. Paneles 3,8 mm por lado por mínimo de alojamiento; cuerpo 92,4 mm, saliente final 2,4 mm: envolvente 94,8 mm. Esos 8 mm heredados son el primer candidato a recuperar adaptando fachada/asa/labios; no basta cambiar una constante porque la fachada sobresale 4 mm por lado. El mínimo de panel se aplica hoy a toda la carcasa: estudiar paneles finos con refuerzos locales en alojamientos, conservando material residual. Reducir paso cambia compatibilidad de retículas/marcos ya generados aunque el perfil de conexión se conserve: documentar revisión antes de fijar estándar. Esperar prueba del cajón para afinar holguras reales de cartas y deslizamiento.

## Marco abierto modular (2026-10-27)

Segundo tipo de módulo: `open-frame`, un marco continuo sin fondo que sustituye un rectángulo de celdas. Creación desde el cajón seleccionado (o primer cajón disponible); guarda snapshot del paso X/Z y profundidad. Cambiar ese cajón después no modifica el marco. Valores iniciales 2×2 y pared 8 mm, editable 6–30 mm. Exterior de cuerpo = número de celdas × paso, más salientes expuestos; conectores del mismo perfil de 30 mm en cada centro de celda del perímetro. Macho arriba/derecha, hembra abajo/izquierda, entrada trasera y frente ciego. Los conectores sólo alinean/retienen; el marco completo distribuye la carga alrededor del hueco, pendiente de ensayo real.

Impresión entera apoyada en su borde trasero, hueco hacia arriba: sección constante que crece desde cama, sin techo que puentear. Huella incluye los conectores, altura de impresión = profundidad. Export STL y 3MF por flujo común/group3mf. No implementa particiones ni compositor mixto todavía. Montar desde detrás con espacio para deslizar; no existe seguro trasero, conforme a decisión previa. La prueba impresa de shells del usuario sigue en curso y no se considera validada por estas pruebas geométricas.

## Simulación de hueco de estantería (2026-10-27)

`Try in a shelf` superpone una vista frontal esquemática a escala y sección lateral (alineada atrás) sobre el visor, sin desmontar el canvas. Repite el módulo seleccionado; editor sigue operativo. Dimensiones editables del hueco y margen de montaje temporal, sin persistencia ni cambio en exports. Cuenta columnas/filas mediante paso de cuerpo y añade sólo una altura de conector en cada borde expuesto; reserva margen en ambos lados. Profundidad incluye tirador y margen trasero; avisa si sobresale la shell o sólo el tirador. No valida capacidad de carga del mueble. Referencia Kallax 330×330×390 mm según [IKEA](https://www.ikea.com/dk/da/customer-service/knowledge/articles/786b6cf7-1321-4c99-97fg-dc0d145eccd7.html); medidas reales editables. Pendiente revisión del usuario.

Segunda revisión de milanos 2026-10-27: perfil base/cabeza 27/30 mm, sustituyendo 9/12 mm tras revisión del usuario. Aproximadamente un tercio del ancho actual; altura, pendiente y holgura conservadas.

Revisión 2026-10-27: colas de milano exteriores ampliadas de base/cabeza 6/9 mm a 9/12 mm, con alojamientos equivalentes. Altura 2,4 mm y holgura 0,2 mm conservadas; la inclinación de flancos no cambia. Los nuevos conectores no deben mezclarse con shells impresas con el perfil anterior.

Revisión 2026-10-27: labios trapezoidales con cara inferior plana, punta de 2,4 mm y raíz de 2,4 mm más el alcance, formando refuerzo superior a 45°. Configuración actual: raíz de 8,9 mm. Se conserva la holgura inferior de 2 mm y la impresión apoyada sobre la trasera; el perfil se extruye desde esa pared. Pendiente ensayo físico.

Sustituye las referencias anteriores a hombros/rebordes exteriores añadidos al cajón. El cajón conserva laterales lisos; su propio borde superior sirve de contacto. Los labios pertenecen exclusivamente a la shell, quedan 2 mm por encima de los laterales y empiezan después de la transición alta frontal. Al extraer, esa transición se aleja de los labios. Las pistas inferiores soportan el peso habitual; la retención sólo actúa mientras existe solape longitudinal. Pendiente validación impresa con carga.
