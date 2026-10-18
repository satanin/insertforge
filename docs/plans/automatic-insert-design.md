# Generación de insertos desde componentes

Estado: plan de trabajo, sin implementación ni validación funcional.
Fecha: 2026-10-18.

## Objetivo

Añadir un modo «Generar inserto desde componentes» que transforme el inventario de un juego y las dimensiones interiores de su caja en piezas imprimibles y editables de InsertForge. Empezar por un juego pequeño solo de cartas y ampliar el alcance mediante casos reales progresivamente más complejos.

El resultado debe explicar dónde se guarda cada componente, qué restricciones se cumplen y qué queda pendiente. La comodidad de preparación y uso forma parte del diseño, además del aprovechamiento del espacio.

## Principios

- Buscar primero con dimensiones simplificadas; generar geometría JSCAD solo para propuestas seleccionadas.
- Reutilizar los modelos y la edición existentes. El proyecto generado debe seguir siendo editable y exportable con el flujo normal.
- Mantener separado el inventario original de las piezas generadas y conservar la relación entre ambos.
- No modificar un proyecto existente hasta que el usuario aplique una propuesta; conservar una vía para recuperar el estado anterior.
- Una solución válida debe asignar todas las cantidades y cumplir las restricciones geométricas y de fabricación configuradas.
- Una búsqueda sin solución debe distinguir datos inválidos, imposibilidad demostrable y búsqueda agotada sin encontrar una distribución.
- No prometer la distribución óptima ni el ajuste físico sin probar las tolerancias.
- La IA generativa no es necesaria para el motor. Una futura importación de texto podría ayudar a introducir el inventario, siempre con revisión de datos.

## Datos de entrada

### Caja y fabricación

- Ancho, fondo y altura interiores útiles en milímetros, obligatorios para validar el conjunto.
- Espacio reservado para tableros, manuales u otros objetos que no requieren una pieza impresa.
- Holgura respecto a la caja, entre piezas y respecto al contenido, como parámetros diferenciados.
- Espesor de paredes y suelo; envolvente imprimible de la impresora.
- Las dimensiones del conjunto deben incluir tapas, separadores y apoyos cuando existan.

### Inventario

Cada entrada tendrá identificador estable, nombre, tipo, cantidad y medidas. Para cartas: ancho y alto reales con fundas, si se usan, y grosor medido de la pila correspondiente a una cantidad conocida. No duplicar la holgura de fundas si ya está incluida en las medidas.

En fases posteriores: forma y espesor de fichas/losetas, tamaño de dados y envolvente de miniaturas con orientaciones permitidas. Para componentes a granel, definir y validar un criterio de capacidad; su volumen sólido no basta para garantizar que caben.

## Agrupaciones y uso durante la partida

Representar la intención de uso antes de decidir cuántas bandejas se generan. Un grupo lógico no obliga por sí solo a crear una pieza física.

Ejemplos:

- Mazo de robo y descarte: relacionados por uso, pero quizá requieren huecos separados.
- Kit de jugador: cartas, dados y fichas que se entregan juntos al preparar la partida.
- Kit de personaje: componentes que pertenecen a un personaje, aunque cambie el jugador que lo utiliza.
- Reserva común: componentes compartidos que deben permanecer accesibles en mesa.

Cada grupo debe referenciar cantidades concretas del inventario. Las asignaciones físicas no pueden duplicar componentes ni superar la cantidad disponible. Las etiquetas de jugador, personaje o fase de juego pueden coexistir sin representar asignaciones físicas adicionales.

Separar dos niveles de reglas:

| Nivel | Ejemplos | Efecto |
| --- | --- | --- |
| Obligatorio | Mantener un mazo unido; separar personajes; kit en una bandeja extraíble | La propuesta debe cumplirlo o informar del conflicto |
| Preferido | Acercar componentes de preparación; usar bandejas iguales por jugador; compartir bandeja si cabe | Puntuar las propuestas y explicar concesiones |

Opciones futuras por grupo: permitir dividirlo entre piezas, compartir pieza con otros grupos, exigir compartimentos separados, bandeja utilizable en mesa, tapa y número de copias de un kit. Las copias deben derivar cantidades explícitas; no multiplicar silenciosamente el inventario.

La app puede proponer agrupaciones a partir de estas etiquetas y reglas, pero no debe inferir como cierta la función de un componente solo por sus medidas o su nombre. Cualquier sugerencia debe poder revisarse.

Introducción gradual: el primer caso solo necesita mazos identificados y la regla «mantener unido». Los kits mixtos y la evaluación de agrupaciones alternativas llegan después.

## Flujo previsto

1. Introducir caja e inventario.
2. Revisar agrupaciones y reglas de uso compatibles con la fase implementada.
3. Generar alternativas de almacenamiento: orientación, división permitida y dimensiones exteriores.
4. Buscar distribuciones con presupuesto de tiempo/intentos, posibilidad de cancelar y semilla reproducible.
5. Validar el resultado con un comprobador independiente del algoritmo de búsqueda.
6. Mostrar propuesta, asignación de contenido, altura total y advertencias concretas.
7. Aplicar la propuesta como proyecto editable y exportar con el flujo existente.

Más adelante: comparar varias propuestas y bloquear piezas para regenerar el resto. Una edición manual debe marcar la propuesta como modificada y volver a validar sus restricciones; no conservar un indicador de validez obsoleto.

## Arquitectura propuesta

Nombres y ubicación definitivos por decidir durante cada implementación:

- Dominio de inventario y reglas: tipos independientes de los parámetros de geometría.
- Generador de candidatos: convierte componentes/grupos en alternativas de piezas con capacidad y dimensiones exteriores.
- Planificador: elige candidatos y posiciones, inicialmente rectangulares por capas.
- Validador: cantidades, pertenencia a grupos, capacidad, límites, solapes, altura acumulada y envolvente de impresión.
- Adaptador a proyecto: transforma la propuesta en tipos actuales de InsertForge y conserva la trazabilidad con el inventario.
- Worker de planificación separado del trabajo de geometría para no bloquear la interfaz.

Puntos existentes que revisar antes de implementar:

- `src/lib/types/project.ts`: esquema, persistencia y futura migración.
- `src/lib/utils/binPacking.ts`: empaquetado reutilizable y limitaciones.
- `src/lib/models/layer.ts`: dimensiones y colocación por capas.
- `src/lib/stores/project.svelte.ts`: creación y aplicación de proyectos.
- Modelos de cartas y `Card Storage`: escoger la representación más sencilla compatible con el primer caso.
- `src/lib/workers/geometry.worker.ts`: generación y exportación posteriores a la planificación.

El empaquetado actual organiza piezas definidas; hay que añadir la elección de piezas y sus dimensiones. Los fallbacks visuales existentes no deben interpretarse como prueba de que una distribución cabe.

## Fases y criterios de aceptación

### 0. Caso real mínimo y contrato de datos

- Elegir un juego pequeño solo de cartas y medir caja, mazos y cualquier manual u objeto que permanezca dentro.
- Registrar el inventario como fixture reproducible, sin inventar medidas de un juego comercial.
- Definir unidades, holguras, restricciones y cómo representar cantidades y asignaciones.
- Revisar qué modelo existente permite generar el soporte de cartas más sencillo.

Aceptación: datos completos y propuesta de alcance revisable con el usuario; ninguna dimensión necesaria queda implícita.

### 1. Primera propuesta automática: cartas, una capa

- Caja rectangular fija; uno o pocos mazos rectangulares tumbados.
- Cada mazo permanece unido en su alojamiento; no buscar todavía combinaciones de grupos ni divisiones automáticas.
- Generar soportes sencillos con dimensiones derivadas del contenido, usando el modelo existente elegido.
- Probar colocaciones y giros de 90 grados; comprobar también la altura útil.
- Mostrar una propuesta editable y el detalle de qué mazo corresponde a cada alojamiento.
- Si no cabe en una capa, informar del límite de esta versión sin afirmar que el juego no admite inserto.

Aceptación: todos los mazos asignados exactamente una vez, dimensiones exteriores válidas, sin solapes, interfaz utilizable durante el cálculo y exportación normal disponible. Validación del usuario en la app; ajuste físico pendiente hasta probarlo.

### 2. Cartas: alternativas y varias capas

- Explorar cartas tumbadas o de canto, si su uso y altura lo permiten.
- Permitir dividir un mazo solo cuando la regla del usuario lo autorice.
- Buscar varias capas contabilizando su altura y los elementos reservados.
- Ofrecer unas pocas propuestas con diferencias comprensibles: menos piezas, menor altura o mejor acceso.

Aceptación: caso real que requiere varias capas, cantidades conservadas y altura total comprobada. Propuestas explicadas y reproducibles.

### 3. Agrupaciones de jugador y personaje

- Añadir fichas/dados sencillos para probar kits mixtos.
- Editor de grupos con reglas obligatorias y preferencias.
- Generar bandejas compartimentadas para kits y comparar agrupaciones permitidas.
- Mantener la identidad de personaje separada de la asignación a jugador.
- Explicar conflictos: por ejemplo, un kit obligatorio no cabe en una sola pieza imprimible.

Aceptación: caso real con kits de jugador o personaje; distribución completa, grupos obligatorios respetados y concesiones de preferencias visibles. El usuario confirma que el reparto resulta útil al preparar una partida.

### 4. Iteración asistida y juegos más complejos

- Bloquear piezas o posiciones y regenerar el espacio restante.
- Incorporar losetas, tableros y reservas de espacio más complejas.
- Añadir tapas y condiciones de almacenamiento vertical con validación específica.
- Estudiar miniaturas y envolventes irregulares después de consolidar los casos rectangulares.

Aceptación: acordar un juego objetivo y sus restricciones antes de cada ampliación; mantener los casos anteriores como regresión.

## Validación

- Tests unitarios de dimensiones, capacidad, holguras y conservación de cantidades.
- Casos límite: giro necesario, altura insuficiente, paredes que impiden el encaje, kit incompatible y pieza mayor que la impresora.
- Tests del validador con propuestas deliberadamente inválidas, independientes de lo que genere el buscador.
- Fixtures pequeñas por juego/fase y prueba de ida y vuelta de persistencia.
- Prueba de flujo: inventario → propuesta → proyecto editable → exportación.
- Ejecutar `pnpm run check` en cada iteración técnica y los tests pertinentes.
- Validar laminado real y ajuste físico cuando corresponda. Los 3MF de JSCAD siguen pasando por `group3mf`; un chequeo manifold no sustituye la prueba en el laminador.
- Mantener cada fase pendiente de validación hasta confirmación del usuario.

## Próxima sesión

1. Elegir el juego pequeño de cartas y reunir medidas interiores de caja y contenido completo.
2. Revisar los modelos de cartas y el empaquetado actual para escoger la primera representación física.
3. Concretar la fase 0 y preparar el primer fixture y contrato de datos.
4. Implementar la fase 1 en iteraciones pequeñas. Revisar versión y changelog antes del primer bloque publicable; este plan documental no cambia la versión.

## Registro de decisiones

- 2026-10-18: avanzar desde un juego pequeño solo de cartas hacia juegos más complejos; evitar comenzar con un solucionador general de geometría arbitraria.
- 2026-10-18: incluir agrupaciones por jugador, personaje y uso como parte explícita del dominio, introduciendo su interfaz y búsqueda de forma gradual.
- 2026-10-18: conservar las propuestas como piezas editables de InsertForge y distinguir viabilidad geométrica de validación física.
