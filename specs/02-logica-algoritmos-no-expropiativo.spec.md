# Especificación: Backend Algoritmos No Expropiativos y Tests

## 1. Contexto y Objetivo
Implementar la lógica matemática para los 4 algoritmos clásicos de planificación No Expropiativa (FCFS, SJF, LJF, Prioridad). Dado que el ciclo de ejecución es idéntico, se debe utilizar un patrón de diseño (Strategy) donde exista un motor central de simulación que reciba como parámetro la función de ordenación específica de la `colaListos`.

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
  5. Generar el `EstadoPaso` del instante actual (guardando el snapshot de colas y Gantt).
  6. Si el proceso actual termina (`tiempoRestante === 0` y no hay más en `colaListos`), liberarlo y calcular sus métricas (Fin, Retorno, Espera).

## 4. Estrategias de Ordenación de la Cola de Listos
Implementar estas 4 funciones de comparación en `estrategiasOrdenacion.ts`. Todas deben tener como **regla de desempate secundaria el `tiempoLlegada`** (el que llegó antes, va primero).

1. **FCFS (First-Come, First-Served):** Orden: Menor `tiempoLlegada` primero.
2. **SJF (Shortest Job First):** Orden: Menor `tiempoCPU` (ráfaga original) primero.
3. **LJF (Longest Job First):** Orden: Mayor `tiempoCPU` primero.
4. **Prioridad No Expropiativa:** Orden: Menor valor de `prioridad` primero (asumiendo que 0 es la máxima prioridad). 

## 5. Pruebas Unitarias (TDD con Vitest)
El archivo `noExpropiativos.test.ts` debe contener una suite completa verificando los 4 algoritmos con datos estáticos (sin usar Math.random). Se exigen estos escenarios:

- **Tests compartidos (Edge Cases generales):**
  - Debe manejar correctamente un array vacío de procesos.
  - Debe simular correctamente el tiempo inactivo (CPU idle) si el primer proceso llega en `t > 0`.
- **Tests específicos por estrategia:**
  - **FCFS 1:** Dados 3 procesos que llegan en el mismo instante, debe ejecutarlos en el orden exacto de inserción en el array.
  - **FCFS 2:** Dados 5 procesos con tiempos de ráfaga variados (valores fijos entre 1 y 5) y distintos tiempos de llegada, debe ejecutarlos estrictamente por orden de llegada.
  - **SJF 1:** Dado un proceso largo en `t=0` y dos cortos en `t=1`, el largo debe terminar primero (por ser no expropiativo), seguido del más corto de los otros dos.
  - **SJF 2:** Dado un proceso largo (ráfaga 8) en `t=0` y 4 procesos cortos (ráfagas de 1, 3, 2, 5) que llegan entre `t=1` y `t=2`. El largo debe terminar primero, y luego la CPU debe ejecutar los cortos en el orden estricto de menor a mayor ráfaga (1, 2, 3, 5).
  - **LJF:** Al llegar varios a la vez, debe elegir siempre el de mayor ráfaga.
  - **Prioridad:** Si hay varios procesos esperando en la cola de listos, se escoge estrictamente el de menor número en el campo `prioridad`.

## 6. Documentación Viva (Actualización de referencia.md)
El archivo `src/content/docs/modelos/referencia.md` (creado anteriormente) debe ser actualizado para incluir una nueva sección principal llamada **"Arquitectura del Backend y Patrones de Diseño"**. 

Esta nueva sección debe explicar de forma técnica y exhaustiva el propósito de la estructura de archivos utilizada para los algoritmos, detallando:

1. **Patrón Strategy (El Motor y las Reglas):**
   - Explicar qué es `src/utils/algoritmos/motorNoExpropiativo.ts`: Actúa como el motor central que maneja el bucle de tiempo (`t=0, 1...`), el control de la CPU y la generación del historial paso a paso (`EstadoPaso`). Evita la duplicación de código.
   - Explicar qué es `src/utils/algoritmos/estrategiasOrdenacion.ts`: Contiene únicamente la lógica matemática y las reglas de ordenación de la `colaListos` (ej. SJF ordena por ráfaga, FCFS por llegada). Estas estrategias se inyectan en el motor central.

2. **Patrón Barril / Funciones Envolventes (El Índice):**
   - Explicar detalladamente el propósito del archivo `src/utils/algoritmos/index.ts`. 
   - Debe documentarse que este archivo actúa como un "recepcionista" que oculta la complejidad interna (el motor y las estrategias).
   - Indicar que su función es exportar "Wrappers" (funciones envolventes listas para usar, como `simularFCFS(procesos)`) para que los componentes de React (`SimuladorBase`) puedan consumir la lógica matemática de forma limpia, sin necesidad de conocer cómo funciona el motor interno.