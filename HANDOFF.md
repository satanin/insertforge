# InsertForge Handoff

- Profundidad inicial de nuevas shells: 380 mm. El módulo de 390 mm conserva su configuración para exportar un tramo trasero de sustitución 10 mm más corto. El frontal ya impreso conserva su plano de junta. Pendiente comprobar la sustitución impresa.

- 2026-11-15 ensayo de tabique fijo con milano vertical para cajón partido. Selector Divider dovetail y dos probetas 3MF en configuración de impresión. C+F sigue disponible y la shell usa llaves con asiento. Ensayo de holgura: hembras de shell y marco +0,1 mm por flanco, igual profundidad y paso. Compatibilidad con shells anteriores obligatoria salvo decisión explícita. Pendientes laminado, ajuste con dos vecinas y prueba de flexión del tabique.

- 2026-11-15 ensayo con cinco shells y varios cajones: los milanos entran ajustados, sobre todo contra dos vecinas. Probar alivio lateral del alojamiento sin profundizar ni cambiar el paso. La unión C+F funciona bien en shell y se conserva en cajón como opción. Candidatos para cajón: monobloque plano si cabe y solape pegado que abrace fondo y laterales para camas pequeñas. Pendiente definir e imprimir probetas. Ver [plan](docs/plans/shelf-storage.md).

- 2026-11-01 proteger configuración del sistema en UI: contenido/etiqueta/headroom/espesores/holguras/conexiones y presets sólo tras Unlock prototype settings por módulo; por defecto información. Longitud, nombre, color y fabricación siguen editables. Nuevos cajones copian parámetros del seleccionado o primer cajón (snapshot independiente); proyectos existentes intactos. No es aún un resolver de unidad fija ni estándar congelado. Revisión visual usuario pendiente, sin commit.

- 2026-11-01 usuario reporta rotura fácil del clip flexible trasero del asa. Ensayo: grosor0,8→1,2 mm hacia vaciado posterior, conservando cara de acoplamiento, resalte y bolsillo del cajón; lengüeta de carta1,4 intacta. Sólo asa nueva, sin cambiar shell/cajón/retícula. Más rigidez: inserción, flexión y durabilidad pendientes de nueva prueba física. Sin commit.

- 2026-10-31 usuario confirma cajón completo lleno de cartas enfundadas: caben y el peso se nota pero permite meter y sacar sin problemas. Espacio con fundas y deslizamiento con carga validados en este ensayo, además del montaje del cajón y robustez/encaje de shell con llaves ya probados. Durabilidad con uso continuado no evaluada; no implica congelar interfaz ni carga máxima especificada.

- 2026-10-31 usuario valida impresión y montaje del cajón con llaves del suelo insertadas desde el interior: facilita mucho el ensamblaje y queda bien. Encaje revisado validado físicamente; siguen pendientes carga, deslizamiento con peso y espacio libre con cartas enfundadas. Sin cambios de geometría ni commit.

- 2026-10-31 usuario precisa pendientes del cajón completo: prueba de carga, deslizamiento y comprobación del espacio libre real con cartas enfundadas dentro, además del nuevo asiento interior de llaves del suelo. Shell dividida con llaves ya validada en encaje y robustez.

- 2026-10-31 usuario valida impresión de shell dividida con llaves: encaje excelente y robustez del conjunto satisfactorios. Dar por probado ese ensamblaje de shell en el ensayo realizado. Cajón con llaves de suelo desde interior, carga y deslizamiento siguen pendientes. No se modifican geometrías ni se congela la interfaz.

- 2026-10-31 prueba del usuario detecta asiento inferior suspendido en tramo delantero. Llaves del suelo C+F invertidas: inserción desde interior hacia abajo, cabeza retranqueada0,1 bajo superficie interior; muestras y preview comparten orientación. Misma envolvente/solape/llaves sueltas; reexportar ambos tramos, alojamientos nuevos incompatibles con pareja anterior. Pendiente laminado y validación física; sin commit.

- 2026-10-30 usuario solicita simplificar descargas: una sola sección Export parts con shell/cajón/asa/llaves y cantidades, sin muestras, kits ni previews de muestras en UI. Selector de fabricación filtrado igual; geometría/generadores de prueba conservados para reproducir ensayos. Sin cambiar medidas ni configuración C+F del proyecto; revisión visual usuario pendiente, sin commit/push.

- 2026-10-29 usuario valida facilidad de montaje de nueva muestra con llave inferior; siguiente prueba cajón completo380 mm. Proyecto abierto `Card drawer 1` seguía en F original al activar split (C+F sólo estaba en módulo390). Se selecciona explícitamente C+F+floorKeys en380 y se muestra Preview depth joints; sin cambiar medidas, color ni perfiles. Configuración y export de ese módulo ya generan solape y6 llaves de cajón. Validación visual usuario/carga completa pendientes. Sólo ajuste del proyecto abierto y nota operativa, sin cambios de código ni commit.

- 2026-10-29 llaves inferiores C+F añadidas como opción explícita `floorKeys` (fallback false para reproducir muestras previas): requiere suelo≥2, dos por junta desde abajo, cabeza0,1 mm retranqueada. Alojamientos en franjas de suelo completo con1,5 mm de material fuera del bolsillo, solape entre franjas; no tallar asiento en labios0,95. Muestra combinada42 mm con1 llave lateral+1 inferior; kit3MF4 cuerpos y nombre `floor-keys-4-parts`. Misma envolvente/paso. Ensayo físico/laminado/carga pendientes; no commit/push.

- 2026-10-29 usuario autoriza suelo cajón1,7→2 mm y crecimiento explícito shell+0,3, conservando huecos/holguras. Paso80,2×109,55; shell82,6×111,95; 4×3=323,2×331,05; referencia335 deja3,95 vertical total (visor1,5 por cara, con2 por cara faltan0,05). C+F labios0,95/hueco0,1; actualizar ambos cajones y Open Frame explícitamente. Usuario valida shells anteriores3,6 (6 mm libres sobre milano en su estantería) y muestra C+F pegada resiste tirón manual fuerte; no inferir retención sin adhesivo ni carga/flexión del conjunto. Impresión nueva/carga siguen pendientes; sin commit/push.

- 2026-10-29 C+F experimental implementado para prueba pequeña: solape central fondo12 mm con labios0,8/holgura0,1 en suelo1,7; llaves con cabeza0,8/asiento0,9 que detiene inserción. Shell usa llaves con asiento; cajón2 tramos, delantero suelo abajo y trasero extremo trasero abajo. Sin cambiar retícula/hueco útil. Selector explícito conserva F original. Muestras combinadas de esquina30 mm + llave, placa3MF de3 cuerpos y vista de montaje; pruebas físicas/carga/retención pendientes. Preparación de malla sólo al export para unir T-junctions de asientos. Ver [plan](docs/plans/shelf-storage.md). No congelar ni commit/push.

- 2026-10-29 intercambio autorizado sin cambiar envolvente shell: retirar carriles inferiores0,5 y aumentar suelo cajón1,2→1,7. Opción `bottomTracks` (fallback histórico true); preset3,6 usa suelo1,7/sin carriles y acción explícita para aplicar intercambio a módulos anteriores. Laterales2 mm y labios de captura conservados, igual retícula/piso útil/posición de asa; exportar shell+cajón nuevos, el cajón más grueso no está destinado a shells antiguas con carriles. Marcos no requieren cambio. C+F/tope de llave siguen pendientes, no implementados en este ajuste. Pendiente deslizamiento/impresión y carga, sin commit/push.

- 2026-10-29 división en profundidad iniciada por usuario: volumen impresión X/Y/Z+margen por cajón, llaves impresas de doble milano enrasadas (8 shell/4 cajón por junta), juntas desplazadas y muestra A/B pequeña. Conserva ancho/alto/retícula/hueco útil; activación explícita, export por tramo/llave con cantidades, preview por pieza/cama y juntas. Fondo1,2 del cajón sin encaje de flexión: carga/ciclos/alineación y retención por fricción pendientes de ensayo; no congelar diseño. Ver [plan](docs/plans/shelf-storage.md#división-en-profundidad-para-impresión--ensayo-2026-10-29). Sin commit/push.

- 2026-10-29 usuario valida impresión de shells y encaje nuevo de asa (retirada difícil aceptada); carga de cajón completo pendiente. Autoriza techo 3,6 mm igual a suelo/laterales, respaldo socket 1 mm conservado. Paso80,2×109,25; conjunto4×3=323,2×330,15. Referencia Kallax335×335 según capturas aportadas y medición física (~15 mm libres en ancho sin milano). Preset y preview actualizados, marco abierto sincronizado explícitamente; retícula vertical cambia respecto a ensayo3,2. Pendiente impresión/revisión de techo nuevo, sin congelar interfaz ni commit/push.

- 2026-10-28 actualización explícita de marcos autorizada: `Update all frames` desde cajón y `Update from reference drawer` en editor de marco copian paso y profundidad actuales, conservando filas/columnas/grosor/nombre. Ensayo actual paso80,2×108,85; marco2×2 cuerpo160,4×217,7 y envolvente162,8×220,1. Proyecto abierto sin marcos, se recrea2×2 desde cajón de referencia. Sin migración silenciosa ni commit/push; pendiente revisión usuario/impresión.

- 2026-10-28 usuario autoriza ensayo 3,6 mm suelo/laterales/trasera y 3,2 techo, mínimo tras hembra 1 mm. Nuevo preset explícito `Trial 3.6 / 3.2 + handle fit`; 4×3=323,2×328,95, margen inicial visor 0,5 por cara. Ensayo impreso de asa anterior reporta demasiado juego: ajuste nuevo 0,12 mm por cara (antes0,25), clip trasero integrado 0,8 mm con resalte rampado0,3 y alojamiento0,35 en respaldo; retirada elástica hacia arriba, sin herrajes. Cambia pareja cajón/asa y paso shell; snapshots marcos anteriores intactos. Valores antiguos siguen disponibles por defaults/fallback. Pendiente impresión del nuevo ensayo; sin commit/push.

- 2026-10-28 usuario confirma que nueva prueba impresa compacta ha ido bien. Solicita estudiar igualar techo/derecha al suelo/izquierda (3,8 mm). Con mismo interior, añadir 1,8 mm por unidad eleva 3 filas de 325,95 a 331,35 mm; 4 columnas pasan de 317,6 a 324,8 mm. El ancho cabe pero la altura supera referencia Kallax 330 mm. Pendiente decisión de ajuste manteniendo unidad/compatibilidad; sin cambios geométricos todavía. Validación no implica carga sostenida de segundo piso.

- 2026-10-27 usuario autoriza commit de todos los cambios pendientes como `Modular drawer prototype v0.1` (app 1.2.35). Incluye modo estantería, módulos/cajón/asa/marco, simulación Kallax y compacto 4×3. Check sin errores/avisos, build correcto y 70 tests focalizados (31 estantería +39 store general); build mantiene aviso de fuente RavenHell ausente. Estado de pruebas y diseño en [plan](docs/plans/shelf-storage.md). Próximo: validar nueva impresión compacta con carga; fijar unidad exterior común independientemente de ventana/contenido; comprobar compatibilidad de marcos. Encaje original de milanos validado por usuario, nueva geometría aún pendiente. Sin push solicitado.

- 2026-10-27 labios planos: sección rectangular con caras superior/inferior planas; grosor de raíz conservado hasta punta (4,9 mm en compacto). Holgura inferior 2 mm y envolvente/paso sin cambios; apoyo superior preparado geométricamente para nivel futuro, sin validación de carga sostenida. Sin cambiar orientación/export. Asa opcional con rebaje de dedos aplazada, deberá respetar misma unidad. Pendiente usuario/impresión. Sin versión/commit/push.

- 2026-10-27 regla de sistema aclarada: una unidad debe mantener las mismas medidas exteriores/paso y conexiones tenga o no carta, ventana u otros interiores. No crear variantes de altura por frontal. Módulos mayores = múltiplos del paso común. Medidas actuales aún de prueba, sin interfaz congelada. Pendiente adaptar resolver actual (todavía deriva tamaño del contenido/ventana) a retícula común antes de fijar estándar; no se ha cambiado geometría en esta aclaración. Ver AGENTS.

- 2026-10-27 compactación para 12 en Kallax: lenguas/faldón 8 mm; retirados 4 mm heredados por lado y sobrealtura antigua 2,65 mm; etiqueta apoya sobre suelo del cajón; pistas 0,5 mm. Shell asimétrica: mínimo 3,8 mm sólo en suelo/izquierda con hembras; techo/derecha/trasera usan espesor solicitado. Botón `Compact for Kallax`: shell 2, suelo cajón 1,2, paredes 2, holgura deslizamiento 0,5/cartas 1, headroom 1. Con carta 66×91 y etiqueta Premium completa: paso 78,8×107,85, conjunto 4×3 317,6×325,95 mm; cabe en 330×330 con margen 2 mm por cara. 31 tests y check correctos; incluye colisiones de extracción, vecinos y retención de huecos. Perfil/tolerancia de milanos conservados, retícula cambia; marcos anteriores no actualizados. Pendiente usuario y ensayo físico de versión ligera. Sin versión/commit/push.

- 2026-10-27 siguiente prueba de lengüeta: usuario pide 1,4 mm; canal mínimo 1,9 mm con holguras conservadas. Puente/trasera 2,4 mm; frontal mínimo 6,7 mm y pasos exteriores sin cambios. Pendiente ensayo impreso y revisión usuario; sin versión/commit/push.

- 2026-10-27 lengüeta de carta aligerada: anterior 2,4→1,8 mm, puente y rama posterior conservan 2,4 mm. Canal mínimo 2,9→2,3 mm (0,25 por cara), frontal 7,7→7,1 mm; misma envolvente/paso exterior y mayor profundidad útil. Pendiente revisión del usuario e impresión del asa. Sin versión/commit/push.

- 2026-10-27 corrección del respaldo rojo señalado por usuario: recuperada toda la franja superior posterior de etiqueta hasta h−2,65 mm (puente 2,4 + holgura 0,25). Asa U abraza ese respaldo: lengua anterior entra en canal de carta ensanchado a mínimo 2,9 mm, posterior sólo 12 mm, eliminada prolongación compensatoria de 10 mm y extremos macizos innecesarios. Apoyo ahora continuo en respaldo, incluidos extremos. Frontal mínimo 7,7 mm; capacidad recalculada por +1,5 mm de profundidad reservada. Carta no recibe apoyo ni queda tapada. Pendiente revisión usuario/impresión. Sin versión/commit/push.

- 2026-10-27 asa en abertura con escalones: reserva carta Premium completa bajo faldón 12 mm, separación 0,85 mm nominal / 0,6 mm tras apoyo. Dos apoyos laterales 3 mm, canal de carta libre; extremos cerrados del asa transmiten apoyo y rama posterior prolongada 10 mm transmite tirón. Se elimina margen lateral arbitrario 9,8 mm de etiqueta: ancho mínimo = funda +0,6+2 paredes. Revisión dimensional explícita: ancho menor y altura mayor; no intercambiable con shells antiguas ni snapshots de marcos anteriores. Perfil/holgura de milanos probados conservados. Pendiente revisión usuario y prueba física. Sin versión/commit/push.

- 2026-10-27 asa compacta implementada: tirador L de 12 mm sustituye cuña 25 mm. U central entre laterales intactos, asiento 2,65 mm sólo en borde frontal central; puente superior enrasado. Carta Premium baja 1 mm, conserva altura útil y holgura bajo puente. Asa invertida sobre cara superior plana, sin puente suspendido. Shell y paso conservados para impresiones existentes; reducción de ancho/ventana sigue pendiente. Cambia pareja cajón/asa: exportar ambos nuevos. 25 pruebas focalizadas correctas; pendiente revisión usuario, laminado y prueba física. Sin versión/commit/push.

- 2026-10-27 eliminar módulos: botón × por pieza en lista y confirmación inline Remove/Cancel. Conserva selección superviviente, permite lista vacía y guarda estado. Asa compacta en L y reducción de ancho siguen propuestas pendientes, no implementadas; visor mantiene cuña anterior. Pendiente revisión usuario. Sin versión/commit/push.

- 2026-10-27 prueba física del usuario: dos shells impresas encajan muy bien; perfil/holgura de milanos de 30 mm validados en esa muestra. Shell percibida excesivamente fuerte y ancha. Cajón aún pendiente de imprimir/probar. Auditoría: separación lateral conserva 4 mm extra por lado de antiguos hombros retirados; ventana impone ancho 75,8 mm; paneles forzados a mínimo 3,8 mm por alojamiento. Prioridad: compactar/anivelar material sin reducir huecos de cartas/fundas ni alterar perfil de milanos validado. Revisar compatibilidad de pasos antes de cambiar dimensiones. Sin cambios geométricos en esta revisión.

- 2026-10-27 marco abierto: nuevo módulo `Open frame`, por defecto 2×2, fuera de Layer. Snapshot de paso/ancho/alto y profundidad del Card Drawer seleccionado; columnas/filas, profundidad y pared editables (8 mm inicial). Conector por celda en perímetro, macho arriba/derecha, hembra abajo/izquierda; perfil compartido de 30 mm. Pieza única con export STL/3MF (group3mf), orientación trasera/Z=0 y huella visibles. Sin división de impresión aún. 24 tests focalizados correctos (vecinos en 4 caras, export y snapshot/persistencia); check correcto. Pendiente revisión usuario, prueba de encajes en curso y ensayo de carga. Sin versión/commit/push.

- 2026-10-27 simulación de estantería: botón `Try in a shelf`, frontal a escala con repetición del módulo actual y sección lateral con tirador. Hueco Kallax de referencia 330×330×390 mm editable, margen 2 mm por lado; cuenta paso ensamblado y conectores expuestos. Muestra filas/columnas, capacidad, sobrantes y desbordamiento en profundidad. No altera piezas/exports; canvas permanece montado. 17 pruebas focalizadas y check correctos; pendiente revisión del usuario. Sin versión/commit/push.

- 2026-10-27 segunda ampliación de milanos: usuario considera insuficiente 9/12 mm. Base/cabeza pasan a 27/30 mm (aprox. un tercio del ancho actual), manteniendo altura, pendiente y holgura. Macho/hembra coordinados; sustituye la medida anterior. Pendiente revisión del usuario y ajuste impreso; sin commit/push.

- 2026-10-27 colas de milano más anchas: base 6→9 mm, cabeza 9→12 mm, macho y hembra coordinados. Conserva altura 2,4 mm, pendiente de flancos, holgura 0,2 mm y pared residual mínima. Cambia compatibilidad con prototipos anteriores. Pendiente revisión del usuario/ajuste impreso; sin commit/push.

- 2026-10-27 raíz de labios: sección trapezoidal con cara inferior plana y refuerzo superior a 45°. Punta 2,4 mm; raíz 8,9 mm con configuración actual (se adapta al alcance). Conserva 2 mm sobre pared del cajón, recorrido y orientación de export. Pendiente revisión del usuario y ensayo impreso con carga. Sin versión/commit/push.

- 2026-10-26 labio sólo en shell: retirados rebordes exteriores del cajón por indicación del usuario. Labios interiores solapan directamente las paredes existentes, 2 mm por encima, empezando detrás de la transición frontal alta para permitir extracción. Sustituye el diseño anterior de hombros añadidos. Pendiente revisión del usuario e impresión con carga; sin commit/push.

- 2026-10-26 unión frontal/laterales: usuario señala debilitamiento por ranuras de montaje de asa. Eliminados todos esos cortes del cajón; frontal y laterales quedan continuos hasta arriba. Pasos de holgura en la rama posterior del asa, puente superior continuo; las propias paredes guían lateralmente. 19 tests focalizados y check correctos, incluidos muestreos de material real para paredes 1,2/2/4 mm. Pendiente revisión del usuario y carga impresa. Ver [detalle](docs/plans/shelf-storage.md). Sin versión/commit/push.

- 2026-10-26 etiqueta Premium: carta sin funda 63×88 recibe reserva de funda de 1,5 mm por borde (66×91) y holgura lateral 0,3 mm por lado. Ranura mínimo 1,4 mm (Premium de proyecto, mínimo 0,8 + 0,6 de holgura); labios/fondo 2,4 mm cada uno y frontal mínimo 6,2 mm, con U adaptada. Reserva y espesores efectivos visibles; capacidad recalculada sin comprimir cartas. 18 tests focalizados correctos; pendiente validación usuario/laminado/impresión. Ver [detalle](docs/plans/shelf-storage.md). Sin versión/commit/push.

- 2026-10-26 U continua/labio: asa superior abraza frontal entero con ramas anterior/posterior y cierres laterales. Retirada vertical (Explode actualizado); quitar antes de cambiar carta. Sin pestaña anti-elevación con cajón abierto; techo limita elevación cerrado. Labios capturan rebordes exteriores con 2 mm verticales/laterales de holgura y solape 2 mm. Hombros a 45°, fachada apoyada desde cama, asa impresa sobre puente de U con empuñadura inclinada. Mayor envolvente y reserva tras frontal explícitas; contenido intacto, capacidad recalculada. Pendiente validación del usuario/laminado/ensayo. Ver [detalle vigente](docs/plans/shelf-storage.md). Sin versión/commit/push.

- 2026-10-26 despiece de estantería: slider `Explode` en dos fases (0–70% extrae cajón, 70–100% desliza asa a la derecha y descubre anclajes). Solo preview; no cambia montaje guardado ni exports. Pendiente revisión del usuario. Ver [diseño](docs/plans/shelf-storage.md). Sin versión/commit/push.

- 2026-10-26 frontal compacto: ventana encastrada detrás del asa, sin sumar sus alturas. Ranura superior dentro de frontal mínimo 4,2 mm (labio 1,6 + hueco 1 + fondo 1,6); carta arranca 2 mm sobre el suelo. Asa lateral independiente conserva impresión tumbada y anclajes inclinados. Altura con configuración actual 137,6 → 108 mm; capacidad descuenta mayor espesor frontal. 15 tests focalizados y check correctos; pendiente revisión del usuario/impresión. Ver [detalle](docs/plans/shelf-storage.md). Sin versión/commit/push.

- 2026-10-26 rediseño modular: colas de milano longitudinales macho arriba/derecha y hembra abajo/izquierda (vistas desde delante), entrada trasera y extremo frontal ciego. Usuario elige primer ensayo sin seguro trasero: hembra aún puede deslizar hacia delante para desmontar. Frontal con carta identificativa por ranura superior, tirador independiente coloreable y montaje lateral impreso; sin pestaña de retención lateral aún. Vista de impresión y exports shell/drawer/handle comparten orientación/Z=0. Pendiente revisión, laminado y prueba física. Ver [rediseño y límites](docs/plans/shelf-storage.md). Sin versión/commit/push.

- 2026-10-26 imprimibilidad del apilado: sustituido resto de pared de 0,4 mm por mínimo de 1,2 mm a ambos lados y sobre el alojamiento; llaves de 2 mm, bandas locales superiores/inferiores de mínimo 4,8 mm. Panel central conserva espesor pedido; exterior crece sin reducir cartas. Margen efectivo y vano del tirador visibles. 16 tests focalizados correctos; pendiente usuario/laminado/impresión. Regla de revisión mecánica + fabricación resumida en AGENTS. Ver [detalle](docs/plans/shelf-storage.md). Sin versión/commit/push.

- 2026-10-26 tirador/freno: tirador a todo el ancho con cartelas alineadas con laterales; apilado con tres llaves por lado de 2,4 mm y alojamientos cerrados que frenan desplazamiento longitudinal. Liberación levantando; no fija la pila a la estantería. 15 tests y check correctos; pendiente validación del usuario e impresión. Ver [diseño mecánico](docs/plans/shelf-storage.md). Sin versión/commit/push.

- 2026-10-26 revisión mecánica de estantería: tirador bajo con cartelas, frontal mínimo 3 mm, laterales altos delante y descendentes; fondo plano sobre dos pistas con rampas; llaves superiores y alojamientos inferiores de apilado sobre laterales. Añadidas previews de corte/apilado. Aumenta altura exterior y descuenta frontal reforzado de capacidad. Pendiente revisión del usuario, laminado y prueba de carga/deslizamiento. Ver [sección mecánica](docs/plans/shelf-storage.md). Sin versión/commit/push.

- 2026-10-26 estantería: vista principal con módulos fuera de Layer, primer `Card drawer` (carcasa/cajón/tirador), editor de contenido/dimensiones/fabricación, capacidad estimada, extracción ilustrativa y exports separados STL/3MF. Usa visor compartido; pendiente validación del usuario. Sin encajes de apilado, topes, separadores sujetos ni particiones todavía. Ver [alcance y pruebas](docs/plans/shelf-storage.md).

- 2026-10-26: prototipo aislado en `codex/shelf-storage`, servidor en `http://localhost:5176/` (5175 conserva main). Selector de tipo al crear desde la cabecera, nombre/tipo persistidos, JSON compatible con insertos antiguos y espacio experimental de estantería sin capas ni exports imprimibles. 43 tests focalizados y check correctos; creación/recarga/vuelta a inserto revisadas en navegador. Pendiente validación del usuario y módulos. Suite general: tres regresiones de volumen también reproducidas en main; dos timeouts al ejecutar en paralelo. Ver [plan y etapas](docs/plans/shelf-storage.md). Sin versión/commit/push.

## Proyecto

- Workspace: `/Users/raul/projects/insertforge`
- Rama actual: `main`
- App visible: `InsertForge`
- Atribucion visible: `based on Counter Slayer by Dave Snider`
- Version visible actual: `1.2.34`

## Desarrollo local

- Servidor de desarrollo esperado: `http://localhost:5175/`
- Comando habitual:

```bash
pnpm install
pnpm dev
```

- Verificacion rapida:

```bash
pnpm run check
```

- Regla nueva para iteraciones:
  - cada fix o nueva funcionalidad debe intentar anadir o actualizar tests en la misma iteracion para cubrir la regresion o el flujo nuevo
  - empezar por tests pequenos y de alto valor antes que por cobertura amplia
  - no subir version en cada prueba local; agrupar version y changelog al preparar el bloque decidido para commit/push
  - revisar y actualizar el changelog en cada bloque de cambios publicable; ahora mismo va retrasado desde abril

## Nota de ramas

- Rama estable actual: `main`
- Prototipo separado de `Game Mat Tube`: `codex/game-mat-tube`

## Estado funcional actual

- v1.2.34 (2026-10-25): usuario autoriza commit del bloque de consistencia de interfaz: categorías comunes, ayuda contextual, anchos/etiquetas/cantidades, scroll del editor y Empty Box hueca por defecto. Check/build, trece pruebas de interfaz y dos de defaults/persistencia verificados. Sin cambios de cálculos geométricos. Push no solicitado. Propuestas adicionales siguen pendientes en la [revisión y matriz de criterios](docs/plans/interface-review.md).

- v1.2.33 (2026-10-25): usuario autoriza commit del bloque de interfaz Beta, cartas/fundas y counters de 16 mm. Check/build y pruebas de geometría, migración, inventario e interfaz verificados; validación manual/impresa pendiente. Push no solicitado. [Cartas y compatibilidad](docs/plans/project-card-sleeves.md), [interfaz](docs/plans/interface-beta.md).

- Counters predeterminados Square/Hex/Circle/Triangle de 16 mm reales en proyecto vacío y de ejemplo. Se conservan medidas guardadas/importadas.

- 2026-10-24: usuario decide continuar con New · Beta como principal; Skeleton no aporta mejora suficiente. Retirados piloto/dependencias; Classic disponible y preferencia explícita respetada. Prioridad desktop; móvil solo usable. [Evaluación histórica](docs/plans/ui-library-evaluation.md).


- New · Beta conserva el mismo visor, cámara y reparto 75/25, con tema azul grisáceo, secciones plegables y cantidades compartidas.

- v1.2.32: usuario acepta y autoriza commit del bloque de inventario. Mejora de legibilidad y alineación, ayudas adaptativas, controles superiores fijos y cabecera sticky. Dados con selector único y tamaño snapshot editable; cartas con medidas custom visibles y resúmenes de formato/fundas; cantidades con −/+; Tokens y Tiles separados sin reclasificar grupos antiguos. Tests de inventario, medidas custom, ayudas y scroll verificados durante la iteración. Push no solicitado.

- v1.2.31 (2026-10-23): usuario acepta y autoriza commit/push de Explode inicial al 100%, con tapas apartadas. Slider sigue editable; separación entre capas conserva su default independiente. Check sin errores ni avisos.

- v1.2.30: usuario acepta mejoras de Dice Tray y autoriza commit/push (2026-10-22). Espaciado mínimo entre bordes (default 1 mm X/Y), reparto sobrante por fila, dimensiones exteriores mínimas, margen interior 1,5 mm y checkbox de notch. Incluye redondeo opcional de Miniature Tray y explode por fases. 116 tests focalizados pasan. Validación física pendiente; extender dimensiones mínimas al resto de piezas sigue pendiente de diseño común. Ver [plan](docs/plans/dice-tray.md).

La app ya no es solo un generador de `counter trays`. Ahora soporta:

- `Box`
- `Empty box`
- `Layered Box`
- `Board`
- `Loose tray`
- multiples tipos de trays dentro de `Layered Box`

## Funcionalidades implementadas

### Base

- Fix del bug original donde la edicion de una `Counter Tray` aplicaba cambios a la tray incorrecta.

### Branding

- Renombrado visible de la app a `InsertForge`
- atribucion al proyecto original en la cabecera

### Layered Box

- nuevo tipo `Layered Box`
- layers internas
- secciones internas por layer
- render de caja real con shell y lid
- shell y export alineados para generar el cuerpo con `bodyHeight`
- posicion visual de la tapa en explode alineada con `Box`
- contenido interno visible
- panel de edicion alineado visualmente con `Box`
- slider `Explode` alineado con el comportamiento de `Box`
- creacion alineada con `Add box`, incluyendo menu de tipo inicial
- si una `Layered Box` ya tiene `customWidth/customDepth`, la primera seccion nueva en una layer vacia intenta nacer ajustada al interior disponible para no forzar un resize inmediato
- `Edit layout` disponible tambien dentro de layers internas de `Layered Box`
- layout manual persistente por internal layer
- validacion de bounds/solapes al guardar layouts internos
- si una seccion nueva no cabe con sus defaults dentro de una `Layered Box` fija, se anade igualmente con feedback para poder editarla o borrarla
- `Counter Tray` interna usa el `counter shape` mas pequeno por defecto cuando nace en una `Layered Box` fija
- `Counter Tray` interna permite cambios que mejoran un estado invalido aunque todavia no quepa del todo

### Tipos soportados dentro de Layered Box

- `counter`
- `cardWell`
- `cardDraw`
- `cardDivider`
- `cup`
- `playerBoard`

### Player Board

- categoria propia en `Dimensions`
- selector filtrado de shapes
- soporte dentro de `Layered Box`

### Filler y reliefs

- pieza de relleno por internal layer
- opcion `Fill empty space solid`
- opcion `Generate relief cutouts`
- reliefs corregidos para aparecer solo donde corresponde

### Adapt to gap

#### Layered Box

- boton `Adapt to gap`
- comportamiento distinto segun contenido:
  - vacia o solo `Cup Trays`: puede crecer y encoger
  - con contenido fijo: solo crecer
- redimensionado de `Cup Trays` internas cuando aplica
- calcula huecos libres reales de la layer para elegir el espacio util
- corrige deteccion del hueco cuando la caja actual ya invade otro elemento de la layer
- feedback al usuario cuando no existe un hueco valido o el contenido no puede encogerse

#### Box

- boton `Adapt to gap`
- mismo criterio funcional que `Layered Box`
- soporte para `Empty box`
- soporte para cajas con solo `Cup Trays`
- calcula huecos libres reales de la layer para elegir el espacio util
- corrige deteccion del hueco cuando la caja actual ya invade otro elemento de la layer
- feedback al usuario cuando no existe un hueco valido o el contenido no puede encogerse

### Box

- soporte para crear `Empty box`
- `Empty box` hueca real cuando `Fill empty space solid` esta desactivado
- fix de `Add box` para crear correctamente el tipo seleccionado
- fix de preview incorrecta de `Empty box`

### Miniature Rack

- nuevo tipo `Miniature Rack` disponible en `Add loose tray`
- solo `loose tray` por ahora
- editor dedicado con parametros de rack y lista manual de `slots`
- soporte de export y render 3D
- fix de persistencia tras recarga para no degradarse a `Counter Tray`
- preview de bases de miniatura dentro del rail
- preview apilada para mostrar cuantas bases caben por rail
- tolerancias de `Base Width` y `Base Height` editables
- defaults recalibrados para impresion
- `Side Walls` triangulares
- `Slot Spacing Left` y `Slot Spacing Right` por defecto a `6mm`
- fix para no generar paredes laterales internas al anadir multiples slots

### Layer / Layout

- `Edit layout` recuperado en layers normales
- soporte de `Board` en `Edit layout`
- soporte de `Layered Box` en `Edit layout` de layer normal
- render de `Layered Box` en `Edit layout` alineado con la vista normal para distinguir multiples cajas
- posicion y rotacion de `Board` guardadas correctamente
- `Board` puede actuar como soporte visual para `Box`, `Loose tray` y `Layered Box` en vistas de layer
- `Board` puede apilarse sobre otros `Board` dentro de la misma layer siguiendo el orden actual de la lista
- `Edit layout` eleva items soportados por `Board` y valida solapes en 3D, no solo en X/Y
- `autoHeight` de `Box` y `Loose tray` ya tiene en cuenta la altura del `Board` o pila de `Board` sobre la que apoyan
- fix de seleccion en `Edit layout` para que la caja seleccionable de `Box` rote alineada con la geometria visible
- navegacion entre `layers` reutiliza la geometria cacheada una vez generada y ya no relanza `Generating Geometry...` en cada cambio de layer si no ha cambiado la geometria real

### Community projects

- `Load community project` sigue siendo un flujo estatico basado en `static/projects/manifest.json`
- ahora muestra `nombre + autor`
- pide confirmacion antes de reemplazar el proyecto local del navegador
- maneja mejor errores de carga de `manifest` y JSON de proyecto
- el `manifest` ya admite metadata adicional (`game`, `tags`, `description`) aunque la UI todavia no la explota

### Emboss

- clamp comun de profundidad de emboss para paredes finas
- aplicado a multiples trays con emboss

### Lid Text

- nuevo `Text mode` en tapas de `Box` y `Layered Box`: `Emboss` / `Inlay`
- `Inlay` genera cavidad mas pieza de texto separada
- render del inserto visible en vista seleccionada, vista de proyecto y vistas de layer/layout
- export `3MF` con tapa + texto inlay agrupados para multicolor
- espaciado global de letras ajustado en `vectorTextWithAccents`

## Commits recientes relevantes

- `28ce348` Improve community project loading UX
- `573701b` Support stacking boards in layers
- `fb808b2` Add stackable board layer support
- `7f93d2f` Add triangular rack side walls and spacing defaults
- `3d7cfd9` Fill miniature rack preview with stacked bases
- `9d68c0c` Refine miniature rack tolerances and preview
- `d2b6305` Remove inner side walls from miniature rack
- `05a9bad` Add initial miniature rack tray support
- `65de715` Match layered box rendering to box assembly
- `9a87bdf` Align box and layered box panels and explode
- `c5cc405` Align layered box creation with box menu
- `ea42979` Render layered box contents in layer view
- `29ba214` Align layered box shell rendering with boxes
- `6efb1ba` Refine layered box gap adaptation rules
- `8d2e34f` Fix layered box filler relief placement
- `26d96e7` Add missing layered box section actions
- `8460a20` Expand layered box section support and rebrand app
- `98ff7a5` Clamp tray emboss depth for thin walls
- `d5f9c0b` Support hollow empty boxes
- `e452f95` Add board support to layer layout editing
- `e077aba` Add layered box print options
- `74d2365` Show layered box fused layers in box view
- `3006f73` Add layered box editing flow and fused layer rendering
- `51374a3` Fix counter tray edits applying to wrong tray

## Ficheros importantes

- App principal:
  - `/Users/raul/projects/insertforge/src/routes/+page.svelte`
- Store principal:
  - `/Users/raul/projects/insertforge/src/lib/stores/project.svelte.ts`
- Modelo de layer:
  - `/Users/raul/projects/insertforge/src/lib/models/layer.ts`
- Worker de geometria:
  - `/Users/raul/projects/insertforge/src/lib/workers/geometry.worker.ts`
- Panel de edicion general:
  - `/Users/raul/projects/insertforge/src/lib/components/EditorPanel.svelte`
- Panel de box:
  - `/Users/raul/projects/insertforge/src/lib/components/BoxesPanel.svelte`
- Render principal 3D:
  - `/Users/raul/projects/insertforge/src/lib/components/TrayScene.svelte`
- Modelo de miniature rack:
  - `/Users/raul/projects/insertforge/src/lib/models/miniatureRack.ts`
- Editor de miniature rack:
  - `/Users/raul/projects/insertforge/src/lib/components/panels/MiniatureRackTrayEditor.svelte`
- Render de contenido de layer:
  - `/Users/raul/projects/insertforge/src/lib/components/three/LayerContent.svelte`
- Editor visual de layout de layer:
  - `/Users/raul/projects/insertforge/src/lib/components/three/LayerLayoutEditorScene.svelte`
- Overlay de layout de layer:
  - `/Users/raul/projects/insertforge/src/lib/components/LayerLayoutEditorOverlay.svelte`
- Manifest de community projects:
  - `/Users/raul/projects/insertforge/static/projects/manifest.json`

## Cosas a vigilar

- A veces Vite/HMR deja estados visuales raros. Antes de diagnosticar algo raro, conviene recargar fuerte o reiniciar `pnpm dev`.
- `issues-next-iterations.md` es un fichero de trabajo del usuario y no debe meterse en commits salvo que el usuario lo pida.
- `Card Separator` (`cardDivider`) puede dar aviso de `non-manifold edges` en Bambu Studio al importar el STL, pero la impresion real ha salido bien y por ahora se considera un issue no bloqueante.

## Testing

- Estado actual:
  - existe una base minima de `Playwright`, pero la cobertura real de regresiones es todavia muy baja
  - faltan tests unitarios/integracion para `models` y `stores`
- Criterio operativo:
  - cada bug arreglado deberia dejar al menos un test nuevo o ajustado que falle sin el fix
  - cada feature nueva deberia dejar al menos un test del comportamiento principal y, si aplica, un test del edge case mas fragil
- Prioridades iniciales:
  - `src/lib/models/layer.ts`
  - `src/lib/stores/project.svelte.ts`
  - flujos criticos de `Layered Box` en `Playwright`
- Primeros casos a cubrir:
  - seleccion correcta entre `layeredBox`, `layeredBoxLayer` y `layeredBoxSection`
  - visibilidad correcta de `Edit layout`
  - guardado/reset de layout manual por internal layer
  - render correcto de una sola `section` cuando esa `section` es la seleccion activa

## Pendientes razonables

- v1.2.30: validar físicamente redondeo/apilado de Miniature Tray (radio limitado para conservar 0,6 mm alrededor de encajes) y cabida/extracción de Dice Tray. Explode extraíble eleva primero (30%) y luego aparta; deslizantes mantienen plano de guías.

- v1.2.29 Dice Tray: usuario autoriza commit/push del bloque (2026-10-22). Dados mixtos con snapshots de proyecto/inventario, cunas con plano superior común y apoyos ajustados por exposición porcentual, rebajes, radio exterior, modo caja, tapas extraíble/deslizante y texto grabado/inlay/relieve. Preview de dados y etiquetas de contenido por tipo/alcance. Mantener pendiente validación física de extracción, ajuste de tapa, texto y apilado. Ver [detalle](docs/plans/dice-tray.md).

- v1.2.28 catálogo de dados: commit `dc55600`; incluido en el push autorizado de este bloque.

- v1.2.27 rendimiento: usuario acepta el bloque y autoriza commit/push (2026-10-22). Proyecto por defecto 13,4 → 4,9 s, mediana de tres pasadas. Fondos grabados a 24 segmentos (error <0,006 mm), métricas del worker ampliadas; texto de tapa/Card Storage intacto. 209 tests, check y prueba visual correctos; validación impresa pendiente. Ver [mediciones y alcance](docs/plans/geometry-performance.md).

- v1.2.26 Miniature Rack: usuario valida y autoriza commit/push (2026-10-22). `Add slot` hereda medidas, cantidad, ángulo y separaciones del último slot, con etiqueta/ID propios; evita colisión de IDs tras borrar slots intermedios. 10 tests y check correctos.

- v1.2.25 redondeo exterior: commit `246b578`, usuario autoriza push (2026-10-22). 197 tests y check correctos; validación impresa pendiente. Ver [detalle](docs/plans/outer-corner-finish.md).

- 2026-10-22 Card Storage: añadido radio exterior común para cuerpo/tapa en `Print settings`, 3 mm solicitado en piezas nuevas; limitado a pared sin tapa y al margen exterior del cierre con tapa (1,2 mm con defaults). Proyectos antiguos conservan 0. Pruebas de geometría/persistencia y editor local; pendiente validación visual/impresa del usuario. Sin versión/commit/push. Ver [detalle](docs/plans/outer-corner-finish.md).

- 2026-10-22 acabado exterior: opción de radio 3 mm en nuevas Counter/Player Board, Cup, Card Draw, Card Divider y Tile Tray; 0/ausente conserva piezas anteriores. Radio efectivo limitado y visible; sin modificar huecos. Pendiente validación visual/impresa del usuario; sin versión/commit/push. Ver [alcance y pruebas](docs/plans/outer-corner-finish.md).

- v1.2.24 Card Well: usuario valida el bloque y autoriza commit (2026-10-22). Mínimos exteriores, cotas, giro de vista individual, canales de extracción, esquinas redondeadas y nombres/etiquetas de pilas. Validación física pendiente; sin push autorizado. Ver [detalle y pruebas](docs/plans/card-well-refinements.md).

- v1.2.23 inventario: usuario confirma buen funcionamiento y autoriza commit (2026-10-21). Incluye tabla editable, asignación parcial desde piezas, snapshots de medidas, persistencia, creación manual y tokens Top/Edge-loaded. Sin push autorizado. Ver [diseño y alcance](docs/plans/project-inventory.md).

- v1.2.21 publicada en `main`, commit `1bd2f8d`. Card Divider: usuario acepta la mejora y autoriza commit/push v1.2.22 (2026-10-21); caso 4 mazos etiquetados 3,38 s → 0,71 s. Validación impresa pendiente. Ver [mediciones](docs/plans/geometry-performance.md).

- Revisar rendimiento del resto de piezas, prioridad **Card Dividers**: usuario informa lentitud en varias piezas y confirma mejora muy notable en Miniature Tray (2026-10-21). Ver [plan de revisión](docs/plans/geometry-performance.md). Investigación autorizada tras publicar v1.2.21.

- 2026-10-21 rendimiento: caché de 8 layouts y última geometría; preview sin unión extra; cuerpo/tapa preparados en worker, toggle sin reconstrucción. Grabado local por socket y agujeros en suelo antes de unir. Medición orientativa 20 minis grabadas: 19,5 s → 7,6 s al localizar taladros; 12 minis+preview duplicada: 4,3 → 2,2 s con caché. Test de equivalencia del grabado. Pendiente prueba del usuario en equipo antiguo; primera generación sigue costando. Usuario indica resto de cambios funciona bien por ahora.

- Packing 10 Walker + 1 Runner: búsqueda conjunta de ancho/fondo (hasta 64 pares por orientación) evita tiras largas de búsqueda por eje. Regresión reproduce screenshot 119,2 × 192 y acepta ≤119,2 ×155,6 mm con 11 bases/etiquetas. Pendiente validación visual del usuario.

- Placas ajustan ancho al texto real + 1 mm por lado, hasta el máximo permitido por socket/separación. Profundidad conserva unión al socket. Pendiente validación del usuario.

- Placas de etiquetas ensanchadas hasta 1 mm por lado, limitadas por separación transversal/4 y borde interior; sin crecer bandeja ni texto. Recupera margen normal para `Miniature` en peana 26 mm con defaults. Pendiente validación del usuario.

- Etiquetas: default `Mini` para activar sin error en peana 26 mm. `Miniature` cabe con margen lateral reducido (mínimo max(0,25 mm, nozzle/2)), sin reducir altura/trazo ni ampliar placa. Aviso específico; pendiente validación impresa del margen reducido.

- 2026-10-20: usuario confirma robustez impresa de pared/suelo de 1,5 mm; establecidos como defaults de Miniature Tray. Peana 26 mm y postes 8 mm ya confirmados en app. Se conservan espesores guardados.

- Corrección defaults: el rack de raíles también tenía su propio valor 32 mm; unificado a 26 mm y cubierta creación real de ambos accesos en tests del store. Pendiente validación del usuario.

- Defaults locales: proyecto nuevo/reset 250 × 250 mm, altura sin cambios; Miniature Tray nueva con peana 26 mm y postes 8 mm. No modifica medidas guardadas. Pendiente validación del usuario.

- Preview sizes: cotas añadidas a vista individual de trays (con tapa en posición ensamblada aunque esté apartada/oculta) y activadas en vista de todas las capas. Pendiente validación del usuario.

- Compactación por modelos: prueba giros individuales de 90° y compara área exterior con la opción sin giros; solapa/placa/texto y envolvente siguen el giro. Mantiene fill y tamaño fijo completo. Corrige medidas giradas devueltas por rectangle-packer en helper común. Heurística, sin garantía de óptimo global; pendiente validación del usuario.

- Reparto horizontal de slots por fila sobre el ancho existente, respetando envolventes y separaciones mínimas; sin aumentar bandeja. Si un packing irregular impide expandir una fila sin colisiones se conserva su posición. Pendiente validación visual del usuario.

- Preview de tapa de Miniature Tray: checkbox `Preview lid` y slider `Explode` en vista individual; oculta/aparta tapa sin cambiar export. Implementado localmente, pendiente validación del usuario.

- Ajuste de impresión 2026-10-20: usuario informa inserción/extracción ajustada. Nuevos defaults de socket: holgura diametral total 1,4 mm (antes 1) y solapa 1,4 mm (antes 1,6). Se conservan parámetros guardados. Pendiente muestra física, sin versión/commit/push.
- 2026-10-20: usuario confirma impresión de bandeja con etiquetas bastante bien. Detectado límite de espaciado X/Y de 40 mm; ampliado localmente a 600 mm (coherente con tamaño máximo de rack), conservando defecto 6 mm y validación de cabida. Miniaturas con grandes voladizos deben usar envolvente completa por modelo; offsets asimétricos aún pendientes. Sin versión/commit/push; revisión del nuevo espaciado pendiente.
- v1.2.20: usuario acepta y autoriza commit/push de modos/color en tapa de miniaturas, con controles compartidos con etiquetas. 3MF solo tapa con cuerpo+texto agrupados comprobado. Relieve incluido en altura total y orientación de impresión adaptada; afecta superficie plana de apoyo. Prueba impresa de tapa con texto prevista el 2026-10-20; mantener Experimental y pendiente validación física. Ver [detalle](docs/plans/miniature-socket-rack.md).
- v1.2.19: usuario autoriza commit/push del bloque de etiquetas y compactación (2026-10-19) para pruebas impresas el 2026-10-20. Mantener Experimental: comprobar lectura, texto multicolor/relieve, entrada/extracción de peanas, apilado y tapa. Punto de retorno anterior a etiquetas: `f7c84b7`. Ver [seguimiento](docs/plans/miniature-socket-rack.md).

- Plan de [generación automática de insertos desde componentes](docs/plans/automatic-insert-design.md): empezar con un juego pequeño solo de cartas; ampliar a varias capas y kits de jugador/personaje. Próximo paso: elegir juego y recoger medidas interiores de caja, mazos y contenido restante. Plan guardado; implementación pendiente.

- v1.2.16: sentido del slider de tapa y sincronizacion del texto predeterminado al renombrar Card Storage validados por el usuario en la app (2026-10-08).

- v1.2.15: preview y slider Explode de Card Storage aceptados por el usuario para commit/push (2026-10-07). Migracion a tipo de Box aun pendiente de decidir.


- v1.2.13: enlace de atribucion actualizado a `https://counterslayer.com`; pendiente validacion del usuario desde la app.

- Texto, v1.2.12: usuario confirma que funciona tambien desde la app (2026-10-06), tras validar el separador con Arachne y Classic. Correccion del export 3MF validada; mantener vertices compartidos y un cuerpo de texto por pieza. Impresion fisica pendiente; ver [investigacion y evidencia](docs/plans/card-storage-text-slicer-investigation.md).

- validar fisicamente [Card Storage](docs/plans/card-storage.md): texto, cierre y carga real. v1.2.12 corrige la conectividad del 3MF y conserva el trazo redondeado de 1,2 mm y el inserto de 0,4 mm. Antes de modificar la geometria del texto, leer el [registro de investigacion](docs/plans/card-storage-text-slicer-investigation.md).
- seguir afinando tolerancias reales de impresion de `Miniature Rack`
- seguir puliendo geometria del rail/labio de `Miniature Rack`
- mejoras de gestion de proyecto:
  - anadir `Project name`
  - usar `Project name` como base de nombre al exportar, en vez del item seleccionado en la vista
  - separar acciones de reset:
    - `Reset to empty project`
    - `Reset to default sample project`
- mejorar opciones de export:
  - exponer en UI export individual de `STL` para pieza seleccionada / `Box` / `Lid`
  - valorar soporte de export individual de `3MF`, no solo export global del proyecto
- decidir si `Miniature Rack` debe vivir tambien dentro de `Box` o `Layered Box`
- valorar labels / emboss para `Miniature Rack`
- revisar si `Layered Box` debe dejar de usar proxies en `Edit layout`
- seguir puliendo consistencia visual y de UX entre `Box` y `Layered Box`
- explorar una fuente/vector de texto de mayor calidad si se quiere mejorar de verdad la suavidad de curvas
- trabajar el `README` publico con creditos y cambios introducidos en el fork
- revisar por separado la generacion de geometria fuera de la layer activa; la navegacion por layers ya usa cache, pero el alcance de generacion/render por capa sigue siendo mejorable
- si `Board` sobre `Board` se queda corto, valorar UI explicita para reordenar boards en Z en vez de depender del orden actual de la lista
- si `Load community project` crece, valorar galeria enriquecida con preview, metadata visible y backup/restore antes de reemplazar el proyecto local
