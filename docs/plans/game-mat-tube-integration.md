# Game Mat Tube Integration Plan

## Summary

`parametric_gamemat_storage` no deberia entrar como un item de `Layer`. La integracion recomendada es un dominio top-level nuevo de tipo `Accessory`, con un primer subtipo `GameMatTubeAccessory`, portado a JSCAD y con export multipieza.

## Why It Should Not Be A Layer Item

- Un `Layer` representa planificacion interna del contenido que cabe dentro de la caja o inserto principal.
- Un tubo porta tapete es un objeto externo y autocontenido, no una subdivision interna del espacio jugable.
- Meterlo en `Layer` mezclaria dos responsabilidades distintas: packing interno frente a accesorios independientes.
- Tambien complicaria reglas de posicionamiento, colision y UI que hoy estan pensadas para trays, boxes y objetos de planning.

## Why It Should Not Be A Board Or Loose Tray

- `Board` es visual-only y no participa en export geometrico real.
- `Loose tray` presupone una semantica de bandeja o contenedor abierto que no encaja bien con un tubo multipieza.
- Forzarlo como `Loose tray` introduciria propiedades y paneles que no corresponden al dominio del objeto.
- El resultado seria una API peor y una UI con opciones irrelevantes.

## Recommended Integration As Top-Level Accessory

- Crear un dominio top-level nuevo: `Accessory`.
- Primer tipo soportado: `GameMatTubeAccessory`.
- Debe convivir con el resto de elementos exportables sin fingir que es una `Layer`, `Board` o `Loose tray`.
- La UI debe tratarlo como una familia de objetos propia, preparada para crecer con futuros accesorios externos.

## Proposed Domain Model

- Nuevo discriminante top-level: `accessory`.
- Nuevo subtipo inicial: `gameMatTube`.
- Modelo base sugerido:
  - `id`
  - `name`
  - `type`
  - `position` para preview global si hiciera falta
  - `rotation` para preview
  - `params` especificos del tubo
- Modelo especifico sugerido para `GameMatTubeAccessory`:
  - diametro interno
  - largo util
  - grosor de pared
  - tolerancias de encaje
  - tapa / cuerpo / piezas auxiliares
  - opciones de texto o etiquetado si aplican

## Proposed UI Placement

- Nueva seccion top-level para `Accessories` en la UI principal.
- Accion dedicada tipo `Add accessory`.
- Editor propio para `Game Mat Tube` con preview coherente con el resto de la app.
- La preview deberia soportar al menos:
  - vista `assembled`
  - vista `printBed`

## Export Strategy

- Export STL multipieza desde el modelo de accesorio.
- Mantener compatibilidad con el flujo de export actual de la aplicacion.
- Si el objeto requiere varias piezas, el export debe producir una salida clara por pieza o un paquete consistente con el flujo actual.
- La geometria debe portarse a JSCAD, no envolverse en runtime desde OpenSCAD.

## Scope Of First Implementation

- Crear el dominio `Accessory`.
- Implementar `GameMatTubeAccessory` como primer tipo.
- Añadir creacion, edicion basica, preview `assembled` y `printBed`.
- Integrar export multipieza.
- Mantener el resto de dominios existentes sin cambios semanticos.

## Out Of Scope

- Convertir el tubo en un item de `Layer`.
- Replantear `Board` o `Loose tray` para absorber este caso.
- Soporte generico para todos los accesorios futuros en la primera iteracion.
- Compatibilidad runtime con OpenSCAD como solucion final.

## Risks And Follow-Ups

- Habra que decidir como encaja `Accessory` en el store principal y en la seleccion global.
- Puede requerir ajustar la UI de export para piezas multiples.
- Conviene definir pronto si futuros accesorios compartiran una base comun de parametros o solo infraestructura comun.
- Si aparecen mas accesorios externos, podria merecer la pena extraer componentes y paneles comunes de editor.
