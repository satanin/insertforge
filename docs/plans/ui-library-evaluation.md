# Evaluación de componentes para InsertForge

Evaluación inicial: 2026-10-23. Preview evaluada y retirada: 2026-10-24. El usuario prefiere continuar con New · Beta: Skeleton no aporta suficiente mejora para justificar la migración. Se retiran piloto y dependencias, y se conserva este estudio como referencia histórica. Retomar si aparecen problemas concretos.

## Recomendación inicial (no adoptada)

Recomiendo **Skeleton 5** como primera candidata para la nueva interfaz, con Flowbite Svelte como alternativa si se prioriza importar componentes de formulario ya encapsulados. Skeleton aporta un sistema visual y componentes de interacción reutilizables, incluyendo árbol y panel flotante relevantes para InsertForge. No significa que incluya un editor CAD, un stepper numérico completo ni reglas de negocio de impresión.

La decisión debe pasar por una integración piloto de un panel real conservando la clásica, el mismo canvas y el reparto actual. Las pruebas de esta evaluación se hicieron fuera del repositorio: no validan aún todos los efectos de integrar Tailwind en la aplicación.

## Estado local observado

- Svelte 5.53.12 declarado; SvelteKit 2.55, Vite 8 y plugin de Svelte 7.
- 24 archivos Svelte importan `@tableslayer/ui`. Conteo estático de etiquetas: 142 `Input`, 28 `Select`, 162 `FormControl`, 13 inputs nativos y 20 selects nativos. Son apariciones en código, no componentes renderizados simultáneamente ni esfuerzo estimado de migración.
- En la evaluación inicial Tailwind no estaba instalado en la app; añadido después para la preview aislada.
- `@tableslayer/ui` está fijada a 0.1.12. Su registro publica 0.2.8, actualizado en octubre: **no es una librería abandonada** según ese indicador.
- Su Input no incluye stepper compuesto. FormControl resuelve sufijos, pero los estilos de la Beta habían cambiado alturas/radios desde fuera. El defecto observado era de integración local, no evidencia suficiente para culpar a la librería.
- El reset heredado contiene `all: unset` aplicado globalmente. Su convivencia con estilos basados en capas requiere trabajo explícito.

## Alternativas

| Opción | Qué aporta | Trabajo que conserva InsertForge | Coste relativo aquí |
|---|---|---|---|
| Mantener/actualizar Tableslayer | Controles existentes, FormControl, popover, color picker y toast; compatibilidad Svelte 5 declarada | Consistencia entre inventario y editores, stepper compuesto, agrupación y reglas visuales; revisar actualización 0.1 → 0.2 | Bajo para continuar; medio para consolidar el rediseño |
| Skeleton 5 | Sistema de temas/colores/tamaños, utilidades de formularios y grupos, componentes Svelte de interacción sobre Zag, árbol, accordion, combobox y diálogos | Componer campos de cantidad/medida una vez, reglas Auto/manual, snapshots, validación geométrica | Medio/alto al introducir Tailwind y adaptar controles |
| Flowbite Svelte | Componentes importables y estilizados de input, addon, select, checkbox, accordion, menú/modal, etc. | Stepper compuesto y reglas de dominio; adaptar densidad y navegación jerárquica | Medio/alto; buena alternativa para formularios listos para importar |
| shadcn-svelte + Bits UI | Código de componentes ya diseñado, Input Group, Field, accordion, select, tooltip y demás; gran libertad visual | Somos propietarios de los archivos copiados y de sus cambios/actualizaciones; el stepper de negocio sigue siendo composición | Medio/alto; adecuado si aceptamos mantener una capa visual propia |
| Bits UI sin capa visual | Primitivas de interacción sin estilo, foco/teclado y APIs accesibles | Diseñar y mantener apariencia, tamaños y grupos de campos | Alto para el objetivo de reducir CSS propio; no lo elegiría solo |

El coste es una valoración de esta arquitectura, no una medición en jornadas. Ninguna opción cambia por sí sola la organización del producto.

## Cobertura de controles reales

| Necesidad | Skeleton | Flowbite | shadcn-svelte / Bits |
|---|---|---|---|
| Cantidad `− / input / +` | Composición de field-group, input y botones | Composición de ButtonGroup, Input y Button documentada | Input Group + botones/input; no encontré Number Field dedicado en el catálogo oficial consultado |
| Medida con `mm` | Grupo con input y etiqueta de unidad | ButtonGroup + InputAddon | Input Group + Addon |
| Auto / valor numérico | Semántica nuestra en todas las alternativas; no convertir vacío a cero accidentalmente | Igual | Igual |
| Listas simples | Select nativo con estilo | Select nativo encapsulado | Native Select o Select de Bits |
| Catálogos largos | Combobox | Input/combobox y componentes relacionados | Combobox/Command/Select |
| Secciones plegables | Accordion Svelte | Accordion/AccordionItem | Accordion sobre Bits |
| Árbol de proyecto | Tree View en catálogo | Requiere composición y modelo propios | Navegación/Sidebar más jerarquía de aplicación |
| Color de pieza | No dar por cubierto el selector actual: verificar sustitución específica | Verificar sustitución específica | Verificar sustitución específica |
| Visor y controles orbitales | Se mantiene el existente en todas las opciones | Igual | Igual |

No añadiría una segunda biblioteca de iconos solo por adoptar los ejemplos de una librería: conservar Tabler donde la API lo permita.

## Prueba práctica realizada

Laboratorio aislado: `/tmp/insertforge-ui-evaluation`. Usa Svelte 5.53.12, Vite 8.0.0, plugin Svelte 7.0.0, Tailwind 4.3.3, Skeleton 5.0.1 y Flowbite 1.33.1. Incluye dos paneles equivalentes con cantidad, formato, checkbox, altura decimal opcional y acordeones múltiples. No incluye visor ni conexión al store de proyectos.

- Ambos paneles compilan y se renderizan en el navegador.
- En Skeleton se comprobó 30 → 31, decimal 42,5 y plegado independiente; grupo de medida y sufijo medidos a 35,0625 px en la configuración final.
- En Flowbite se comprobó 30 → 31, cambio de formato, decimal 42,5 y plegado independiente; input y sufijo de medida medidos a 27 px sin CSS heredado.
- Prueba de coexistencia: el mismo input Flowbite pasa de borde de 1 px a 0 px al importar el reset heredado sin aislar. Al situar los estilos heredados en una capa inferior a utilidades recupera borde de 1 px. La tipografía heredada sigue influyendo en tamaños: no es aún una solución validada para toda la app.
- Hubo que activar preprocesado TypeScript explícito conservando imports usados desde plantillas para el laboratorio con Vite 8. Con la configuración inicial, Flowbite produjo errores en parámetros opcionales de componentes transitivos; una segunda configuración eliminó imports necesarios y dio `clsx is not defined`. El laboratorio final corrige ambos sin parchear paquetes. Es un requisito de integración a validar en SvelteKit, no un fallo universal atribuido a Flowbite.
- La documentación de formularios de Skeleton consultada mostró nombres de grupos distintos al paquete 5.0.1 (`input-group`/`ig-*` frente a `field-group`/`input`/`label`). La prueba final usa la API publicada del paquete. Fijar versión y ejemplos antes de migrar.
- No se hizo una auditoría WCAG ni prueba con lector de pantalla. Los atributos de los acordeones y la identificación de controles se inspeccionaron en el navegador; la accesibilidad de la aplicación final requiere pruebas de teclado, foco, contraste y avisos.
- No se compara rendimiento ni peso final de la app: la compilación del laboratorio no representa su carga real ni una selección de componentes optimizada.

## Mantenimiento y licencias: datos consultados

Metadatos del registro npm consultados en esta fecha:

| Paquete | Versión consultada | Publicación de esa versión | Compatibilidad declarada |
|---|---|---|---|
| Tableslayer | instalada 0.1.12; disponible 0.2.8 | disponible actualizado en octubre | Svelte ^5.19, Kit ^2.16 |
| Skeleton / Skeleton Svelte | 5.0.1 | 2026-08-19 | Tailwind ^4; Svelte ^5.40 |
| Flowbite Svelte | 1.33.1 | 2026-04-07 | Svelte ^5.40; Tailwind ^4.1.4 |
| shadcn-svelte CLI | 1.7.1 | 2026-10-23 | Svelte ^5; documentación actual Svelte 5 + Tailwind 4 |
| Bits UI | 2.20.2 | 2026-10-23 | Svelte ^5.33; Node >=20 |

Las fechas de publicación son una señal de actividad, no una garantía de calidad o soporte futuro. El CLI de shadcn no es una dependencia de componentes en ejecución. Las candidatas anteriores declaran MIT, mientras Tableslayer declara FSL-1.1-ALv2; este documento no analiza implicaciones jurídicas de la licencia heredada.

## Cómo lo introduciría

1. Mantener la clásica y su aspecto. Resolver y probar primero la convivencia de CSS, sin sustituir ni remontar el canvas.
2. Crear dos componentes de aplicación, `QuantityField` y `DimensionField`, apoyados en el sistema elegido. Solo contienen nuestras reglas compartidas: enteros/decimales, límites, unidades, vacío/Auto y momento de confirmar un cambio. No crear un botón distinto en cada editor.
3. Construir el panel real de Card Well con campos, ayudas, estados inválidos y accordion de la librería; después aplicar los mismos campos al inventario.
4. Verificar ratón, teclado, alturas, ancho estrecho, temas claro/oscuro y mantenimiento de cámara/proyecto al alternar interfaces.
5. Extender al resto de editores por bloques, manteniendo constantes los controles compartidos. No migrar todo con sustituciones automáticas ni retirar Tableslayer mientras la clásica la siga usando.

La evaluación inicial no modificó dependencias, estilos ni componentes de la aplicación. El piloto posterior se describe al final; su aceptación sigue pendiente.

## Fuentes primarias

- [Skeleton: sistema y catálogo](https://www.skeleton.dev/docs/svelte/get-started/core-api)
- [Skeleton: formularios](https://www.skeleton.dev/docs/svelte/tailwind-components/forms)
- [Skeleton: instalación](https://www.skeleton.dev/docs/svelte/get-started/installation)
- [Flowbite: cantidades y botones](https://flowbite-svelte.com/docs/forms/number-input)
- [Flowbite: inputs y addons](https://flowbite-svelte.com/docs/forms/input-field)
- [shadcn-svelte: modelo de propiedad y actualizaciones](https://www.shadcn-svelte.com/docs)
- [shadcn-svelte: Input Group](https://www.shadcn-svelte.com/docs/components/input-group)
- [Bits UI: enfoque sin estilo](https://www.bits-ui.com/docs)
- Registro npm: [Skeleton](https://registry.npmjs.org/@skeletonlabs%2Fskeleton), [Skeleton Svelte](https://registry.npmjs.org/@skeletonlabs%2Fskeleton-svelte), [Flowbite](https://registry.npmjs.org/flowbite-svelte), [shadcn CLI](https://registry.npmjs.org/shadcn-svelte), [Bits](https://registry.npmjs.org/bits-ui), [Tableslayer](https://registry.npmjs.org/@tableslayer%2Fui).
- Código local de la versión instalada de Tableslayer: `node_modules/@tableslayer/ui/dist/components/Input` y `styles/reset.css`; código publicado de las candidatas descargado únicamente al laboratorio.

## Registro del piloto — 2026-10-24 (retirado)

Estuvo disponible en `http://localhost:5175/`, selector **Interface → Skeleton · Preview**, al seleccionar una pieza **Card Well**. El piloto funcional conectaba cantidades, formato, nombre, grabado, giro, mínimos exteriores y fabricación a los callbacks actuales y a la geometría real. Distribución, extracción y acabado conservaban sus secciones previas. No se migró el resto de la aplicación ni el inventario. Esta opción ya se ha retirado.

Se añadió `@skeletonlabs/skeleton` 5.0.1 y Tailwind/plugin Vite 4.3.3. Los formularios usan las utilidades oficiales de Skeleton sobre controles nativos; no requieren todavía el paquete de componentes de framework `skeleton-svelte`. El panel se monta en Shadow DOM con CSS importado como texto, para que el reset de Tailwind no altere Classic/Beta. Se adaptan `:root` a `:host` e inicializan propiedades de sombras/bordes que no se registran dentro de Shadow DOM. Esta separación es una solución de evaluación, no una decisión de arquitectura para toda la migración.

La opción de preview dura la sesión de la app; al recargar vuelve a New · Beta. Cambiar entre modos no remonta el visor. Los cambios en campos sí modifican y guardan la pieza actual, como en los otros editores. No se crean ni sustituyen proyectos de muestra del usuario.

El usuario confirma prioridad de escritorio: móvil debe permitir usar la app, sin exigir una experiencia de edición equivalente al desktop. Se mantiene el reparto inicial 75/25 en escritorio.

Validación técnica del piloto: build de producción y test de flujo (mismo canvas/tamaño, cambios persistidos, mínimos vacíos vuelven a Auto, regreso a Classic y tema). Tras verlo, el usuario prefirió continuar con New · Beta y retirar Skeleton.
