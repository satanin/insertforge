# InsertForge Handoff

## Proyecto

- Workspace: `/Users/raul/projects/counterslayer`
- Rama actual: `codex/insertforge`
- App visible: `InsertForge`
- Atribucion visible: `based on Counter Slayer by Dave Snider`

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

## Nota de ramas

- Rama estable actual: `codex/insertforge`
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
- contenido interno visible
- panel de edicion alineado visualmente con `Box`
- slider `Explode` alineado con el comportamiento de `Box`
- creacion alineada con `Add box`, incluyendo menu de tipo inicial

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

### Emboss

- clamp comun de profundidad de emboss para paredes finas
- aplicado a multiples trays con emboss

## Commits recientes relevantes

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
  - `/Users/raul/projects/counterslayer/src/routes/+page.svelte`
- Store principal:
  - `/Users/raul/projects/counterslayer/src/lib/stores/project.svelte.ts`
- Modelo de layer:
  - `/Users/raul/projects/counterslayer/src/lib/models/layer.ts`
- Panel de edicion general:
  - `/Users/raul/projects/counterslayer/src/lib/components/EditorPanel.svelte`
- Panel de box:
  - `/Users/raul/projects/counterslayer/src/lib/components/BoxesPanel.svelte`
- Render principal 3D:
  - `/Users/raul/projects/counterslayer/src/lib/components/TrayScene.svelte`
- Modelo de miniature rack:
  - `/Users/raul/projects/counterslayer/src/lib/models/miniatureRack.ts`
- Editor de miniature rack:
  - `/Users/raul/projects/counterslayer/src/lib/components/panels/MiniatureRackTrayEditor.svelte`
- Render de contenido de layer:
  - `/Users/raul/projects/counterslayer/src/lib/components/three/LayerContent.svelte`
- Editor visual de layout de layer:
  - `/Users/raul/projects/counterslayer/src/lib/components/three/LayerLayoutEditorScene.svelte`

## Cosas a vigilar

- A veces Vite/HMR deja estados visuales raros. Antes de diagnosticar algo raro, conviene recargar fuerte o reiniciar `pnpm dev`.
- `issues-next-iterations.md` es un fichero de trabajo del usuario y no debe meterse en commits salvo que el usuario lo pida.

## Pendientes razonables

- seguir afinando tolerancias reales de impresion de `Miniature Rack`
- seguir puliendo geometria del rail/labio de `Miniature Rack`
- decidir si `Miniature Rack` debe vivir tambien dentro de `Box` o `Layered Box`
- valorar labels / emboss para `Miniature Rack`
- revisar si `Layered Box` debe dejar de usar proxies en `Edit layout`
- seguir puliendo consistencia visual y de UX entre `Box` y `Layered Box`
- trabajar el `README` publico con creditos y cambios introducidos en el fork
