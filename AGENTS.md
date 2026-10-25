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

- Las explicaciones y tips se muestran bajo demanda mediante `HelpTip` (hover, foco, clic/táctil); evitar párrafos permanentes de ayuda. Colocar el botón junto al texto o título relacionado mediante `HelpRow`, aprovechando el ancho sin crear una fila exclusiva. En campos, situarlo junto a la etiqueta y conservar el ancho completo del input. Mantener visibles datos actuales, errores y advertencias de la configuración.

- `New · Beta` es la opción predeterminada; Classic sigue disponible y se respeta su preferencia guardada. Ambas comparten estado de proyecto, geometría y visor. El modo es una preferencia del navegador, fuera del JSON del proyecto. Cambiar el aspecto no debe remontar el canvas, cambiar cámara ni reducir su tamaño/reparto inicial (75/25 en desktop). La adopción de otra librería UI queda aplazada por decisión del usuario.

- `Card Well`: los mínimos exteriores nunca reducen huecos/holguras de cartas. Hendiduras de extracción pasantes y redondeo deben respetar esos huecos; mantener caras de apilado planas. El giro del layout es de presentación y no cambia los ejes de parámetros/export.

- El inventario del juego vive a nivel de `Project`, independiente de `Layer`. Las piezas referencian grupos y cantidades; duplicar piezas no debe duplicar asignaciones ni existencias.
- Aplicar contenido del inventario es explicito y usa snapshots de medidas; editar el inventario no debe redimensionar silenciosamente las piezas existentes.
- Los formatos de carta del proyecto no duplican variantes Premium. La funda se elige por pieza/pila; `Project.cardSleeveThicknesses` configura 0,3/0,5/0,8 mm por defecto. Geometría y exports deben recibir `getProjectCardSizes(project)` (proyección con grosores), sin guardar esa proyección en el catálogo. Las referencias `inventory-*` conservan su grosor snapshot; los grosores históricos personalizados usan una excepción explícita hasta elegir un preset.

- `Miniature Rack` sigue siendo `loose tray` por ahora.
- `Card Storage` es `loose tray` con piezas dependientes (separadores/tapa); su altura maxima incluye todo el conjunto y no debe crecer por `autoHeight`.
- `Layered Box` debe seguir alineandose funcional y visualmente con `Box`.
- En Box y Layered Box: Dimensions agrupa envolvente y ajuste al espacio; Manufacturing agrupa tolerancia, espesores y opciones estructurales; Lid agrupa texto/opciones propias de la tapa. Los campos numéricos usan celdas de igual ancho; no expandir un campo a dos columnas sin necesidad funcional.
- El mismo criterio se aplica a todos los editores imprimibles: Dimensions contiene medidas/límites de la pieza y autoHeight; Manufacturing contiene espesores, holguras, redondeos, extracción y retención. Medidas del contenido en Content; colocación/espaciado en Distribution; parámetros específicos de tapa en Lid. La revisión global sustituye la ubicación anterior de autoHeight de Card Well en Manufacturing. No añadir controles de tamaño que el modelo no soporte ni autoHeight a Card Storage.
- Los nuevos objetos externos no deben forzarse dentro de `Layer` si no encajan semanticamente.
- `HANDOFF.md` debe actuar como lista de trabajo, no como documento largo de diseno.
- Los exports 3MF de JSCAD deben pasar por `group3mf`, incluso sin grupos: comparte vertices exactamente coincidentes por malla para evitar trazos perdidos en Bambu Studio. Mantener un cuerpo de texto por pieza; no sustituir la prueba real de laminado por un chequeo manifold.

## Branch notes

- `codex/insertforge` es la rama estable actual.
- El prototipo de `Game Mat Tube` vive separado en `codex/game-mat-tube`.
