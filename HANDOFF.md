# InsertForge Handoff

Este documento es un indice operativo corto. Los planes largos y decisiones extensas van en `docs/plans/`.

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

## Documentos relacionados

- Guia estable para agentes y colaboracion: `/Users/raul/projects/counterslayer/AGENTS.md`
- Plan de integracion de `Game Mat Tube`: `/Users/raul/projects/counterslayer/docs/plans/game-mat-tube-integration.md`
- Handoff especifico de `Game Mat Tube`: `/Users/raul/projects/counterslayer/docs/plans/game-mat-tube-handoff.md`

## Estado funcional actual

La app ya no es solo un generador de `counter trays`. Ahora soporta:

- `Box`
- `Empty box`
- `Layered Box`
- `Board`
- `Loose tray`
- `Miniature Rack`
- multiples tipos de trays dentro de `Layered Box`

## Resumen de estado

- La app fue rebrandada a `InsertForge` con atribucion visible al proyecto original.
- `Layered Box` ya esta integrado con layers internas, secciones por layer y flujo de edicion alineado con `Box`.
- `Empty box`, `Board` y `Miniature Rack` ya estan soportados.
- `Miniature Rack` sigue siendo solo `loose tray`.
- `Adapt to gap`, render 3D, `Edit layout` y clamp de `emboss` ya estan implementados.
- El bug original de edicion sobre la `Counter Tray` incorrecta ya esta corregido.

## Commits recientes relevantes

- `d480e3c` Add slot labels to miniature racks
- `4080bcd` Add emboss support for miniature racks
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
- No meter en commits documentos de trabajo del usuario salvo que el usuario lo pida.

## Pendientes razonables

- seguir puliendo geometria del rail/labio de `Miniature Rack`
- decidir si `Miniature Rack` debe vivir tambien dentro de `Box` o `Layered Box`
- revisar si `Layered Box` debe dejar de usar proxies en `Edit layout`
- seguir puliendo consistencia visual y de UX entre `Box` y `Layered Box`
- trabajar el `README` publico con creditos y cambios introducidos en el fork

## Nota sobre ramas

- `codex/insertforge` debe quedar como rama estable para continuar desde otros equipos.
- El trabajo experimental de `Game Mat Tube` se separa en `codex/game-mat-tube`.
