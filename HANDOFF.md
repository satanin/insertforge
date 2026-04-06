# InsertForge Handoff

## Proyecto

- Workspace: `/Users/raul/projects/counterslayer`
- Rama actual: `codex/fix-counter-tray-selection`
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

#### Box

- boton `Adapt to gap`
- mismo criterio funcional que `Layered Box`
- soporte para `Empty box`
- soporte para cajas con solo `Cup Trays`

### Box

- soporte para crear `Empty box`
- `Empty box` hueca real cuando `Fill empty space solid` esta desactivado
- fix de `Add box` para crear correctamente el tipo seleccionado
- fix de preview incorrecta de `Empty box`

### Layer / Layout

- `Edit layout` recuperado en layers normales
- soporte de `Board` en `Edit layout`
- soporte de `Layered Box` en `Edit layout` de layer normal
- posicion y rotacion de `Board` guardadas correctamente

### Emboss

- clamp comun de profundidad de emboss para paredes finas
- aplicado a multiples trays con emboss

## Commits recientes relevantes

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
- Render de contenido de layer:
  - `/Users/raul/projects/counterslayer/src/lib/components/three/LayerContent.svelte`
- Editor visual de layout de layer:
  - `/Users/raul/projects/counterslayer/src/lib/components/three/LayerLayoutEditorScene.svelte`

## Cosas a vigilar

- A veces Vite/HMR deja estados visuales raros. Antes de diagnosticar algo raro, conviene recargar fuerte o reiniciar `pnpm dev`.
- `issues-next-iterations.md` es un fichero de trabajo del usuario y no debe meterse en commits salvo que el usuario lo pida.

## Pendientes razonables

- optimizar render de `Layered Box` cuando esta seleccionada para no generar de mas
- revisar si `Layered Box` debe dejar de usar proxies en `Edit layout`
- seguir puliendo consistencia visual y de UX entre `Box` y `Layered Box`
- trabajar el `README` publico con creditos y cambios introducidos en el fork

