# Integrar `parametric_map_storage` como `Accessory` top-level, no como `Layer`

## Resumen

La mejor integración para el archivo `parametric_gamemat_storage.scad` es **crear una nueva familia de objetos top-level en InsertForge**, por ejemplo `Accessories`, y dentro de ella un primer tipo `Game Mat Tube`.

**No lo integraría como `Layer`, `Board`, `Loose tray`, `Box` ni `Layered Box`.**

Motivos:

- `Layer` en InsertForge es una abstracción de **apilado vertical dentro de una caja de juego**. Según el propio proyecto, el layout de layer “no tiene impacto en la geometría STL”; aquí sí lo tiene.
- `Board` es solo visual y no exportable.
- `Loose tray` hoy encaja con objetos **1 geometría -> 1 STL**, mientras que el tubo genera **N piezas segmentadas + opcionalmente 1 o más labels**, y además necesita dos modos de preview:
  - `assembled`
  - `print_bed`
- El `.scad` no modela una “tray” ni un “insert interno”: modela un **contenedor externo/standalone multi-pieza**, con lógica propia de segmentación, roscas y layout de impresión.

La recomendación técnica completa es:

1. **Portar el modelo a JSCAD**, no intentar ejecutar OpenSCAD desde InsertForge.
2. Crear un nuevo dominio top-level: **`Accessory`**.
3. Implementar el primer tipo: **`GameMatTubeAccessory`**.
4. Darle:
   - preview `assembled`
   - preview `print_bed`
   - export STL multipieza
   - panel de parámetros propio
   - nombres de archivo por pieza estables

---

## Qué he analizado del `.scad`

El archivo [`/Users/raul/projects/parametric_map_storage/parametric_gamemat_storage.scad`](/Users/raul/projects/parametric_map_storage/parametric_gamemat_storage.scad) no es un sólido único. Tiene esta estructura funcional:

- Calcula `piece_count` automáticamente con `compute_piece_count(...)` para que cada pieza no supere `max_piece_height`.
- Tiene dos layouts nativos:
  - `layout_mode = "assembled"`
  - `layout_mode = "print_bed"`
- Genera piezas distintas:
  - `bottom_end_piece(...)`
  - `middle_piece(...)`
  - `top_end_piece(...)`
- Genera además una pieza separada de label:
  - `content_label_tag()`
- Tiene lógica no trivial de:
  - rosca macho/hembra
  - geometría de unión
  - refuerzos y slot de label
  - snap de la label
  - pattern exterior
- En `print_bed_layout()` distribuye todas las piezas sobre cama.
- En `assembled_layout()` monta el tubo completo visualmente.

Eso encaja mucho mejor con una entidad “assembly/standalone printable object” que con un tray de layer.

---

## Arquitectura recomendada

### 1. Nuevo dominio de proyecto: `Accessory`

Añadir un nuevo array top-level al proyecto:

- `project.accessories: Accessory[]`

Y una nueva selección top-level:

- `selectedAccessoryId?: string | null`

### 2. Nuevo discriminated union

En [`/Users/raul/projects/counterslayer/src/lib/types/project.ts`](/Users/raul/projects/counterslayer/src/lib/types/project.ts):

- `type Accessory = GameMatTubeAccessory`
- `interface BaseAccessory`
  - `id`
  - `name`
  - `color`
- `interface GameMatTubeAccessory extends BaseAccessory`
  - `type: 'gameMatTube'`
  - `params: GameMatTubeParams`
  - `previewMode?: 'assembled' | 'printBed'`

### 3. Nuevo modelo JSCAD nativo

Crear un módulo nuevo, por ejemplo:

- [`/Users/raul/projects/counterslayer/src/lib/models/gameMatTube.ts`](/Users/raul/projects/counterslayer/src/lib/models/gameMatTube.ts)

No reutilizar el `.scad` en runtime. InsertForge ya está montado sobre JSCAD + worker; meter OpenSCAD en medio complicaría:
- render
- export
- cache
- tipos
- 3MF/STL multipieza
- mantenimiento

La integración correcta es **port del modelo**, preservando la semántica del `.scad`.

---

## Forma de integrarlo en la UI

### Navegación

En [`/Users/raul/projects/counterslayer/src/lib/components/NavigationMenu.svelte`](/Users/raul/projects/counterslayer/src/lib/components/NavigationMenu.svelte):

Añadir una sección nueva entre `Project & dimensions` y `Bottom layer`, o justo debajo de `Project & dimensions`:

- `Accessories`
- `+ Add game mat tube`

Cada accessory se selecciona como ítem propio, no vive dentro de una layer.

### Panel lateral

En [`/Users/raul/projects/counterslayer/src/lib/components/EditorPanel.svelte`](/Users/raul/projects/counterslayer/src/lib/components/EditorPanel.svelte):

Añadir `selectionType: 'accessory'`.

Para `gameMatTube`, mostrar un panel propio:
- [`/Users/raul/projects/counterslayer/src/lib/components/panels/GameMatTubeEditor.svelte`](/Users/raul/projects/counterslayer/src/lib/components/panels/GameMatTubeEditor.svelte)

### Escena 3D

Cuando se selecciona un `Accessory`, la vista central no debe mostrar el contexto de layers/box planning, sino un preview dedicado del accessory.

Comportamiento recomendado:
- `previewMode = 'assembled'`:
  - mostrar el tubo ensamblado
- `previewMode = 'printBed'`:
  - mostrar las piezas colocadas como en el `.scad`

Esto debe ser paralelo al comportamiento actual de boxes/trays, no mezclado dentro de una layer.

---

## Parámetros exactos que sí integraría

Para la primera versión integraría solo los parámetros “de producto” que el `.scad` ya expone como principales y que tienen valor real en InsertForge.

### `GameMatTubeParams`

#### Tube
- `totalLengthMm`
- `innerDiameterMm`
- `wallThicknessMm`

#### Segmentation
- `maxPieceHeightMm`
- `minPieces`
- `equalizeVisibleHeights`

#### Thread
- `threadLengthMm`
- `threadClearanceMm`

#### Layout / Preview
- `bedSizeXMm`
- `bedSizeYMm`
- `previewMode: 'assembled' | 'printBed'`

#### Label
- `labelEnabled`
- `labelWidthMm`
- `labelLengthMm`
- `labelThicknessMm`
- `labelInsertClearanceMm`
- `labelSnapEnabled`

#### Pattern
- `surfacePattern`
- `patternDepthMm`
- `patternLanes`
- `patternAngle`
- `patternTwistGain`
- `patternLineWidth`

### Parámetros que dejaría fuera del primer panel

Estos sí existirían internamente con defaults compatibles con el `.scad`, pero **no los expondría inicialmente**:

- `label_rail_bite_mm`
- `label_snap_height_mm`
- `label_snap_length_mm`
- `label_snap_offset_mm`
- `label_snap_width_factor`
- `label_frame_side_bevel_mm`
- `label_frame_depth_mm`
- `label_insert_end_clearance_mm`
- `label_face_recess_mm`
- `thread_start_taper`
- `thread_pitch_mm`
- `thread_depth_mm`
- `male_thread_shortfall_mm`
- `thread_root_fill`
- `thread_min_wall`
- `thread_backend`
- `thread_tooth_angle`
- `thread_tooth_height_min`
- `thread_end_relief_h`
- `thread_end_relief_depth`
- `thread_union_overlap`
- `thread_shoulder_blend_h`
- `end_cap_thickness_mm`
- `end_base_bevel_mm`
- `connector_outer_margin`
- `connector_fit_bias`
- todos los parámetros debug

### Defaults

Usar como defaults los del preset:
- [`/Users/raul/projects/parametric_map_storage/tubo_parametrico_mapas.json`](/Users/raul/projects/parametric_map_storage/tubo_parametrico_mapas.json)

y, donde falten, los del `.scad`.

---

## APIs/Interfaces públicas a añadir

### En tipos de proyecto

En [`/Users/raul/projects/counterslayer/src/lib/types/project.ts`](/Users/raul/projects/counterslayer/src/lib/types/project.ts):

- `interface BaseAccessory`
- `interface GameMatTubeParams`
- `interface GameMatTubeAccessory`
- `type Accessory`
- `Project.accessories: Accessory[]`

### En store

En [`/Users/raul/projects/counterslayer/src/lib/stores/project.svelte.ts`](/Users/raul/projects/counterslayer/src/lib/stores/project.svelte.ts):

- `getSelectedAccessory()`
- `selectAccessory(id)`
- `addAccessory(type)`
- `deleteAccessory(id)`
- `updateAccessory(id, patch)`
- `updateAccessoryParams(id, patch)`

### En storage/migration

En [`/Users/raul/projects/counterslayer/src/lib/utils/storage.ts`](/Users/raul/projects/counterslayer/src/lib/utils/storage.ts):

- migración para `project.accessories`
- compatibilidad hacia atrás si no existe el campo

---

## Diseño del modelo geométrico

### Salida geométrica

El modelo no debe devolver solo una `Geom3`, sino una estructura multiparte.

Propuesta:

- `createGameMatTubeParts(params): GameMatTubePart[]`
- `createGameMatTubePreview(params, mode): Geom3`

### `GameMatTubePart`

- `id`
- `name`
- `kind: 'bottom' | 'middle' | 'top' | 'label'`
- `geometry: Geom3`
- `suggestedPrintPosition?: { x, y, rotation }`

### Preview

#### `assembled`
- unir visualmente las piezas segmentadas en orden axial
- no fusionarlas booleanamente si no hace falta; basta con mostrarlas en posición ensamblada

#### `printBed`
- usar la distribución de cama equivalente al `.scad`
- incluir labels si `labelEnabled`

---

## Exportación

### STL

El exportador actual de loose trays no sirve tal cual porque aquí no hay 1 objeto = 1 STL.

Hay que ampliar [`/Users/raul/projects/counterslayer/src/lib/workers/geometry.worker.ts`](/Users/raul/projects/counterslayer/src/lib/workers/geometry.worker.ts) para soportar accessories multipieza.

### Recomendación exacta

Añadir:
- caché de accessories renderizadas
- export por accessory seleccionado
- export global

#### Nombres de archivo
Para un accessory llamado `Map Tube 1`:

- `map-tube-1-bottom.stl`
- `map-tube-1-middle-1.stl`
- `map-tube-1-middle-2.stl`
- `map-tube-1-top.stl`
- `map-tube-1-label-1.stl`

### 3MF

Primera iteración:
- **fuera de scope**
- mantener soporte STL completo

Razón:
- InsertForge ya tiene 3MF, pero meter multiparte con layout de cama específico merece una segunda iteración para no mezclar demasiadas variables.

---

## Por qué no integrarlo como `Loose tray`

Se puede hacer, pero sería una mala base:

- semánticamente no es una tray
- aparece dentro de una `Layer`, y eso da a entender que forma parte del volumen interno del juego
- la edición de layers/rotación/layout no aporta valor
- el exportador actual de loose tray asume una geometría única
- la vista de layer normaliza alturas, concepto que aquí no aplica
- te obligaría a meter excepciones por todas partes:
  - preview
  - export
  - selection
  - filenames
  - UI
  - layout editor

Eso funcionaría como hack, pero te dejaría deuda técnica desde el día 1.

---

## Alcance exacto de la primera integración

### In scope
- Nueva sección top-level `Accessories`
- Tipo `Game Mat Tube`
- Editor de parámetros
- Preview `assembled`
- Preview `printBed`
- Export STL multipieza
- Persistencia en proyecto
- Defaults desde el preset actual
- Port geométrico JSCAD del tubo y label

### Out of scope
- Integrarlo dentro de `layers`
- 3MF del accessory
- Layout manual tipo drag/drop
- soporte genérico para ejecutar OpenSCAD arbitrario
- importar `.scad` dinámicamente
- exponer todos los parámetros “hidden” del `.scad` en UI
- meterlo dentro de `Box` o `Layered Box`

---

## Casos de prueba y aceptación

### Modelo / lógica
1. Con `totalLength=430`, `maxPieceHeight=240`, `minPieces=2`, el cálculo de `pieceCount` debe coincidir con la lógica del `.scad`.
2. Si `labelEnabled=false`, no debe generarse ninguna pieza label.
3. Si `surfacePattern=false`, el cuerpo debe renderizarse liso.
4. Si `equalizeVisibleHeights=true`, la segmentación visible debe respetarse como en el `.scad`.

### UI
1. Se puede crear un `Game Mat Tube` desde `Accessories`.
2. Al seleccionarlo, aparece panel específico y no panel de layer/tray.
3. Cambiar `previewMode` entre `assembled` y `printBed` cambia la escena.
4. Los parámetros persisten tras recargar.

### Export
1. `Export STLs` del accessory genera múltiples archivos.
2. Los nombres son estables y sin colisiones.
3. El número de archivos exportados coincide con `pieceCount` + labels.
4. `Export all STLs` incluye accessories además de boxes/trays existentes.

### Compatibilidad
1. Proyectos antiguos sin `accessories` siguen cargando.
2. El resto del flujo de `Layer`, `Box`, `Loose tray`, `Board`, `Layered Box` no cambia.

---

## Secuencia de implementación recomendada

1. Crear tipos `Accessory` y `GameMatTubeAccessory`.
2. Añadir `project.accessories` + selección + migración.
3. Añadir navegación y selección en UI.
4. Crear `gameMatTube.ts` con:
   - normalización de params
   - cálculo de segmentación
   - generación de piezas
   - preview assembled
   - preview print bed
5. Conectar escena/render cuando el seleccionado sea accessory.
6. Añadir `GameMatTubeEditor.svelte`.
7. Extender worker para cache y export STL multipieza.
8. Validar geométricamente contra el `.scad` con 2-3 presets.
9. Actualizar README y HANDOFF cuando esté validado.

---

## Suposiciones y defaults elegidos

- Se asume que quieres **integrarlo dentro de InsertForge**, no solo enlazar al repo externo.
- Se asume que la integración debe ser **nativa JSCAD**, no un wrapper de OpenSCAD.
- Se asume que el objetivo principal es:
  - diseñarlo
  - previsualizarlo
  - exportar STLs
- Se asume que, por ahora, el accessory es **standalone** y no vive dentro de una layer.
- Se asume que la primera versión debe priorizar:
  - estabilidad del modelo
  - export multipieza
  - coherencia de UX
  por encima de exponer absolutamente todos los knobs del `.scad`.

