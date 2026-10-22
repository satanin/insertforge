# Acabado exterior redondeado

Iteración local del 2026-10-22, pendiente de validación del usuario.

- Extiende el ajuste de Card Well a Counter Tray, Player Board, Cup Tray, Card Draw, Card Divider y Tile Tray. Los editores compartidos también lo ofrecen dentro de Box y Layered Box.
- Nuevas piezas: radio solicitado de 3 mm. Valor 0 o parámetro ausente: geometría anterior, sin migrar piezas guardadas.
- Solo se redondean las esquinas verticales exteriores, con caras de apoyo planas. El radio efectivo se limita al espesor de pared y al tamaño del cuerpo; el editor muestra ese valor efectivo. No cambia el layout ni los huecos útiles.
- Cup Tray mantiene separado su ajuste de redondeo interior de cavidades.
- Card Draw limita además el radio a 2 mm para proteger el margen de los imanes. Su cuña también se recorta con contorno redondeado, conservando la envolvente anterior (incluidos los 0,05 mm que sobresalen por extremo).
- Card Storage añadido en la siguiente iteración: cuerpo y tapa comparten el radio efectivo. Sin tapa se limita a la pared; con tapa, al margen exterior de su cavidad (`pared/2 - holgura de tapa`, 1,2 mm con defaults). Se recorta el contorno tras añadir el apoyo inclinado; guías, rampas, cavidades, separadores y texto conservan su geometría. Nuevas piezas solicitan 3 mm, 0/ausente conserva proyectos anteriores. Control en `Print settings`.
- Fuera de este bloque: Board de soporte, carcasas/tapas de Box y Layered Box y racks de miniaturas. Sus esquinas participan en apoyos, guías, cierres o postes; requieren diseñar el conjunto antes de aplicarles el mismo acabado.

Regresión: radio 0/ausente, valores inválidos y excesivos, límites exteriores, conservación de la zona interior, volumen menor y ausencia de material añadido en las cinco familias geométricas. La referencia de rendimiento de Card Divider fija radio 0 para seguir comparando contra el sólido original.

Persistencia: la migración de Counter Tray no hereda el nuevo default en piezas antiguas y la de Cup Tray conserva el parámetro. Tests de creación y export/import JSON de las cinco familias con radio 1,5, 0 y ausente.

Verificación local incluyendo Card Storage: `pnpm run test:unit` (197 tests, 25 archivos), `pnpm run check` (0 errores/avisos) y `git diff --check` correctos.

Pendiente: comprobar visualmente en la app los radios 0/3, exportar piezas de muestra y validar impresión. Sin cambio de versión, commit ni push.

Card Storage: tests adicionales cubren contorno de cuerpo/tapa con apoyo inclinado, igualdad de dimensiones/capacidad/preview de cartas, separadores idénticos, persistencia y conservación del material en la zona protegida del cierre. Editor comprobado en la app local: muestra 0 para la pieza antigua y el control aparece en `Print settings`. Pendiente prueba del usuario con el ajuste activo e impresión del cierre.
