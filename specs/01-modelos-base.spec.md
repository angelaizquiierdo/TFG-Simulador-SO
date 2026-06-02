# Especificación: Modelos de Datos Base para el Simulador de SO

## 1. Contexto y Objetivo
Definir las interfaces y tipos de datos (TypeScript) fundamentales que representarán los procesos, el control de tiempos y el historial de pasos del sistema operativo. Estos modelos son la base estructural para implementar algoritmos de planificación (FCFS, SJF, Round Robin, Prioridades) tanto expropiativos como no expropiativos.

## 2. Entorno Tecnológico y Dependencias

### 2.1. Dependencias de *runtime* (inmutables)
**RESTRICCIÓN ESTRICTA PARA LA IA:** La sección `dependencies` del `package.json` es **inmutable** y no debe ser modificada ni regenerada. La IA debe adaptarse exclusivamente a este ecosistema de runtime:
- **Framework Base:** Astro (`^6.3.1`) con el framework de documentación Starlight (`@astrojs/starlight: ^0.39.2`).
- **Procesamiento de Imágenes:** Sharp (`^0.34.5`).

### 2.2. Dependencias de *testing* (`devDependencies`)
**Sí se permite y se exige declarar el utillaje de pruebas en `devDependencies`.** Esto NO contradice la regla anterior: `devDependencies` es una sección distinta de `dependencies` y no altera el runtime de la aplicación. La razón es que sin estos paquetes declarados, los flujos de cobertura (`--coverage`) e interfaz gráfica (`--ui`) **no son reproducibles ni ejecutables** en integración continua (CI) ni sin conexión: Vitest intentaría instalarlos de forma interactiva en tiempo de ejecución y fallaría.

Vitest está **modularizado**: el runner, la interfaz gráfica y la cobertura son paquetes independientes. Se requieren los tres:

| Paquete | Para qué sirve | Habilita el comando |
| --- | --- | --- |
| `vitest` | Motor que ejecuta las pruebas y reporta en terminal. | `vitest run` |
| `@vitest/ui` | Capa de visualización: panel web interactivo sobre el mismo runner. | `vitest --ui` |
| `@vitest/coverage-v8` | Proveedor de métricas de cobertura de líneas y ramas. | `vitest run --coverage` |

**Reglas de declaración (obligatorias):**
1. Las versiones deben **fijarse de forma explícita** (evitar rangos abiertos en CI).
2. La versión de `@vitest/coverage-v8` debe **coincidir en *major*** con la de `vitest`; de lo contrario la cobertura no arranca.
3. **Comando de bootstrap** (ejecutar una sola vez para instalar el tooling):
   ```bash
   npm install -D vitest @vitest/ui @vitest/coverage-v8
   ```
4. **Scripts recomendados** en la clave `scripts` del `package.json` (clave distinta de `dependencies`, por tanto permitida):
   - `"test": "vitest run"`
   - `"test:ui": "vitest --ui"`
   - `"test:coverage": "vitest run --coverage"`

> Nota: la versión exacta de cada paquete se fija al instalar; ata `@vitest/coverage-v8` al mismo número que resuelva `vitest`.

## 3. Modelos de Datos Requeridos y Estilo de Documentación
Generar el archivo `src/types/proceso.ts`. Es una **restricción estricta** que cada interfaz, enum y propiedad contenga documentación JSDoc explícita siguiendo este formato exacto:

/**
 * @description [Uso de la interfaz/enum]
 */

Y para las propiedades internas:
/** @description [Qué es y qué realiza] */

### Estructuras a generar con sus descripciones requeridas:

- **ConfiguracionSimulador**
  /**
   * @description Configuración global que define el comportamiento del algoritmo de planificación activo.
   */
  - `expropiativo`: /** @description Determina si el algoritmo puede expulsar activamente a un proceso de la CPU (true) o si debe esperar a que termine (false). */
  - `usaPrioridades`: /** @description Indica si el mecanismo de selección debe evaluar el nivel de prioridad de los procesos. */
  - `tiempoMaximoTurno`?: /** @description Quantum de tiempo máximo asignado a un proceso antes de ser expropiado (obligatorio en Round Robin). */

- **Proceso**
  /**
   * @description Datos puros de entrada del proceso configurados por el usuario. Inmutables durante la simulación.
   */
  - `id`: /** @description Identificador único y alfabético del proceso (ej. "P1"). Sirve para su indexación en las colas. */
  - `tiempoLlegada`: /** @description Instante de tiempo (tick) en el que el proceso entra al sistema. */
  - `tiempoCPU`: /** @description Duración total (burst time) que el proceso requiere en la CPU para completarse. */
  - `tiempoLlegadaES`?: /** @description Tick en el que el proceso detiene su ejecución para solicitar una operación de Entrada/Salida. */
  - `tiempoES`?: /** @description Duración total del bloqueo en la cola de Entrada/Salida antes de volver a estar listo. */
  - `prioridad`?: /** @description Nivel de importancia asignado (menor número implica mayor prioridad). */
  - `color`: /** @description Código hexadecimal utilizado para pintar las celdas del proceso en el diagrama de Gantt. */

- **NombreEstadoProceso (Enum)**
  /**
   * @description Enumerado numérico estricto para mapear los estados del ciclo de vida de un proceso en el S.O.
   */
  - `NotArrived` = 1 (not-arrived)
  - `Esperando` = 2 (esperando)
  - `Ejecutando` = 3 (ejecutando)
  - `Bloqueado` = 4 (bloqueado)
  - `Terminado` = 5 (terminado)

- **ProcesoControlFinal**
  /**
   * @description Extensión de la interfaz Proceso que añade campos mutables para el seguimiento vivo y cálculo de métricas en el motor.
   */
  - `tiempoRestante`: /** @description Unidades de ráfaga de CPU que le faltan al proceso para terminar (inicialmente igual a tiempoCPU). */
  - `tiempoFin`?: /** @description Instante exacto en el que el proceso termina su ejecución. */
  - `tiempoRetorno`?: /** @description Tiempo total desde que llegó hasta que terminó (tiempoFin - tiempoLlegada). */
  - `tiempoEspera`?: /** @description Tiempo total que pasó en la cola de listos sin usar la CPU (tiempoRetorno - tiempoCPU). */

- **EstadoProcesoEnTiempo**
  /**
   * @description Snapshot del estado de un proceso individual en un instante de tiempo específico.
   */
  - `id`: /** @description ID del proceso al que pertenece el estado. */
  - `estado`: /** @description Estado actual del proceso mapeado mediante el enum NombreEstadoProceso. */
  - `tiempoEjecutado`?: /** @description Cantidad de ticks acumulados que el proceso ha consumido de CPU hasta este instante. */

- **EstadoPaso**
  /**
   * @description Snapshot completo del estado del sistema operativo en un tick específico, usado para renderizar la línea de tiempo y el Gantt.
   */
  - `tiempoActual`: /** @description Instante de tiempo (reloj t) que representa este paso. */
  - `procesoEnEjecucion`: /** @description ID del proceso que ocupa la CPU en este tick (null si la CPU está IDLE). */
  - `estadosProcesos`: /** @description Lista con la situación de todos los procesos del sistema en este instante. */
  - `colaListos`: /** @description IDs de los procesos que se encuentran esperando turno en la cola de listos. */
  - `colaBloqueados`?: /** @description IDs de los procesos que se encuentran retenidos en la cola de Entrada/Salida. */
  - `mensaje`: /** @description Cadena explicativa de los eventos ocurridos en este tick (ej. cambios de contexto o terminaciones). */
  - `gantt`: /** @description Array acumulado de IDs de ejecución históricos hasta el tiempoActual. */

## 4. Lógica de Funciones de Apoyo (Factoría)
Generar el archivo `src/utils/procesoUtils.ts`. Estas funciones actúan como constructores seguros y defensivos en tiempo de ejecución. Deben incluir documentación JSDoc explicativa para cada función (`/** @description ... */`).

Se deben aplicar estrictamente las siguientes reglas de validación y lógica:

- **`crearProceso(datos: Partial<Proceso>, procesosExistentes: Proceso[]): Proceso`**
  - /** @description Valida los datos de entrada del formulario y retorna un objeto Proceso seguro. */
  - **Validaciones obligatorias (Lanzar Error si falla):**
    1. El `id` no puede estar vacío ni contener solo espacios.
    2. El `id` debe ser único: si ya existe en `procesosExistentes`, lanzar un error indicando que está duplicado.
    3. `tiempoLlegada` no puede ser negativo.
    4. `tiempoCPU` debe ser estrictamente mayor que cero (`>= 1`).
  - **Lógica:** Si no se proporciona un `color`, asignar uno de forma automática.

- **`inicializarControlProceso(p: Proceso): ProcesoControlFinal`**
  - /** @description Convierte un Proceso de usuario en la estructura mutable de control requerida por el motor. */
  - **Validaciones obligatorias:** Verificar que el proceso de origen contenga un `id` válido y tiempos coherentes antes de transformar.
  - **Lógica:** Retorna un objeto que extiende el proceso original, inicializando `tiempoRestante` exactamente igual a `p.tiempoCPU`. Los campos `tiempoFin`, `tiempoRetorno` y `tiempoEspera` deben quedar explícitamente como `undefined`.

- **`crearPasoInicial(procesos: Proceso[]): EstadoPaso`**
  - /** @description Inicializa el sistema operativo en el instante t=0, construyendo el primer snapshot del historial. */
  - **Lógica interna estricta:**
    1. El reloj inicial `tiempoActual` se fija en `0`.
    2. `procesoEnEjecucion` se inicializa como `null`.
    3. El historial acumulado de `gantt` e `id` se inicializa como un array vacío `[]`.
    4. **Construcción de `estadosProcesos`:** Se debe generar una entrada `EstadoProcesoEnTiempo` para cada proceso del sistema evaluando su `tiempoLlegada`:
       - Si `p.tiempoLlegada === 0`: Su estado inicial debe ser `NombreEstadoProceso.Esperando` y se añade su `id` al array `colaListos`.
       - Si `p.tiempoLlegada > 0`: Su estado inicial debe ser `NombreEstadoProceso.NotArrived` y **NO** entra en la `colaListos`.
    5. `colaBloqueados` se inicializa como un array vacío `[]`.
    6. El `mensaje` inicial debe ser `"Sistema inicializado. Esperando planificación."`.

## 5. Interfaz de Usuario y Restricciones Técnicas
- **Lenguaje:** TypeScript puro. No incluir dependencias de React en estos archivos.
- **Testing:** Usar `vitest` para las pruebas unitarias independientes.
- **Configuración de pruebas:** Generar un `vitest.config.ts` en la raíz del proyecto que fije, como mínimo, `coverage.provider: 'v8'`, los `include` de los archivos de test (`src/**/*.test.ts`) y los reporters. En un proyecto Astro se recomienda derivar la configuración de Vite mediante `getViteConfig` de `astro/config`, para que el entorno de test use la misma resolución de módulos que Astro.

## 6. Plan de Pruebas (TDD)
Generar el archivo de pruebas `src/types/__tests__/proceso.test.ts`. Se exigen **como mínimo 4 pruebas** para las utilidades de cada interfaz (16 pruebas en total):

- **Pruebas para Proceso (crearProceso):**
  1. Debe crear un proceso válido con los campos obligatorios.
  2. Debe asignar un color por defecto si no se proporciona.
  3. Debe lanzar error si `tiempoLlegada` es -1.
  4. Debe lanzar error si `tiempoCPU` es 0.
  5. Debe aceptar y guardar correctamente los campos opcionales (prioridad, E/S).
  6. Debe lanzar error al asignar `id`:
     - vacío
     - que contiene solo espacios
     - que ya existe en `procesosExistentes`
  7. Debe recurrir al color de reserva cuando la paleta automática se agota.

 

- **Pruebas para ProcesoControlFinal (inicializarControlProceso):**
  1. Debe inicializar `tiempoRestante` igual a `tiempoCPU`.
  2. Los tiempos de fin, retorno y espera deben inicializarse como `undefined`.
  3. Debe heredar correctamente el `id` y `color` del proceso original.
  4. Al simular un tick (restar 1 a tiempoRestante), el objeto debe reflejar el cambio correctamente sin alterar el `tiempoCPU` original.
  5. Debe lanzar error si el proceso de origen tiene `id` o tiempos incoherentes:
     - `id` inválido (vacío)
     - `tiempoCPU` incoherente (< 1)
     - `tiempoLlegada` negativo


- **Pruebas para EstadoPaso (crearPasoInicial / transiciones):**
  1. El paso inicial en `tiempoActual = 0` debe tener `procesoEnEjecucion = null`.
  2. Todos los procesos cuyo `tiempoLlegada > 0` deben tener asignado el estado `NombreEstadoProceso.NotArrived`.
  3. El array de `gantt` debe inicializarse vacío.
  4. La `colaListos` debe incluir solo los IDs de los procesos que tienen `tiempoLlegada === 0`, y el estado de estos procesos debe ser `NombreEstadoProceso.Esperando`.

## 7. Documentación Viva (Clasificación de Algoritmos)
Generar el archivo `src/content/docs/modelos/referencia.md` para el entorno de Astro Starlight. Este archivo debe ser una guía exhaustiva y debe contener:

1. **Diccionario de Propiedades:** Una tabla Markdown explicando cada propiedad de las interfaces (qué es `tiempoLlegada`, `tiempoMaximoTurno`, etc.).
2. **Conceptos Clave:** Una sección explicando claramente la diferencia entre algoritmos expropiativos (preemptive) y no expropiativos (non-preemptive).
3. **Matriz de Casos de Uso:** Una sección obligatoria que relacione la `ConfiguracionSimulador` con los algoritmos clásicos, indicando qué tipo utiliza cada uno. Debe incluir explícitamente:
   - **No Expropiativos (No usan tiempoMaximoTurno, `expropiativo: false`):** - FCFS (First-Come, First-Served).
     - SJF (Shortest Job First).
     - LJF (Longest Job First).
     - Prioridad No Expropiativa.
   - **Expropiativos (No usan tiempoMaximoTurno, `expropiativo: true`):** - SRTF (Shortest Remaining Time First - la versión expropiativa de SJF).
     - LRTF (Longest Remaining Time First).
     - Prioridad Expropiativa.
   - **Expropiativos por Turno (Usan tiempoMaximoTurno, `tiempoMaximoTurno` definido):**
     - Round Robin (RR).
4. **Guía de Testing Directo:** Una subsección que documente cómo ejecutar la suite de pruebas unitarias y cobertura. **Antes de los comandos debe indicarse el requisito previo de instalación del tooling** (ver §2.2):

   ```bash
   # Requisito previo (una sola vez): instalar el utillaje de testing como devDependencies.
   npm install -D vitest @vitest/ui @vitest/coverage-v8
   ```

   A continuación deben describirse los siguientes tres flujos de comandos, aclarando para cada uno qué paquete lo habilita:

   * `npx vitest run` *(paquete: `vitest`)*: Ejecuta de manera secuencial y aislada todas las pruebas de la suite en la terminal de comandos una sola vez. Salida exclusivamente textual en consola.
   * `npx vitest --ui` *(paquete: `@vitest/ui`)*: Inicializa un servidor local interactivo que abre la interfaz gráfica avanzada de Vitest en el navegador. Es una capa de visualización sobre el mismo runner: permite monitorizar el paso de los tests, navegar por el árbol de suites, ver el código de cada prueba y relanzarlas visualmente. **Requiere que `@vitest/ui` esté instalado**; sin él, el comando solicita la instalación de forma interactiva.
   * `npx vitest run --coverage` *(paquete: `@vitest/coverage-v8`)*: Invoca el motor de recolección de métricas de cobertura para analizar qué porcentaje exacto de las líneas de código fuente y ramas lógicas están cubiertas por los tests. **Requiere que `@vitest/coverage-v8` esté instalado** y con un *major* compatible con `vitest`.

   > Si se han declarado los scripts recomendados en §2.2, los tres flujos equivalen respectivamente a `npm test`, `npm run test:ui` y `npm run test:coverage`.