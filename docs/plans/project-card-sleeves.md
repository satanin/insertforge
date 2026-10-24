# Formatos de carta y fundas

Incluido en v1.2.33; commit autorizado el 2026-10-25. Validación manual/impresa pendiente; push no solicitado.

## Comportamiento

- Dimensions → Cards muestra tres grosores totales editables (sin funda 0,3 mm, estándar 0,5 mm, premium 0,8 mm) y siete formatos iniciales con nombre/ancho/largo.
- Card Draw y Card Storage eligen funda para la pieza. Card Divider y Card Well la eligen por pila. Se comparten los mismos controles en piezas sueltas, cajas y secciones de Layered Box.
- Cambiar los grosores del proyecto actualiza las piezas vinculadas. Ancho/largo no cambian al elegir funda.
- El inventario conserva su interfaz, valores y comportamiento de aplicación explícita. Sus snapshots no toman los grosores del proyecto.

## Modelo y compatibilidad

`Project.cardSleeveThicknesses` es la fuente de los grosores. `CardSleeveSelection` contiene `sleeve` y un posible `cardThicknessOverride` para medidas históricas personalizadas.

`getProjectCardSizes(project)` crea una proyección temporal para geometría, previsualización, validación y exports. No se guarda la proyección en el JSON del proyecto; `CardSize.thickness` queda como dato de compatibilidad histórica y de snapshots. Los modelos usan `effectiveCardSize` para resolver el grosor por referencia.

Al importar proyectos anteriores se infiere la funda a partir del grosor existente. Valores diferentes de los presets se conservan como excepción visible; el usuario puede pulsar “Use project thickness” o cambiar de funda. Los pares de IDs oficiales Premium se unifican solo si ancho/largo coinciden; si el usuario personalizó las dimensiones, se conservan ambos formatos. El mapeo cubre piezas sueltas, cajas, Layered Box y referencias de catálogo del inventario, sin modificar sus medidas snapshot.

Los proyectos actuales conservan su selector al recargar, incluidos los stacks de Card Divider. El fingerprint de geometría incluye los ajustes de grosor para invalidar cachés.

## Verificación

- Tests de dimensiones de los cuatro generadores, capacidad de Card Storage, configuración, migración/idempotencia, persistencia y snapshots.
- Regresiones de Card Well, Divider, Storage, inventario y fingerprints.
- Flujo UI de ajustes globales → funda de pila → dimensiones → recarga.

Aceptación visual y prueba de impresión pendientes.
