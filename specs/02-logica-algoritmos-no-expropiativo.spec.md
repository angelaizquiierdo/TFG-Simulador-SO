# Especificación: Backend Algoritmos No Expropiativos y Tests

## 1. Contexto y Objetivo
Implementar la lógica matemática para los 4 algoritmos clásicos de planificación No Expropiativa (FCFS, SJF, LJF, Prioridad). Dado que el ciclo de ejecución es idéntico, se debe utilizar un patrón de diseño donde exista un motor central de simulación que reciba como parámetro la función de ordenación (estrategia) específica de la `colaListos`.

## 2. Archivos a Generar
- `src/utils/algoritmos/motorNoExpropiativo.ts` (Bucle principal compartido).
- `src/utils/algoritmos/estrategiasOrdenacion.ts` (Las 4 funciones de ordenación).
- `src/utils/algoritmos/index.ts` (Exportación de las funciones envolventes listas para usar).
- `src/utils/algoritmos/__tests__/noExpropiativos.test.ts` (Pruebas unitarias).

## 3. Lógica del Motor Base (`motorNoExpropiativo.ts`)
- **Firma:** `simularNoExpropiativo(procesos: Proceso[], ordenarColaListos: (a: ProcesoControlFinal, b: ProcesoControlFinal) => number): { historial: EstadoPaso[], resultados: ProcesoControlFinal[] }`
- **Flujo tick a tick (t=0, 1, 2...):**
  1. Actualizar la `colaListos` con los procesos que hayan llegado (`tiempoLlegada <= t`) y no hayan terminado.
  2. Aplicar la función `ordenarColaListos` al array de listos.
  3. Si la CPU está libre y hay procesos listos, extraer el índice 0 de la cola y asignarlo a ejecución.
  4. Ejecutar el proceso (restar 1 a `tiempoRestante`).
  5. Generar el `EstadoPaso` del instante actual.
  6. Si el proceso actual termina (`tiempoRestante === 0`), liberarlo y calcular sus métricas (Fin, Retorno, Espera).

## 4. Estrategias de Ordenación de la Cola de Listos
Implementar estas 4 funciones de comparación. Todas deben tener como **regla de desempate secundaria el `tiempoLlegada`** (el que llegó antes, va primero).

1. **FCFS (First-Come, First-Served):** - Orden: Menor `tiempoLlegada` primero.
2. **SJF (Shortest Job First):** - Orden: Menor `tiempoCPU` (ráfaga original) primero.
3. **LJF (Longest Job First):** - Orden: Mayor `tiempoCPU` primero.
4. **Prioridad No Expropiativa:** - Orden: Menor valor de `prioridad` primero (asumiendo que 0 es la máxima prioridad). 

## 5. Pruebas Unitarias (TDD con Vitest)
El archivo `noExpropiativos.test.ts` debe contener una suite completa verificando los 4 algoritmos. Se exigen escenarios específicos:

- **Tests compartidos (Edge Cases generales):**
  - Debe manejar correctamente un array vacío de procesos.
  - Debe simular correctamente el tiempo inactivo (CPU idle) si el primer proceso llega en `t > 0`.
- **Tests específicos por estrategia (Verificación matemática):**
  - **FCFS:** Dados 3 procesos que llegan a la vez, debe ejecutarlos en el orden exacto de inserción.
  - **FCFS** Dados 5 procesos que llega de forma aleatoria en la CPU de entre 1-5, debe ejecutarse en el mismo orden de inserción.
  - **SJF:** Dado un proceso largo en $t=0$ y dos cortos en $t=1$, el largo debe terminar primero (por ser no expropiativo), seguido del más corto de los otros dos.
  - **SJF:** Dado un proceso largo entre (7-10) en $t=0$  y 4 cortos entre (1-5) de forma azar en $t=1$ y $t=2$, el largo debe terminar primero (por ser no expropiativo), seguido del más corto de los otros 4.
  - **LJF:** Al llegar varios a la vez, debe elegir siempre el de mayor ráfaga.
  - **Prioridad:** Verificar que si varios procesos están en la cola de listos, se escoge estrictamente el de menor número en el campo `prioridad`.

## 6. Documentación Viva (Clasificación de Algoritmos)
Generar el archivo `src/content/docs/algoritmo/algoritmos_noExpropiativo.md` para el entorno de Astro Starlight. Este archivo debe ser una guía exhaustiva y debe contener:

1. **Diccionario de Propiedades:** Una tabla Markdown explicando cada propiedad de las interfaces (qué es `tiempoLlegada`, `tiempoMaximoTurno` (tiempoMaximoTurno), etc.).
2. **Conceptos Clave:** Una sección explicando claramente la diferencia entre algoritmos expropiativos (preemptive) y no expropiativos (non-preemptive).
3. **Matriz de Casos de Uso:** Una sección obligatoria que relacione la `ConfiguracionSimulador` con los algoritmos clásicos, indicando qué tipo utiliza cada uno. Debe incluir explícitamente:
   - **No Expropiativos (No usan tiempoMaximoTurno, `expropiativo: false`):** 
     - FCFS (First-Come, First-Served).
     - SJF (Shortest Job First).
     - LJF (Longest Job First).
     - Prioridad No Expropiativa.
   - **Expropiativos (No usan tiempoMaximoTurno, `expropiativo: true`):** 
     - SRTF (Shortest Remaining Time First - la versión expropiativa de SJF).
     - LRTF (Longest Remaining Time First).
     - Prioridad Expropiativa.
   - **Expropiativos por Turno (Usan tiempoMaximoTurno, `tiempoMaximoTurno` definido):**
     - Round Robin (RR).
4. **Ejemplo Práctico:** Un ejemplo en JSON de cómo se instanciaría la configuración para un FCFS vs. un Round Robin.