# AGENTS.md

## Project

- Nombre visible: `InsertForge`
- Origen: fork de `Counter Slayer`
- Proposito: aplicacion Svelte + JSCAD para disenar piezas imprimibles relacionadas con juegos de mesa
- Workspace: `/Users/raul/projects/counterslayer`

## Core workflow rules

- Leer primero `HANDOFF.md` al retomar una sesion.
- Usar `rg` para busquedas rapidas.
- Usar `apply_patch` para cambios manuales en archivos.
- No hacer commit sin confirmacion del usuario.
- No marcar un problema como resuelto hasta que el usuario confirme que funciona.
- No actualizar `HANDOFF.md` como cerrado si el cambio no esta validado.
- Preferir iteraciones pequenas y verificables.
- Ejecutar `pnpm run check` al final de una iteracion tecnica salvo que haya una razon clara para no hacerlo.
- No revertir cambios del usuario sin permiso explicito.
- Mantener `HANDOFF.md` corto y enlazar documentos largos desde ahi.

## Documentation conventions

- `HANDOFF.md` es el indice/TODO operativo del repo.
- `docs/plans/` contiene planes largos, integraciones y notas de diseno.
- `README.md` describe el producto para humanos.
- Si una decision es estable y cambia como debe trabajar Codex en este repo, debe resumirse tambien en `AGENTS.md`.

## Architecture overview

- `src/lib/stores/project.svelte.ts`
  - estado principal del proyecto y seleccion
- `src/lib/types/project.ts`
  - tipos del dominio
- `src/lib/models/*`
  - logica geometrica y helpers por tipo
- `src/lib/workers/geometry.worker.ts`
  - generacion en background y export STL/3MF
- `src/routes/+page.svelte`
  - composicion principal de la app
- `Layer`
  - planificacion interna del contenedor del juego
- `Board`
  - objeto visual de planning
- `Loose tray`
  - objeto exportable colocado directamente en una layer
- `Miniature Rack`
  - `loose tray` por ahora

## Current product constraints

- `Miniature Rack` sigue siendo `loose tray` por ahora.
- `Layered Box` debe seguir alineandose funcional y visualmente con `Box`.
- Los nuevos objetos externos no deben forzarse dentro de `Layer` si no encajan semanticamente.
- `HANDOFF.md` debe actuar como lista de trabajo, no como documento largo de diseno.

## How to resume work

1. Leer `AGENTS.md`.
2. Leer `HANDOFF.md`.
3. Abrir cualquier documento enlazado en `docs/plans/` si el trabajo lo requiere.
4. Continuar solo desde trabajo validado o claramente marcado como pendiente.
