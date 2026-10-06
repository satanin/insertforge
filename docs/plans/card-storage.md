# Card Storage

Estado: disponible en v1.2.11; pendiente de validacion del usuario e impresion real.

El fallo de texto en el laminador y todos los intentos descartados estan documentados en [card-storage-text-slicer-investigation.md](card-storage-text-slicer-investigation.md). Es lectura obligatoria antes de iniciar otra iteracion sobre la geometria o exportacion del texto.

## Notas de la primera implementacion

- Inclinacion automatica hasta 60 grados desde la vertical; un limite inferior incompatible muestra error y bloquea exportaciones.
- Selector Closure: sin tapa o tapa deslizante con cuerpo, guias y cierre de rampas reutilizados de Box mediante un adaptador efimero, sin cambiar el tipo de objeto. En Card Storage desliza en la direccion de almacenamiento. Texto opcional grabado o inlay multicolor; ajustes conservados al quitar la tapa. Incluye control de tapa cerrada en preview.
- Desde v1.2.3, Card Storage fuerza la apertura en la direccion de almacenamiento aunque esta sea menor que el ancho. Los separadores orientan la cara rotulada hacia esa entrada mediante giro sobre su eje vertical, manteniendo texto legible y la semantica izquierda/derecha de las pestanas.
- Desde v1.2.4, cada separador admite un color propio con muestra y hexadecimal visibles. El color general actua como valor heredado para proyectos anteriores y como valor inicial de separadores nuevos; preview y 3MF conservan los colores individuales.
- Desde v1.2.5, el cierre deslizable exige al menos la pared de 3 mm usada por Box y aumenta ese minimo cuando crece la holgura. Los proyectos antiguos con tapa y pared de 2 mm se actualizan al cargar para mantener al menos 0,6 mm de material continuo tras la ranura.
- Desde v1.2.6, el texto multicolor de los separadores tiene 0,6 mm de profundidad: tres capas con perfil de 0,2 mm frente a las dos capas anteriores. Se mantiene el mismo tamaño y grosor visual para aislar esta variable en la prueba de laminado.
- La solucion de trazos redondeados de v1.2.7 no elimino las aristas abiertas al sustraer letras curvas. Desde v1.2.8, Card Storage usa una fuente solida 5x7 formada por rectangulos simples para las etiquetas y el texto de tapa. La fuente original se conserva en Box y Layered Box; la nueva tambien representa tildes, dieresis y eñe.
- La prueba de laminado de v1.2.8 no mejoro y la fuente 5x7 se retiro. Desde v1.2.9 se recupera el aspecto lineal redondeado, construyendo cada trazo como capsulas 2D unidas antes de extruir. El ancho imprimible sube de aproximadamente 1,2 a 2 mm en separadores y tapa de Card Storage; Box y Layered Box mantienen su ancho anterior.
- La prueba de v1.2.9 mejoro los trazos abiertos, pero Bambu Studio seguia encontrando entre 309 y 443 aristas abiertas en las placas por la sustraccion 3D de las cavidades. Desde v1.2.10, el perfil de placa y los huecos se resuelven completamente en 2D y se extruyen una sola vez. El texto atraviesa el grosor completo y comparte su borde con la placa para unir las islas interiores de letras cerradas.
- En v1.2.11 se retiraron por peticion del usuario todos los experimentos de texto de v1.2.6-v1.2.10. Los separadores vuelven al trazo redondeado de 1,2 mm y 0,4 mm de profundidad, la tapa reutiliza sin excepciones el texto de Box y cada pieza vuelve a exportar un unico cuerpo de texto. El fallo de letras curvas en el laminador queda pendiente de un enfoque distinto.
- Nuevas piezas: paredes, fondo y tapa de 3 mm editables; piezas guardadas conservan grosores. La placa de tapa y su holgura se pasan explicitamente al generador compartido y al calculo de altura. Los valores heredados de Box/Layered Box mantienen su geometria de tapa.
- Texto inlay en una cara, con contraste en preview y agrupacion real de cuerpos en 3MF.
- Exportacion individual en el editor y piezas separadas en las exportaciones globales. La colocacion de los separadores en preview es ilustrativa.
- Pendiente de comprobar en laminador e impresion real la estabilidad del apoyo, la rigidez de las placas, la legibilidad y las tolerancias de la tapa.
- Verificacion historica v1.2.10: las comprobaciones automaticas y de malla no se tradujeron en un resultado correcto al laminar; se revirtio en v1.2.11. v1.2.12 comparte vertices en el export 3MF, conservando la geometria original. El usuario confirma el separador de prueba correcto al laminar con Arachne; impresion fisica pendiente. Ver [investigacion](card-storage-text-slicer-investigation.md).

## Objetivo y alcance

Nuevo tipo `cardStorage`, disponible inicialmente solo como Loose Tray. Una bandeja con un hueco continuo y separadores extraibles impresos por separado permite reorganizar grupos sin definir cantidades por grupo ni reimprimir la bandeja. Card Divider conserva su comportamiento actual.

Decisiones confirmadas:

- Un unico tamaño de carta por bandeja, usando las dimensiones y el grosor del catalogo del proyecto (incluidas fundas).
- Separadores en forma de placas sueltas, sin ranuras ni posiciones obligatorias.
- Dimensionado por numero total de cartas o por largo exterior fijo en la direccion de almacenamiento.
- Paredes que protegen las cartas. Sin limite de altura ni tapa, llegan hasta las cartas y las pestañas sobresalen.
- Altura maxima opcional para TODO el conjunto: suelo, cartas, separadores, pestañas y tapa si existe.
- Inclinacion automatica para cumplir la altura maxima, consumiendo profundidad adicional. Apoyo interior inclinado en un extremo, sin compartimentos intermedios.
- Pestaña estrecha izquierda/centro/derecha o franja de ancho completo; altura adicional configurable sobre las cartas.
- Separadores sin texto o con texto imprimible en otro color.
- Tapa deslizable opcional basada en el mecanismo de Box.
- Exportacion de bandeja, tapa y separadores por separado, incluyendo un separador individual.

Interpretacion para la primera iteracion: inclinacion automatica, sin editor manual de angulo. Mantener orientacion de carta vertical/apaisada como parametro independiente. Detalles propuestos de UX y valores por defecto se verificaran durante la implementacion.

## Interfaz y datos

Editor con tres bloques:

1. Almacenaje: tamaño de carta, orientacion, modo de dimensionado, numero de cartas o largo exterior, altura maxima y tapa opcional.
2. Separadores: lista con identificador estable, texto opcional y tipo/posicion de pestaña; añadir, duplicar, eliminar y reordenar. Nunca pedir numero de cartas por separador. Grosor de placa y altura de pestaña comunes inicialmente.
3. Ajustes: paredes, suelo, holguras y ajustes necesarios de tapa. Mostrar dimensiones exteriores totales, capacidad estimada, inclinacion resultante y errores de encaje.

Propuesta de modelo: `CardStorageTray` y parametros dedicados, con modo de dimensionado explicito, referencia a un unico `cardSizeId`, orientacion, limite de altura, parametros de bandeja, lista de separadores y tapa opcional. Persistir entradas; derivar capacidad, dimensiones y angulo desde un resolvedor comun. Las piezas dependientes pertenecen a la bandeja y no son elementos independientes de Layer.

Duplicacion debe renovar IDs de separadores. Renombrar o reordenar no debe perder la seleccion de una pieza. Integrar guardado, carga, importacion, valores por defecto de carta y referencias a tamaños sin modificar proyectos antiguos.

## Geometria y dimensionado

Un resolvedor compartido debe servir al editor, layout, preview, worker y exportacion. Debe devolver dimensiones, altura de paredes, envolvente completa, capacidad, angulo, apoyo y estado de validez.

- Por cantidad: alojar N cartas mas todos los separadores, sus textos y holguras; añadir paredes, apoyo y requisitos de tapa al calcular el largo exterior. Añadir separadores puede aumentar el largo.
- Por largo exterior: respetar exactamente la medida indicada y calcular el mayor numero entero de cartas que cabe tras descontar piezas, holguras y apoyo. Añadir separadores reduce capacidad; no alargar silenciosamente.
- Sin limite de altura: cartas rectas. Con limite: elegir la menor inclinacion que permita alojar el conjunto completo. Si tambien hay largo fijo, resolver ambas restricciones conjuntamente.
- Calcular la envolvente de cartas y separadores con su grosor y transformacion reales. No copiar sin comprobar la aproximacion de huecos del Card Divider: aqui existe una unica pila continua y separadores libres.
- La altura debe considerar la pestaña mas alta y la holgura bajo la tapa, incluido el recorrido de sus guias. Las pestañas deben quedar visibles sobre la carta en la orientacion elegida.
- Con tapa y sin limite, elevar las paredes lo necesario para proteger pestañas y permitir cerrar. Sin tapa, distinguir altura de paredes de altura total ocupada.
- El apoyo de extremo debe proporcionar una superficie real de reposo al angulo calculado. Descontar su volumen util y evitar colisiones con cartas y separadores.
- Usar la envolvente completa para encaje en layer y layout; no permitir que autoHeight altere un limite exterior explicito.
- Cuando no exista solucion, conservar las entradas, mostrar un error concreto y bloquear exportacion de esa configuracion. Nunca volver silenciosamente a Auto ni sobrepasar las medidas.

Los separadores sueltos no fijan fisicamente el angulo ni la posicion de una pila incompleta. La preview mostrara una colocacion ilustrativa; no representa grupos con cantidades asignadas. Validar estabilidad y holguras con impresion real antes de darlo por validado.

## Texto, tapa y exportacion

Propuesta de texto: reutilizar el enfoque inlay de las tapas para generar placa y texto como cuerpos separados, alineados y sin volumen solapado, agrupados por separador en 3MF. Permitir asignacion de color en laminador. Por defecto texto en una cara para impresion plana; no se incluye texto a doble cara en este alcance.

Mantener cuerpo de placa imprimible y una profundidad de texto compatible con su grosor. Ajustar texto al area disponible y avisar si no puede resultar legible, sin recortarlo silenciosamente.

Reutilizar o extraer los helpers necesarios de tapa deslizable de Box, evitando introducir una Box ficticia en los datos. Verificar paredes minimas, guias, holgura y trayectoria de apertura con las pestañas, especialmente al inclinar cartas.

- Exportar todo, solo bandeja, solo tapa, todos los separadores o uno seleccionado.
- STL como piezas independientes; no conserva asignacion multicolor. Para un separador monocromo completo, unir placa y texto en el STL correspondiente.
- 3MF con cuerpos de color agrupados por pieza. Conservar la alineacion de texto y placa.
- Orientar separadores planos sobre la cama para impresion, independientemente de su pose en la preview. Distribuir piezas sin solapamientos al exportar el conjunto.
- Nombres de archivos estables y unicos aunque existan etiquetas repetidas o vacias. Incluir las piezas en exportaciones globales existentes sin duplicados.

## Iteraciones de implementacion

1. **Modelo y calculos:** tipos, defaults, resolvedor y pruebas de capacidad/altura/inclinacion. Verificar las restricciones combinadas antes de conectar UI.
2. **Bandeja y separadores:** geometria con apoyo de extremo, editor Loose Tray, persistencia, preview de cartas y pestañas, seleccion y layout.
3. **Texto y exportacion por piezas:** inlay multicolor, seleccion individual, STL y 3MF, orientacion de impresion y nombres.
4. **Tapa opcional:** integrar mecanismo deslizante, ajustar dimensionado, preview y exportacion; comprobar interferencias.
5. **Validacion integrada:** flujo completo, regresiones, importacion en laminador y prueba fisica con confirmacion del usuario.

Cada iteracion debe dejar comprobaciones pequeñas de alto valor. Revisar version y changelog al publicar funcionalidad; este documento de plan no necesita bump de version.

## Criterios de aceptacion

- 100 cartas con separadores caben segun dimensiones configuradas; añadir separadores aumenta largo en modo cantidad.
- Largo fijo permanece invariable al añadir separadores y disminuye la capacidad estimada.
- Cambiar tamaño, orientacion, grosor, pestañas o tapa recalcula todas las restricciones.
- Altura maxima incluye pestañas y tapa; con inclinacion suficiente respeta limites y sin solucion informa del conflicto.
- Bandeja vacia de separadores funciona; placas sin texto, textos largos, caracteres acentuados y etiquetas duplicadas tienen comportamiento definido.
- Guardar/recargar y duplicar conservan ajustes y seleccion coherente; proyectos anteriores siguen cargando.
- Preview, dimensiones, layout y exportacion usan el mismo resultado geometrico.
- STL/3MF generan piezas cerradas validas sin unir separadores a la bandeja; 3MF conserva cuerpos multicolor por separador.
- La tapa abre y cierra sin interferencia con pestañas; paredes y apoyo protegen y sostienen las cartas en una prueba real.
- Ejecutar pruebas unitarias relevantes, un flujo de interfaz y `pnpm run check` en las iteraciones tecnicas. La validacion fisica y confirmacion del usuario quedan pendientes hasta que se realicen.

## Mapa tecnico inicial

- `src/lib/models/cardStorageTray.ts` (nuevo): calculos y geometria; aprovechar helpers de texto/emboss y revisar `lid.ts`.
- `src/lib/types/project.ts`, `src/lib/stores/project.svelte.ts`, `src/lib/utils/storage.ts`: tipo, acciones y persistencia.
- Editor dedicado y puntos de creacion/seleccion en NavigationMenu, TraysPanel y EditorPanel.
- `src/lib/models/box.ts` y `src/lib/models/layer.ts`: dispatch de dimensiones de Loose Tray y encaje, sin habilitar creacion dentro de Box.
- `src/lib/workers/geometry.worker.ts`, cache/fingerprint, escenas 3D y `src/routes/+page.svelte`: generacion, preview y piezas exportables.
- Utilidades de exportacion y pruebas existentes: ampliar para piezas dependientes y exportacion individual.

## Fuera del alcance inicial

Integracion como contenido de Box/Layered Box, mezcla de tamaños, ranuras, anclajes, varios canales, cantidades por grupo y control manual del angulo.
