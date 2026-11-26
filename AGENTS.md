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

- Sistema visual compartido en `src/routes/design-system.css`: claro/oscuro y densidades balanced14px/36px y compact13px/32px; Density es preferencia de navegador, fuera del proyecto. Conservar Classic y canvas/cámara/reparto al cambiar apariencia. Usar tokens/primitivas compartidos, no nuevas escalas locales. Base rem sobre raíz histórica14px. Ver `docs/design/ui-guidelines.md`.

- Consistencia UI (criterios del usuario2026-11-26): inputs/selects con fondo y dimensiones comunes y ancho completo de su celda; campos aislados al100%. Botones de panel al100% si únicos, dos en columnas50/50 menos gap, misma altura; ajustar texto hasta mínimo definido y luego separar en filas, sin recorte ni desbordamiento. Export parts recompone nombre/metadatos/medidas sin partir números/unidades. Ayuda de acciones sobre el propio botón por hover/foco y acceso táctil, sin `?` lateral que descuadre; ayudas de campos no reducen ancho. No introducir variantes visuales sin razón funcional. Ver `docs/design/ui-guidelines.md`; valores de densidad/tipografía aún en revisión.

- Compatibilidad de shell: toda modificación debe conservar el encaje con las shells impresas anteriores del sistema, salvo decisión explícita del usuario de romper compatibilidad. Verificar paso, machos, alojamientos, topes y encaje en ambos sentidos. Conservar las revisiones incompatibles como interfaces distintas.

- Estantería: proteger por defecto en UI los parámetros que alteran la retícula o el encaje (incluido contenido/etiqueta mientras el resolver derive de ellos la envolvente); mostrarlos como información y editar sólo tras desbloqueo explícito de prototipo. Longitud, nombre, color y área de impresión siguen accesibles. Nuevos cajones heredan una copia de la configuración del seleccionado o primer cajón; no migrar piezas existentes silenciosamente.

- Estantería: asa desmontable como una U invertida continua alojada en asiento central, enrasada con la altura del cajón y dentro de sus laterales intactos; tirador compacto en L. Desmontaje hacia arriba y retirada antes de cambiar la carta identificativa. Labios interiores de captura del cajón con mínimo 2 mm de holgura nominal, sin invadir el contenido ni sustituir los apoyos inferiores. Conservar orientación de fabricación compartida con export.
- La etiqueta frontal de estantería reserva una funda Premium independientemente de la funda del contenido: incluir envolvente y holgura de inserción, mostrar medidas efectivas y conservar material sólido suficiente a ambos lados de la ranura y bajo el apoyo de la U.
- El montaje del asa no debe cortar la unión superior entre frontal y laterales del cajón: conservar el camino de carga continuo y adaptar la pieza desmontable alrededor de esas paredes, manteniendo continuo también su puente superior.
- Estantería compacta: las caras con alojamientos hembra (suelo/izquierda) conservan el mínimo de respaldo del milano; techo/derecha/trasera usan el espesor solicitado. No recuperar espacio reduciendo huecos de cartas/fundas. Los cambios de paso X/Z invalidan compatibilidad de retícula con shells impresas/marcos anteriores aunque el perfil del milano se conserve; mantener snapshots de marcos sin redimensionarlos silenciosamente.
- Ensayo autorizado 2026-10-28: permitir respaldo de socket mínimo 1 mm mediante parámetro explícito (fallback histórico1,2), con suelo/laterales3,6 y techo3,2. Retención opcional del asa por clip impreso integrado al respaldo, separada del camino principal de carga de la U; comprobar por separado holgura rígida e interferencia elástica. Pendiente validación física, no congelar aún interfaz.
- Sistema de estantería: todas las variantes de una unidad comparten envolvente/paso e interfaz de conexión, con o sin ventana/carta; contenido, asa y opciones interiores se adaptan a la unidad, no redimensionan su retícula. Módulos mayores ocupan múltiplos enteros del paso y alinean conectores por celda. Las medidas actuales siguen en pruebas: no declarar estándar congelado sin validación del usuario. Una vez fijado, cualquier cambio incompatible exige revisión explícita de interfaz y conservar la anterior para reproducir piezas existentes.

- Ensayo autorizado 2026-10-29 tras prueba C+F pegada: suelo cajón2 mm sin carriles inferiores, laterales2, shell3,6; aumento explícito de altura shell0,3 respecto a suelo1,7. Paso de referencia80,2×109,55. Conservar espacio útil/holguras; marcos sólo se sincronizan explícitamente. La validación de tirón manual corresponde a la muestra pegada, no a retención sin adhesivo ni carga/flexión del conjunto.

- Ensayo autorizado 2026-10-29: techo elevado a3,6 mm, igual al grosor nominal de suelo/laterales; respaldo socket1 mm. Referencia Kallax335×335 mm editable basada en capturas del usuario y prueba física. Asa ajustada validada por usuario, retirada difícil aceptada; carga completa y techo nuevo pendientes. Actualizar marcos sólo explícitamente al cambiar el paso.

- Estantería: priorizar ensamblajes completamente impresos; herrajes solo si no hay una solución impresa adecuada. Mirando desde la entrada, las conexiones de carcasa tienen macho arriba/derecha y hembra abajo/izquierda, dejando el lateral izquierdo sin salientes para una pared. Separar posición de uso y orientación de impresión por pieza; preview de fabricación y exports deben compartir las mismas transformaciones.

- Al diseñar piezas imprimibles, revisar conjuntamente mecánica y fabricación antes de proponer geometría: caminos de carga, material residual alrededor de encajes, espesores imprimibles, orientación/capas, puentes, voladizos y soportes. No reducir paredes a restos de una sola línea por restar holguras. Mostrar refuerzos/espesores efectivos que cambien la envolvente; conservar el espacio útil. Sin perfil de impresora, declarar los márgenes de diseño y dejar pendiente laminado e impresión; un test geométrico no valida resistencia ni imprimibilidad.

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

- Estantería integrada en `main` por autorización del usuario el2026-11-24; `codex/shelf-storage` conserva el desarrollo de esta línea. `Project.projectType` distingue `insert` (predeterminado/archivos antiguos) y `shelf-storage`. Se elige al crear, no convierte el proyecto abierto. Los módulos de estantería no pertenecen a `Layer`; separar conjunto ensamblado y piezas de fabricación. Ver `docs/plans/shelf-storage.md`.

- `main` es la rama de integración y despliegue. El despliegue observado el2026-11-24 es Cloudflare Pages (check de GitHub); los workflows Fly.io del repo no prueban que Fly sea el destino activo.
- El prototipo de `Game Mat Tube` vive separado en `codex/game-mat-tube`.
