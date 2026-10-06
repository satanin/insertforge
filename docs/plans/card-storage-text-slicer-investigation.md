# Card Storage: investigacion del texto defectuoso en el laminador

Validacion final del flujo de app (2026-10-06): tras probar la creacion y exportacion desde la app local, el usuario confirma «Todo funciona bien» y autoriza commit. El fallo de texto en el laminado se considera resuelto para el flujo validado. No se ha comunicado una prueba fisica de impresion.

Estado: correccion de conectividad integrada en v1.2.12 tras confirmacion del usuario de laminado correcto con Arachne (2026-10-05). Impresion fisica pendiente. Los experimentos geometricos anteriores se retiraron en v1.2.11.

Confirmacion adicional (2026-10-05): el usuario prueba tambien Classic y confirma que el texto del separador aparece perfectamente. Siguiente validacion manual: crear una caja desde cero en la app local, con otro texto, y probar su export. No requiere nuevos cambios de geometria ni version.

## Evidencia nueva: 2026-10-05, conectividad del 3MF

Se reprodujo el defecto con el motor CLI de Bambu Studio 2.6.1.55 instalado en Linux, usando separadores `KYORYU` recien generados con el codigo actual (pestaña completa y estrecha). Se compararon Classic y Arachne con boquilla de 0,4 mm, capas de 0,2 mm y los mismos parametros. Arachne por si solo no recupero la `O` ni todos los trazos.

Se encontro una diferencia concreta en el exportador: `@jscad/3mf-serializer` 2.1.17 escribe vertices independientes para cada triangulo. Una transformacion del XML que reutiliza el indice de los vertices con coordenadas **exactamente iguales dentro de cada malla** recupero las letras completas en los recorridos de ambos motores. No se modificaron posiciones, triangulos, orientacion de caras, fuente, profundidad, grosor ni agrupacion de materiales. Se verifico que cada esquina de cada triangulo conserva sus coordenadas originales.

Tambien se aislo la tapa del archivo local `kyoryu (1).3mf` (procedencia Counter Slayer pendiente de confirmacion del usuario). La misma transformacion elimino las discontinuidades observadas en su texto grabado al laminar con Classic. Esto aporta evidencia sobre un problema comun del formato exportado, independiente de la fuente y del modo multicolor.

Artefactos locales, ignorados por Git, en `mesh-analysis/text-2026-10-05/`:

- `comparacion-laminado.png`: recorridos del G-code, antes/despues, para ambas pestañas. Son graficos de trayectorias, no simulacion del resultado fisico.
- `comparacion-tapa.png`: primera capa de la tapa antes/despues.
- `insertforge-kyoryu-full-welded.3mf` y `insertforge-kyoryu-left-welded.3mf`: separadores actuales con un solo cuerpo de texto por pieza.
- `counterslayer-kyoryu-welded.3mf`: copia del archivo local completo, con vertices compartidos.
- Copias originales, `mesh-verification.json`, scripts y laminados usados como evidencia.

Validacion del usuario (2026-10-05): abrio el separador corregido, cambio el generador de paredes a Arachne y confirmo que se ve perfecto al laminar. Con esta confirmacion se integra en v1.2.12 la normalizacion de indices en los exports individuales y globales, tambien sin grupos multicolor. Las pruebas cubren conectividad de una malla cerrada, preservacion exacta de triangulos y materiales y etiquetas `KYORYU`, `MEGAN`, `GABRIEL` y `ÓGC`. El laminado de estas ultimas tres etiquetas no se ha validado visualmente con el usuario; la impresion fisica sigue pendiente. No es necesario repetir cambios de fuente, profundidad ni separar letras.

Para esta comparacion no se enviaron trabajos a la impresora ni se modificaron los perfiles guardados. Se usaron copias de proyectos; en los casos aislados se desactivo la torre de purga para analizar trayectorias. Los archivos finales `*-welded.3mf` contienen geometria, no un perfil de impresion recomendado.

Verificacion de la integracion: 10 pruebas de regresion/version pasan; `svelte-check` sin errores ni avisos. Los exports regenerados con el helper integrado coinciden exactamente en vertices, indices de triangulos y propiedades de objetos con los candidatos corregidos de pestaña completa y estrecha. `pnpm run check` se ejecuto con `--config.verify-deps-before-run=false` para evitar que pnpm intentara reinstalar dependencias y bloquearse en la configuracion preexistente de scripts de build.

Este documento registra los intentos realizados para corregir las letras incompletas o deformadas al laminar los separadores y la tapa de Card Storage. Su objetivo es impedir que una iteracion futura repita las mismas hipotesis sin nueva evidencia.

## Sintoma observado

- El modelo 3MF conserva el texto como cuerpo independiente y permite asignarle otro filamento.
- En la vista del modelo las etiquetas pueden parecer correctas, pero despues de laminar desaparecen fragmentos de algunas letras o aparecen recorridos irregulares dentro y alrededor de los glifos.
- El fallo se aprecia especialmente en letras curvas o cerradas como `O`, `G` y `C`, aunque tambien afecta a palabras completas.
- Casos usados durante las pruebas: `MEGAN`, `GABRIEL`, `KYORYU`, `ARD TIRANE`, `FJORDLAND` y etiquetas con acentos.
- El problema aparece en los textos inlay de los separadores y tambien en el texto `engraved` de la tapa de Card Storage. Por tanto, no es exclusivo del cambio de filamento ni de una profundidad concreta del inserto.
- Bambu Studio puede considerar la malla manifold y aun asi generar recorridos defectuosos. La validacion topologica de JSCAD tampoco predice por si sola el resultado del laminado.

## Punto de partida restaurado en v1.2.11

La implementacion actual vuelve al comportamiento anterior a v1.2.6:

- fuente vectorial lineal original de JSCAD, con soporte local para acentos;
- trazos redondeados generados con `path2`, `expand` y `extrudeLinear`;
- ancho de trazo de 1,2 mm para etiquetas de separadores;
- inserto de 0,4 mm, equivalente a dos capas con un perfil de 0,2 mm;
- un cuerpo de texto por separador o tapa en el 3MF;
- la tapa de Card Storage usa el mismo generador de texto que Box, sin parametros especiales de fuente o trazo.

Este estado no resuelve el defecto del laminador. Es solamente el ultimo punto estable antes de los experimentos fallidos y evita el coste adicional de cambios de filamento por letra.

## Pruebas realizadas y resultado

### 1. Aumentar la profundidad del texto: v1.2.6

Hipotesis: dos capas de texto eran insuficientes y el laminador perdia partes de los glifos por falta de profundidad.

Cambio probado:

- profundidad del inlay de separadores de 0,4 a 0,6 mm;
- tres capas con altura de capa de 0,2 mm;
- mismo tamaño, fuente y ancho visual para aislar la variable.

Resultado:

- no mejoro el laminado;
- quedo descartado que el problema se resolviera simplemente añadiendo una capa;
- el texto `engraved` de la tapa tambien mostro defectos, reforzando que la profundidad no era la causa principal.

No repetir: aumentar de nuevo la profundidad o el numero de capas sin haber cambiado la geometria de los glifos.

### 2. Reconstruir letras curvas como trazos redondeados simples: v1.2.7

Hipotesis: `expand` sobre un contorno vectorial complejo producia aristas abiertas o intersecciones problematicas en letras curvas.

Cambio probado:

- construir `O`, `G`, `C` y el resto del texto como trazos redondeados solapados;
- aplicar esa geometria tanto a separadores como a la tapa de Card Storage;
- probar los modos multicolor y grabado;
- mantener 0,6 mm de profundidad para no mezclar de nuevo la variable de capas.

Resultado:

- siguieron faltando fragmentos al laminar;
- el cambio no elimino las aristas o intersecciones que afectaban al resultado real.

No repetir: volver a implementar los glifos como una coleccion de segmentos redondeados solapados usando el mismo enfoque de JSCAD.

### 3. Sustituir la tipografia por una fuente solida 5x7: v1.2.8

Hipotesis: eliminar curvas y generar cada glifo solo con rectangulos simples evitaria los problemas de contorno.

Cambio probado:

- fuente geometrica 5x7 construida con bloques rectangulares;
- soporte para tildes, dieresis y eñe;
- uso en etiquetas de separadores y texto de tapa de Card Storage.

Resultado:

- no produjo ninguna mejora apreciable en el laminado;
- la estetica mecanica de la fuente tampoco era adecuada para el producto;
- se retiro inmediatamente en la siguiente iteracion.

No repetir: otra fuente matricial o de bloques simples como solucion aislada. Eliminar las curvas no soluciono el defecto.

### 4. Volver al aspecto original con capsulas manifold y trazo de 2 mm: v1.2.9

Hipotesis: la fuente original era aceptable visualmente, pero cada trazo necesitaba una forma cerrada y mas ancha para imprimirse bien.

Cambio probado:

- recuperacion del aspecto lineal redondeado;
- cada trazo convertido en una capsula 2D cerrada antes de extruir;
- ancho imprimible aumentado de aproximadamente 1,2 a 2 mm;
- profundidad mantenida en 0,6 mm;
- cavidad del separador con 0,3 mm de holgura;
- mismo tratamiento especial de 2 mm en la tapa de Card Storage, sin cambiar Box ni Layered Box.

Resultado:

- hubo una ligera mejora visual en algunos trazos abiertos;
- continuaron los fallos de letras curvas y cerradas;
- Bambu Studio seguia detectando cientos de aristas abiertas en las placas, entre 309 y 443 en las muestras revisadas;
- aumentar el ancho no resolvio el origen y alteraba innecesariamente el aspecto del texto.

No repetir: capsulas de 2 mm, la holgura de 0,3 mm ni un parametro especial de ancho para Card Storage usando la misma construccion.

### 5. Resolver placa y huecos en 2D y usar texto pasante: v1.2.10

Hipotesis: las aristas abiertas procedian de sustraer volumenes 3D de texto a una placa ya extruida.

Cambio probado:

- construir el contorno completo de la placa y los huecos de texto en 2D;
- hacer una unica extrusion despues de la resta 2D;
- extruir el texto a traves de todo el grosor del separador;
- compartir exactamente el borde entre placa e inserto;
- conservar las islas interiores de letras cerradas mediante la reconstruccion conjunta.

Resultado tecnico aparente:

- JSCAD validaba las mallas generadas;
- Bambu Studio llego a informar `manifold = yes` para placa y texto en `MEGAN`, `KYORYU` y `GABRIEL`;
- las pruebas de volumen indicaban que placa y texto reconstruian la placa completa sin un hueco material relevante.

Resultado real:

- las letras siguieron laminandose mal;
- atravesar por completo el separador no corrigio el defecto;
- quedo demostrado que `manifold = yes`, `geom3.validate()` y la igualdad aproximada de volumen no bastan como criterio de aceptacion.

No repetir: resta 2D seguida de una sola extrusion, inserto pasante con borde exacto compartido o considerar resuelto el problema solo porque la malla sea manifold.

### 6. Separar cada glifo como componente independiente del 3MF

Hipotesis: el laminador podia estar confundiendo los glifos desconectados dentro de un unico objeto de texto.

Cambio probado despues de v1.2.10:

- dividir la geometria de texto en componentes conectados;
- exportar cada letra como un objeto 3MF independiente;
- agrupar todos esos objetos con la placa correspondiente;
- validar individualmente cada componente.

Resultado:

- no mejoro el laminado;
- hizo mucho mas costosa la asignacion o sustitucion del filamento porque cada letra aparecia como una parte independiente;
- el experimento se retiro antes de cerrar v1.2.11.

No repetir: separar letras o componentes conectados en objetos 3MF individuales.

## Comprobaciones automaticas que pasaron y no demostraron que funcionara

Durante los experimentos llegaron a pasar estas comprobaciones:

- `geom3.validate()` en placa, texto y posteriormente cada glifo;
- volumen positivo para todos los cuerpos;
- interseccion casi nula entre placa e inserto;
- cota Z y profundidad esperadas;
- reconstruccion por volumen de placa mas texto frente a una placa sin etiqueta;
- agrupacion correcta de componentes dentro del 3MF;
- pruebas unitarias, `svelte-check` y el flujo E2E de exportacion.

Estas pruebas siguen siendo utiles para detectar regresiones estructurales, pero no validan los recorridos que genera el laminador. Ninguna iteracion futura debe presentar el problema como resuelto sin revisar la vista laminada real con las palabras problematicas.

## Conclusiones establecidas

- La profundidad de 0,4 frente a 0,6 mm no es la causa principal.
- El fallo no se limita al texto inlay multicolor; tambien se observo en texto grabado.
- El uso de curvas no explica por si solo el problema: la fuente rectangular 5x7 tambien fallo.
- Un trazo mas ancho puede mejorar algun segmento, pero no corrige los glifos defectuosos.
- Una malla marcada como manifold puede seguir produciendo recorridos incorrectos.
- Hacer que el texto atraviese toda la placa no ayuda.
- Dividir el texto por letras perjudica el flujo multicolor y tampoco ayuda.
- Las pruebas geometricas internas no sustituyen una prueba de laminado.

## Condiciones para una futura investigacion

Antes de cambiar otra vez la implementacion principal:

1. Crear un caso minimo con una placa y uno o dos glifos que reproduzcan el fallo, especialmente `O`, `G` o `C`.
2. Comparar el 3MF generado con un texto equivalente de la Box original que el usuario haya confirmado que lamina correctamente. Hay que comparar tanto malla como estructura interna del 3MF; compartir el mismo helper no demuestra que la exportacion sea equivalente.
3. Examinar el resultado laminado, no solo la vista de objetos ni el indicador manifold.
4. Probar cualquier enfoque nuevo primero en ese caso minimo y con una sola variable.
5. Mantener un unico cuerpo de texto por pieza para conservar un cambio de filamento sencillo.
6. No integrar ni declarar resuelto un cambio hasta que el usuario confirme que las letras completas aparecen correctamente en el laminador.

Un siguiente enfoque solo merece una iteracion si cambia de forma sustancial la fuente de geometria o el pipeline de exportacion. Por ejemplo, generar contornos limpios desde una fuente real y normalizar sus poligonos antes de extruir, o identificar una diferencia concreta entre la estructura 3MF de Box y Card Storage. No debe recombinar profundidad, capsulas, fuente 5x7, texto pasante o separacion por glifos, porque esas variantes ya se probaron.

## Referencias

- Plan general: [card-storage.md](card-storage.md)
- Historial de versiones: `src/lib/changelog/2026-09.md`, v1.2.6 a v1.2.11
- Generacion de separadores: `src/lib/models/cardStorageTray.ts`
- Generacion compartida de tapa y texto: `src/lib/models/lid.ts`
- Fuente vectorial y acentos: `src/lib/models/vectorTextWithAccents.ts`
- Exportacion individual: `src/lib/utils/exportCardStorage.ts`
- Exportacion global: `src/lib/workers/geometry.worker.ts`
