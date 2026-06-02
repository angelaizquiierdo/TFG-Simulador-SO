---
title: Referencia de Modelos Base
description: Guía exhaustiva de los modelos de datos del Simulador de SO y la clasificación de algoritmos de planificación.
---

Esta página documenta los modelos de datos base (`src/types/proceso.ts`), las
funciones de apoyo (`src/utils/procesoUtils.ts`) y la clasificación de los
algoritmos de planificación según la configuración del simulador.

## 1. Diccionario de Propiedades

### `ConfiguracionSimulador`

| Propiedad | Tipo | Obligatoria | Descripción |
| --- | --- | --- | --- |
| `expropiativo` | `boolean` | Sí | Determina si el algoritmo puede expulsar activamente a un proceso de la CPU (`true`) o si debe esperar a que termine (`false`). |
| `usaPrioridades` | `boolean` | Sí | Indica si el mecanismo de selección debe evaluar el nivel de prioridad de los procesos. |
| `tiempoMaximoTurno` | `number` | No | Quantum de tiempo máximo asignado a un proceso antes de ser expropiado (obligatorio en Round Robin). |

### `Proceso`

| Propiedad | Tipo | Obligatoria | Descripción |
| --- | --- | --- | --- |
| `id` | `string` | Sí | Identificador único y alfabético del proceso (ej. `"P1"`). Sirve para su indexación en las colas. |
| `tiempoLlegada` | `number` | Sí | Instante de tiempo (tick) en el que el proceso entra al sistema. |
| `tiempoCPU` | `number` | Sí | Duración total (burst time) que el proceso requiere en la CPU para completarse. |
| `tiempoLlegadaES` | `number` | No | Tick en el que el proceso detiene su ejecución para solicitar una operación de Entrada/Salida. |
| `tiempoES` | `number` | No | Duración total del bloqueo en la cola de Entrada/Salida antes de volver a estar listo. |
| `prioridad` | `number` | No | Nivel de importancia asignado (menor número implica mayor prioridad). |
| `color` | `string` | Sí | Código hexadecimal utilizado para pintar las celdas del proceso en el diagrama de Gantt. |

### `ProcesoControlFinal` (extiende `Proceso`)

| Propiedad | Tipo | Obligatoria | Descripción |
| --- | --- | --- | --- |
| `tiempoRestante` | `number` | Sí | Unidades de ráfaga de CPU que le faltan al proceso para terminar (inicialmente igual a `tiempoCPU`). |
| `tiempoFin` | `number` | No | Instante exacto en el que el proceso termina su ejecución. |
| `tiempoRetorno` | `number` | No | Tiempo total desde que llegó hasta que terminó (`tiempoFin - tiempoLlegada`). |
| `tiempoEspera` | `number` | No | Tiempo total que pasó en la cola de listos sin usar la CPU (`tiempoRetorno - tiempoCPU`). |

### `EstadoProcesoEnTiempo`

| Propiedad | Tipo | Obligatoria | Descripción |
| --- | --- | --- | --- |
| `id` | `string` | Sí | ID del proceso al que pertenece el estado. |
| `estado` | `NombreEstadoProceso` | Sí | Estado actual del proceso mapeado mediante el enum `NombreEstadoProceso`. |
| `tiempoEjecutado` | `number` | No | Ticks acumulados que el proceso ha consumido de CPU hasta este instante. |

### `EstadoPaso`

| Propiedad | Tipo | Obligatoria | Descripción |
| --- | --- | --- | --- |
| `tiempoActual` | `number` | Sí | Instante de tiempo (reloj `t`) que representa este paso. |
| `procesoEnEjecucion` | `string \| null` | Sí | ID del proceso que ocupa la CPU en este tick (`null` si la CPU está IDLE). |
| `estadosProcesos` | `EstadoProcesoEnTiempo[]` | Sí | Situación de todos los procesos del sistema en este instante. |
| `colaListos` | `string[]` | Sí | IDs de los procesos que esperan turno en la cola de listos. |
| `colaBloqueados` | `string[]` | No | IDs de los procesos retenidos en la cola de Entrada/Salida. |
| `mensaje` | `string` | Sí | Cadena explicativa de los eventos ocurridos en este tick. |
| `gantt` | `string[]` | Sí | Array acumulado de IDs de ejecución históricos hasta el `tiempoActual`. |

### `NombreEstadoProceso` (enum numérico)

| Valor | Nombre | Significado |
| --- | --- | --- |
| `1` | `NotArrived` | El proceso aún no ha llegado al sistema. |
| `2` | `Esperando` | Ha llegado y aguarda turno en la cola de listos. |
| `3` | `Ejecutando` | Ocupa la CPU en el tick actual. |
| `4` | `Bloqueado` | Retenido realizando una operación de E/S. |
| `5` | `Terminado` | Ha completado toda su ráfaga de CPU. |

## 2. Conceptos Clave: Expropiativo vs. No Expropiativo

La diferencia central entre las familias de algoritmos de planificación está en
**si el planificador puede o no interrumpir a un proceso que ya está en la CPU.**

- **No expropiativo (non-preemptive):** una vez que un proceso obtiene la CPU,
  la conserva hasta que termina su ráfaga o se bloquea voluntariamente (por
  ejemplo, por una operación de E/S). El planificador solo decide a quién dar la
  CPU **cuando esta queda libre**. Es más simple y predecible, pero un proceso
  largo puede retrasar a muchos cortos (efecto convoy). En el modelo se
  representa con `expropiativo: false`.

- **Expropiativo (preemptive):** el planificador **puede expulsar** al proceso en
  ejecución antes de que termine, devolviéndolo a la cola de listos. Esto ocurre
  cuando llega un proceso más prioritario/más corto, o cuando se agota un quantum
  de tiempo. Mejora la respuesta y el reparto, a costa de más cambios de
  contexto. En el modelo se representa con `expropiativo: true`.

El campo `tiempoMaximoTurno` añade un tercer matiz: la expropiación **por turno
de tiempo** (quantum), propia de Round Robin, donde la interrupción no depende de
otro proceso sino del reloj.

## 3. Matriz de Casos de Uso

Relación entre la `ConfiguracionSimulador` y los algoritmos clásicos.

### No Expropiativos

`expropiativo: false` · **no** usan `tiempoMaximoTurno`.

- **FCFS** (First-Come, First-Served).
- **SJF** (Shortest Job First).
- **LJF** (Longest Job First).
- **Prioridad No Expropiativa**.

### Expropiativos

`expropiativo: true` · **no** usan `tiempoMaximoTurno`.

- **SRTF** (Shortest Remaining Time First — la versión expropiativa de SJF).
- **LRTF** (Longest Remaining Time First).
- **Prioridad Expropiativa**.

### Expropiativos por Turno

`expropiativo: true` · usan `tiempoMaximoTurno` (definido).

- **Round Robin (RR)**.

| Algoritmo | `expropiativo` | `usaPrioridades` | `tiempoMaximoTurno` |
| --- | --- | --- | --- |
| FCFS | `false` | `false` | — |
| SJF | `false` | `false` | — |
| LJF | `false` | `false` | — |
| Prioridad No Expropiativa | `false` | `true` | — |
| SRTF | `true` | `false` | — |
| LRTF | `true` | `false` | — |
| Prioridad Expropiativa | `true` | `true` | — |
| Round Robin (RR) | `true` | `false` | definido |

## 4. Guía de Testing Directo

### Requisito previo (una sola vez)

Antes de ejecutar cualquier comando hay que instalar el utillaje de testing como
`devDependencies`. Vitest está modularizado, por lo que se requieren los tres
paquetes; sin ellos los flujos de cobertura e interfaz gráfica no son
reproducibles en CI ni sin conexión.

```bash
# Requisito previo (una sola vez): instalar el utillaje de testing como devDependencies.
npm install -D vitest @vitest/ui @vitest/coverage-v8
```

### Flujos de comandos

- **`npx vitest run`** *(paquete: `vitest`)*: ejecuta de manera secuencial y
  aislada todas las pruebas de la suite en la terminal una sola vez. Salida
  exclusivamente textual en consola.

- **`npx vitest --ui`** *(paquete: `@vitest/ui`)*: inicializa un servidor local
  interactivo que abre la interfaz gráfica avanzada de Vitest en el navegador. Es
  una capa de visualización sobre el mismo runner: permite monitorizar el paso de
  los tests, navegar por el árbol de suites, ver el código de cada prueba y
  relanzarlas visualmente. **Requiere que `@vitest/ui` esté instalado**; sin él,
  el comando solicita la instalación de forma interactiva.

- **`npx vitest run --coverage`** *(paquete: `@vitest/coverage-v8`)*: invoca el
  motor de recolección de métricas de cobertura para analizar qué porcentaje
  exacto de líneas y ramas lógicas están cubiertas por los tests. **Requiere que
  `@vitest/coverage-v8` esté instalado** y con un *major* compatible con
  `vitest`.

> Si se han declarado los scripts recomendados en el `package.json`, los tres
> flujos equivalen respectivamente a `npm test`, `npm run test:ui` y
> `npm run test:coverage`.