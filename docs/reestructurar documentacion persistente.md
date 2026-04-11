# Reestructurar la documentación persistente para Codex en InsertForge

## Resumen

Se va a establecer una estructura mínima pero estable para que Codex tenga contexto persistente y revisable en cada sesión, sin seguir cargando `HANDOFF.md` con diseño largo o historial excesivo.

La estructura elegida es:

- `AGENTS.md`
- `HANDOFF.md`
- `docs/plans/`

Y el reparto de responsabilidades será:

- `AGENTS.md`
  - reglas permanentes para Codex y para la colaboración en este repo
  - además incluirá decisiones de arquitectura de alto nivel
- `HANDOFF.md`
  - índice operativo / TODO corto
  - estado actual, pendientes, alertas y enlaces a documentos
  - no contendrá planes largos
- `docs/plans/`
  - planes detallados y documentos de diseño
  - primer documento: integración de `parametric_map_storage`

---

## Objetivo

Dejar un sistema documental que permita a Codex, y también a cualquier colaborador humano, responder bien a estas preguntas sin depender de la conversación previa:

- cómo se trabaja en este repo
- qué cosas no se deben tocar sin validación
- cómo está organizada la arquitectura
- qué decisiones ya están tomadas
- qué está pendiente
- dónde están los planes largos

---

## Estructura final a crear o modificar

### 1. Nuevo archivo: `AGENTS.md`

Ruta:
- [AGENTS.md](/Users/raul/projects/counterslayer/AGENTS.md)

### Propósito
Documento estable de referencia para Codex.

### Contenido exacto recomendado

#### Sección 1. Repo purpose
- `InsertForge` es un fork de `Counter Slayer`
- stack principal:
  - Svelte
  - JSCAD
  - geometry worker
- foco del producto:
  - insertos y accesorios imprimibles para juegos de mesa

#### Sección 2. Working rules
Reglas estables de colaboración ya consolidadas en este repo:
- leer primero `HANDOFF.md` al retomar trabajo
- no hacer commit sin confirmación del usuario
- no marcar una solución como cerrada sin validación real
- no actualizar `HANDOFF.md` automáticamente como “resuelto” si el cambio no está confirmado
- usar `apply_patch` para editar archivos manualmente
- preferir `rg` para búsquedas
- no revertir cambios del usuario
- mantener cambios pequeños y validados
- ejecutar `pnpm run check` al terminar una iteración técnica

#### Sección 3. Documentation conventions
- `HANDOFF.md` es índice/TODO, no diseño largo
- planes largos van en `docs/plans/`
- decisiones que merezcan persistencia deben enlazarse desde `HANDOFF.md`
- si una decisión afecta arquitectura, resumirla también en `AGENTS.md`

#### Sección 4. Architecture overview
Resumen corto y estable, no excesivo:
- `src/lib/stores/project.svelte.ts`
  - fuente principal de estado
- `src/lib/types/project.ts`
  - modelo tipado del dominio
- `src/lib/models/*`
  - geometría y lógica de cada tipo
- `src/lib/workers/geometry.worker.ts`
  - generación y export STL/3MF
- `src/routes/+page.svelte`
  - composición general de la app
- `Layer` es para planificación interna del contenedor del juego
- `Loose tray` es exportable y colocable en layer
- `Board` es visual/planning
- `Miniature Rack` es `loose tray` por ahora

#### Sección 5. Product decisions currently in force
Decisiones activas que Codex debe respetar:
- `Miniature Rack` es solo `loose tray` por ahora
- `Layered Box` debe seguir alineándose visual y funcionalmente con `Box`
- `HANDOFF.md` debe mantenerse compacto
- nuevos objetos externos no deben forzarse dentro de `Layer` si no encajan semánticamente

#### Sección 6. Current documentation map
Enlaces cortos:
- `HANDOFF.md`
- `README.md`
- `docs/plans/...`

---

### 2. Modificar `HANDOFF.md`

Ruta:
- [HANDOFF.md](/Users/raul/projects/counterslayer/HANDOFF.md)

### Propósito nuevo
Convertirlo en documento operativo corto:
- estado actual
- pendientes
- riesgos / cosas a vigilar
- enlaces a planes y documentos
- últimos hitos relevantes

### Cambio estructural recomendado

#### Mantener
- bloque de proyecto
- desarrollo local
- estado funcional actual
- ficheros importantes
- cosas a vigilar
- pendientes razonables
- commits recientes relevantes

#### Compactar o mover
Mover fuera del handoff la parte demasiado narrativa o detallada de features si se vuelve extensa. El criterio será:
- si algo es “qué soporta hoy la app”, se puede dejar resumido
- si algo es “cómo se debería integrar una feature futura”, debe ir a `docs/plans/`

#### Añadir una nueva sección
`## Documentos relacionados`

Primer enlace:
- `Integracion propuesta de Game Mat Tube / parametric_map_storage`
  - `docs/plans/game-mat-tube-integration.md`

#### Ajustar el rol del handoff explícitamente
Añadir una nota breve al inicio o al final:
- este documento es índice operativo y lista de trabajo
- los planes largos y decisiones extensas van en `docs/plans/`

---

### 3. Nueva carpeta: `docs/plans/`

Ruta:
- [docs/plans](/Users/raul/projects/counterslayer/docs/plans)

### Propósito
Guardar planes detallados de integración o refactor que no deben contaminar `HANDOFF.md`.

### Convención de nombres
Usar nombres cortos, estables y descriptivos:
- `game-mat-tube-integration.md`
- `layered-box-proxy-review.md`
- `miniature-rack-next-iteration.md`

---

### 4. Nuevo documento inicial de ejemplo

Ruta:
- [docs/plans/game-mat-tube-integration.md](/Users/raul/projects/counterslayer/docs/plans/game-mat-tube-integration.md)

### Propósito
Guardar el análisis ya hecho sobre `parametric_map_storage`.

### Contenido exacto recomendado
Debe reflejar, de forma estructurada, la decisión ya tomada en la conversación:

#### Título
- `Game Mat Tube integration plan`

#### Secciones
- Summary
- Why it should not be a Layer item
- Why it should not be a Board or Loose Tray
- Recommended integration as top-level Accessory
- Proposed domain model
- Proposed UI placement
- Export strategy
- Scope of first implementation
- Out of scope
- Risks and follow-ups

### Decisión principal que debe quedar escrita
- el objeto no debe integrarse como `Layer`
- la mejor vía es un dominio top-level nuevo, tipo `Accessory`
- primer tipo: `GameMatTubeAccessory`
- export STL multipieza
- preview `assembled` y `printBed`
- port a JSCAD, no wrapper runtime de OpenSCAD

---

## Interfaces y convenciones que quedarán definidas

### Convención documental
- `AGENTS.md`: reglas + arquitectura estable
- `HANDOFF.md`: índice/TODO corto
- `docs/plans/*`: planes largos y análisis

### Convención de actualización
- `AGENTS.md`
  - se actualiza solo cuando cambian reglas o decisiones estables
- `HANDOFF.md`
  - se actualiza cuando se resuelve o aparece un issue
  - con texto corto y enlazando a docs largos
- `docs/plans/*`
  - se crea o sustituye cuando aparece una iniciativa técnica con suficiente entidad

---

## Aceptación / criterios de éxito

La reestructuración se considerará correcta si:

1. Existe `AGENTS.md` y describe claramente cómo debe colaborar Codex en este repo.
2. `HANDOFF.md` puede leerse como un índice operativo en menos de un par de minutos.
3. El plan de `Game Mat Tube` existe como documento aparte en `docs/plans/`.
4. `HANDOFF.md` enlaza al plan en vez de contenerlo completo.
5. Un nuevo agente o colaborador puede arrancar leyendo:
   - `AGENTS.md`
   - `HANDOFF.md`
   - el documento de plan enlazado
   y entender cómo continuar sin depender del chat previo.

---

## Suposiciones y defaults elegidos

- Se ha elegido una estructura mínima de 3 piezas:
  - `AGENTS.md`
  - `HANDOFF.md`
  - `docs/plans/`
- Se ha decidido que `AGENTS.md` incluya también arquitectura de alto nivel, no solo reglas de workflow.
- Se ha decidido que `HANDOFF.md` pase a ser un documento índice/TODO, no un registro largo de diseño.
- Se ha decidido que el primer documento largo en `docs/plans/` sea el de integración de `parametric_map_storage`.

---

## Orden exacto de implementación

1. Crear `AGENTS.md` con reglas de colaboración, documentación y arquitectura estable.
2. Crear `docs/plans/`.
3. Crear `docs/plans/game-mat-tube-integration.md` con el análisis ya acordado.
4. Editar `HANDOFF.md` para:
   - reforzar su papel de índice/TODO
   - añadir la sección `Documentos relacionados`
   - enlazar al plan del Game Mat Tube
5. Revisar que no quede información crítica solo en el chat y no en los documentos.

