# AGENTS.md

## Project

- Nombre visible: `InsertForge`
- Origen: fork de `Counter Slayer`
- Proposito: aplicacion Svelte + JSCAD para disenar piezas imprimibles relacionadas con juegos de mesa
- Workspace: `/Users/raul/projects/insertforge`

## Core workflow rules

- Leer primero `HANDOFF.md` al retomar una sesion.
- Usar `rg` para busquedas rapidas.
- Usar `apply_patch` para cambios manuales en archivos.
- No hacer commit sin confirmacion del usuario, salvo que la tarea pida explicitamente preparar ramas/commits.
- No marcar un problema como resuelto hasta que el usuario confirme que funciona.
- No actualizar `HANDOFF.md` como cerrado si el cambio no esta validado.
- Preferir iteraciones pequenas y verificables.
- Durante pruebas e iteraciones locales no subir version por cada cambio. Agrupar version y changelog cuando las decisiones esten tomadas y se prepare un bloque para commit/push; no hacer commit/push sin autorizacion.
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

## Current product constraints

- `Card Well`: los mínimos exteriores nunca reducen huecos/holguras de cartas. Hendiduras de extracción pasantes y redondeo deben respetar esos huecos; mantener caras de apilado planas. El giro del layout es de presentación y no cambia los ejes de parámetros/export.

- El inventario del juego vive a nivel de `Project`, independiente de `Layer`. Las piezas referencian grupos y cantidades; duplicar piezas no debe duplicar asignaciones ni existencias.
- Aplicar contenido del inventario es explicito y usa snapshots de medidas; editar el inventario no debe redimensionar silenciosamente las piezas existentes.

- `Miniature Rack` sigue siendo `loose tray` por ahora.
- `Card Storage` es `loose tray` con piezas dependientes (separadores/tapa); su altura maxima incluye todo el conjunto y no debe crecer por `autoHeight`.
- `Layered Box` debe seguir alineandose funcional y visualmente con `Box`.
- Los nuevos objetos externos no deben forzarse dentro de `Layer` si no encajan semanticamente.
- `HANDOFF.md` debe actuar como lista de trabajo, no como documento largo de diseno.
- Los exports 3MF de JSCAD deben pasar por `group3mf`, incluso sin grupos: comparte vertices exactamente coincidentes por malla para evitar trazos perdidos en Bambu Studio. Mantener un cuerpo de texto por pieza; no sustituir la prueba real de laminado por un chequeo manifold.

## Branch notes

- `codex/insertforge` es la rama estable actual.
- El prototipo de `Game Mat Tube` vive separado en `codex/game-mat-tube`.
