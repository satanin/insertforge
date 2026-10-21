# InsertForge Handoff

## Proyecto

- Workspace: `/Users/raul/projects/insertforge`
- Rama actual: `main`
- App visible: `InsertForge`
- Atribucion visible: `based on Counter Slayer by Dave Snider`
- Version visible actual: `1.2.23`

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
