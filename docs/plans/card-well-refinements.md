# Card Well: tamaño, extracción y etiquetas

2026-10-22: usuario valida el bloque en la app y autoriza commit como v1.2.24. Sin push autorizado; validación física pendiente.

- Mínimos exteriores de ancho, largo y alto. Vacío/0 conserva el automático; valores pequeños no reducen los huecos. El crecimiento se reparte entre márgenes y divisores. La altura adicional eleva los fondos, siguiendo autoHeight.
- Cotas Width/X, Length/Y en la distribución y medidas actuales junto a cada mínimo.
- La vista individual conserva el giro guardado en el layout de capa/caja, con pieza centrada, cartas, cotas y referencias alineadas. Los parámetros y exports conservan los ejes propios.
- Extraction notches: dos canales semicirculares enfrentados, pasantes por toda la altura para levantar varias bandejas apiladas. Diámetro inicial 20 mm (8–40). Prioriza un separador central si ambas columnas exteriores tienen varios huecos; reutiliza el largo mínimo antes de crecer. Usa márgenes laterales si no hay separador seguro.
- Radio exterior solicitado de 3 mm por defecto para piezas nuevas; 0 desactiva. El radio efectivo se limita por huecos, canales y dimensiones disponibles. Se conservan valores guardados y caras de apilado planas.
- Nombres por pila editables e inicializados desde el inventario. Aparecen en distribución 2D y referencias 3D. Grabado de fondo opcional, alejado del taladro central; profundidad limitada por el material disponible y texto escalado al espacio. Las etiquetas de la mitad opuesta se sitúan en su extremo exterior y giran 180° sin reflejar las letras.

Regresiones de geometría: mínimos, reparto, canales, redondeo, etiquetas, orientación y nombres del inventario. Playwright comprueba edición/persistencia y orientación real del cuerpo en WebGL (0°/90°).

Validación antes del commit: `pnpm run check` sin errores/avisos y 182 tests unitarios correctos. Las tres pruebas de navegador pasan; edición/persistencia se repitió aisladamente tras un timeout durante la ejecución concurrente.

Pendiente: verificar físicamente holguras, resistencia, agarre de bandejas apiladas y legibilidad del texto. Seguir iterando el diseño visual cuando haya nuevos casos reales.
