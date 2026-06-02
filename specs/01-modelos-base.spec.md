# Especificación: Modelos de Datos Base para el Simulador de SO

## 1. Contexto y Objetivo
Definir las interfaces y tipos de datos (TypeScript) fundamentales que representarán los procesos, el control de tiempos y el historial de pasos del sistema operativo. Estos modelos son la base estructural para implementar algoritmos de planificación (FCFS, SJF, Round Robin, Prioridades) tanto expropiativos como no expropiativos.

## 2. Modelos de Datos Requeridos
Generar un archivo `src/types/proceso.ts` que incluya y exporte estrictamente las siguientes estructuras:

- **ConfiguracionSimulador:** Define el comportamiento global del algoritmo en concreto de planificación de CPU (FCFS, SJF, LJF, PRIO-N, RR, SRTF, LRTF, PRIO_P)
  - `expropiativo`: boolean (true si el algoritmo puede expulsar a un proceso de la CPU antes de que termine).
  - `usaPrioridades`: boolean (true si el algoritmo toma decisiones basadas en el campo prioridad).
  - `tiempoMaximoTurno`?: number (Opcional. Representa el "Quantum" de tiempo. Límite máximo de ticks que un proceso puede usar la CPU de forma ininterrumpida).

- **Proceso:** Interfaz de entrada del usuario del proceso 
  - `id`: string 
  - `tiempoLlegada`: number
  - `tiempoCPU`: number (Burst time)
  - `tiempoLlegadaES`?: number (Instante en el que solicita E/S)
  - `tiempoES`?: number (Duración de la E/S)
  - `prioridad`?: number
  - `color`: string (Para el diagrama de Gantt)

- **ProcesoControlFinal:** Extiende `Proceso` para el seguimiento durante la simulación cuando finaliza el algoritmo
  - `tiempoRestante`: number
  - `tiempoFin`?: number
  - `tiempoRetorno`?: number
  - `tiempoEspera`?: number

- **EstadoProcesoEnTiempo:** Historial de proceso en que estado se encuentra
  - `id`: string
  - `estado`: 'ejecutando' | 'esperando' | 'bloqueado' | 'not-arrived' | 'terminado'
  - `tiempoEjecutado`?: number

- **EstadoPaso:** Representa el "snapshot" en un instante `t` exacto.
  - `tiempoActual`: number
  - `procesoEnEjecucion`: string | null (proceso existente en interfaz de proceso)
  - `estadosProcesos`: EstadoProcesoEnTiempo[]
  - `colaListos`: string[]
  - `colaBloqueados`?: string[]
  - `mensaje`: string (Ej: "P1 entra a ejecución", "P2 expropia a P1 por prioridad")
  - `gantt`: string[] (Historial acumulado de IDs para el gráfico)

## 3. Lógica de Funciones de Apoyo (Factoría)
Como las interfaces en TypeScript desaparecen en tiempo de ejecución, genera también funciones puras (factorías) en `src/utils/procesoUtils.ts` para crear y validar estos objetos.

**Explicación de las Funciones:**
Estas funciones actúan como "constructores seguros". No puedes instanciar una interfaz directamente en TypeScript con validaciones complejas. Estas funciones toman los datos básicos, verifican que sean correctos (ej. que no haya IDs duplicados, que los tiempos no sean negativos), y devuelven el objeto completo listo para ser usado por el simulador.

- `crearProceso(datos: Partial<Proceso>, procesosExistentes: Proceso[])`: Proceso: Valida los datos y crea un nuevo proceso. Debe lanzar un error si el id ya existe en procesosExistentes.

- `inicializarControlProceso(p: Proceso)`: ProcesoControlFinal: Convierte un Proceso básico en un objeto preparado para el seguimiento durante la simulación (inicializando tiempoRestante, etc.).

- `crearPasoInicial(procesos: Proceso[])`: EstadoPaso: Crea el primer "snapshot" del simulador en el instante t=0.

## 4. Interfaz de Usuario y Restricciones Técnicas
- **Lenguaje:** TypeScript puro. No incluir dependencias de React en estos archivos.
- **Testing:** Usar `vitest` para las pruebas unitarias.

## 5. Plan de Pruebas (TDD)
Generar el archivo de pruebas `src/types/__tests__/proceso.test.ts`. Se exigen **como mínimo 4 pruebas** para las utilidades de cada interfaz (12 pruebas en total):

- **Pruebas para Proceso (crearProceso):**
  1. Debe crear un proceso válido con los campos obligatorios.
  2. Debe asignar un color por defecto si no se proporciona.
  3. Debe lanzar error si `tiempoCPU` o `tiempoLlegada` son negativos.
  4. Debe aceptar y guardar correctamente los campos opcionales (prioridad, E/S).

- **Pruebas para ProcesoControlFinal (inicializarControlProceso):**
  1. Debe inicializar `tiempoRestante` igual a `tiempoCPU`.
  2. Los tiempos de fin, retorno y espera deben inicializarse como `undefined`.
  3. Debe heredar correctamente el `id` y `color` del proceso original.
  4. Al simular un tick (restar 1 a tiempoRestante), el objeto debe reflejar el cambio correctamente sin alterar el `tiempoCPU` original.

- **Pruebas para EstadoPaso (crearPasoInicial / transiciones):**
  1. El paso inicial en `tiempoActual = 0` debe tener `procesoEnEjecucion = null`.
  2. Todos los procesos cuyo `tiempoLlegada > 0` deben estar en estado `not-arrived`.
  3. El array de `gantt` debe inicializarse vacío.
  4. La `colaListos` debe incluir solo los IDs de los procesos que tienen `tiempoLlegada === 0`.

## 6. Documentación Viva (Clasificación de Algoritmos)
Generar el archivo `src/content/docs/modelos/referencia.md` para el entorno de Astro Starlight. Este archivo debe ser una guía exhaustiva y debe contener:

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
4. **Ejecutarlas pruebas unitarias y coverage** Quiero que se pueda realizar de 2 maneras con la descripcion del package.json o comandos `npm run vitest`, `npm run vitest --ui` y `npm run vitest run --coverage` asimismo sus definiciónes de lo que realizan.