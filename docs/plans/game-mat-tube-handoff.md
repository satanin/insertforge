# Game Mat Tube Handoff

## Estado

La integracion de `Game Mat Tube` existe como `Accessory` top-level, con editor propio, preview y export STL, pero la geometria no esta validada y no es una portabilidad fiel del OpenSCAD final.

## Rama prevista

- Rama de trabajo para retomarlo: `codex/game-mat-tube`
- Rama estable sin esta feature: `codex/insertforge`

## Archivos tocados por la feature

- `/Users/raul/projects/counterslayer/src/lib/models/gameMatTube.ts`
- `/Users/raul/projects/counterslayer/src/lib/components/panels/GameMatTubeEditor.svelte`
- `/Users/raul/projects/counterslayer/src/lib/components/NavigationMenu.svelte`
- `/Users/raul/projects/counterslayer/src/lib/components/EditorPanel.svelte`
- `/Users/raul/projects/counterslayer/src/lib/components/TrayScene.svelte`
- `/Users/raul/projects/counterslayer/src/lib/stores/project.svelte.ts`
- `/Users/raul/projects/counterslayer/src/lib/types/project.ts`
- `/Users/raul/projects/counterslayer/src/lib/utils/storage.ts`
- `/Users/raul/projects/counterslayer/src/routes/+page.svelte`
- `/Users/raul/projects/counterslayer/docs/plans/game-mat-tube-integration.md`

## Fuente de verdad geometrica

- OpenSCAD final: `/Users/raul/projects/parametric_map_storage/parametric_gamemat_storage.scad`

## Lo que si funciona

- Nuevo tipo top-level `Accessory`
- Persistencia de `Game Mat Tube` en proyecto
- Alta/seleccion/edicion desde UI
- Preview `assembled` y `printBed`
- Export STL multipieza
- Defaults principales alineados con el `.scad` final

## Lo que sigue mal o incompleto

- El bloque del hueco de etiqueta no reproduce de forma fiable el marco curvo completo del `.scad`
- La retencion/lip del label slot sigue sin quedar identica a la pieza impresa probada
- La rosca en JSCAD es una aproximacion; no equivale al resultado de `threads.scad`
- La hembra y el macho no estan validados visualmente ni mecanicamente
- El pattern exterior no esta validado contra el resultado del OpenSCAD final
- La etiqueta sigue siendo una aproximacion y no esta comprobada contra la pieza fisica

## Conclusiones tecnicas de esta iteracion

- Portar directamente desde OpenSCAD a JSCAD no ha sido tan directo como parecia.
- La parte mas delicada es la geometria que en OpenSCAD depende de `threads.scad` y de operaciones tipo `rotate_extrude`.
- Seguir parcheando la aproximacion actual probablemente cueste mas que rehacer la traduccion con una correspondencia mas literal por bloques.

## Siguiente plan recomendado

1. Rehacer `src/lib/models/gameMatTube.ts` tomando el `.scad` final como especificacion exacta por bloques.
2. Empezar por `external_thread_solid`, `internal_thread_cut`, `male_spigot`.
3. Portar despues el bloque completo de `tube_piece()` para la pieza superior con slot, snap pocket y frame curvo.
4. Replicar `pattern_grooves()` y su keepout del slot.
5. Portar al final `content_label_tag()`.
6. Validar visualmente cada paso y no dar por buena ninguna parte sin comparacion directa con el `.scad`.

## Verificacion disponible

- `pnpm run check` pasaba al cerrar la ultima iteracion tecnica, pero eso solo valida tipos y Svelte, no fidelidad geometrica.
