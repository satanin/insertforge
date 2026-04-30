# InsertForge Handoff

## Proyecto

- Workspace: `/Users/raul/projects/insertforge`
- Rama actual: `main`
- App visible: `InsertForge`
- Atribucion visible: `based on Counter Slayer by Dave Snider`
- Version visible actual: `1.1.23`

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
  - para mejoras visuales/UX pequenas, agrupar el bump de version por conjunto coherente de cambios, no necesariamente por cada ajuste o micro-fix dentro de la misma iteracion

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
