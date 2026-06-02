/**
 * @file proceso.ts
 * @description Modelos de datos base del Simulador de Sistema Operativo.
 * Define las interfaces, enums y tipos fundamentales que representan los
 * procesos, el control de tiempos y el historial de pasos del S.O.
 * Estos modelos son la base estructural para los algoritmos de planificación
 * (FCFS, SJF, Round Robin, Prioridades), expropiativos y no expropiativos.
 *
 * TypeScript puro: este archivo NO depende de React ni de ningún framework de UI.
 */

/**
 * @description Configuración global que define el comportamiento del algoritmo de planificación activo.
 */
export interface ConfiguracionSimulador {
  /** @description Determina si el algoritmo puede expulsar activamente a un proceso de la CPU (true) o si debe esperar a que termine (false). */
  expropiativo: boolean;
  /** @description Indica si el mecanismo de selección debe evaluar el nivel de prioridad de los procesos. */
  usaPrioridades: boolean;
  /** @description Quantum de tiempo máximo asignado a un proceso antes de ser expropiado (obligatorio en Round Robin). */
  tiempoMaximoTurno?: number;
}

/**
 * @description Datos puros de entrada del proceso configurados por el usuario. Inmutables durante la simulación.
 */
export interface Proceso {
  /** @description Identificador único y alfabético del proceso (ej. "P1"). Sirve para su indexación en las colas. */
  id: string;
  /** @description Instante de tiempo (tick) en el que el proceso entra al sistema. */
  tiempoLlegada: number;
  /** @description Duración total (burst time) que el proceso requiere en la CPU para completarse. */
  tiempoCPU: number;
  /** @description Tick en el que el proceso detiene su ejecución para solicitar una operación de Entrada/Salida. */
  tiempoLlegadaES?: number;
  /** @description Duración total del bloqueo en la cola de Entrada/Salida antes de volver a estar listo. */
  tiempoES?: number;
  /** @description Nivel de importancia asignado (menor número implica mayor prioridad). */
  prioridad?: number;
  /** @description Código hexadecimal utilizado para pintar las celdas del proceso en el diagrama de Gantt. */
  color: string;
}

/**
 * @description Enumerado numérico estricto para mapear los estados del ciclo de vida de un proceso en el S.O.
 */
export enum NombreEstadoProceso {
  /** @description (not-arrived) El proceso aún no ha llegado al sistema; su tiempoLlegada es mayor que el reloj actual. */
  NotArrived = 1,
  /** @description (esperando) El proceso ha llegado y aguarda turno en la cola de listos sin usar la CPU. */
  Esperando = 2,
  /** @description (ejecutando) El proceso ocupa la CPU en el tick actual. */
  Ejecutando = 3,
  /** @description (bloqueado) El proceso está retenido realizando una operación de Entrada/Salida. */
  Bloqueado = 4,
  /** @description (terminado) El proceso ha completado toda su ráfaga de CPU y abandona el sistema. */
  Terminado = 5,
}

/**
 * @description Extensión de la interfaz Proceso que añade campos mutables para el seguimiento vivo y cálculo de métricas en el motor.
 */
export interface ProcesoControlFinal extends Proceso {
  /** @description Unidades de ráfaga de CPU que le faltan al proceso para terminar (inicialmente igual a tiempoCPU). */
  tiempoRestante: number;
  /** @description Instante exacto en el que el proceso termina su ejecución. */
  tiempoFin?: number;
  /** @description Tiempo total desde que llegó hasta que terminó (tiempoFin - tiempoLlegada). */
  tiempoRetorno?: number;
  /** @description Tiempo total que pasó en la cola de listos sin usar la CPU (tiempoRetorno - tiempoCPU). */
  tiempoEspera?: number;
}

/**
 * @description Snapshot del estado de un proceso individual en un instante de tiempo específico.
 */
export interface EstadoProcesoEnTiempo {
  /** @description ID del proceso al que pertenece el estado. */
  id: string;
  /** @description Estado actual del proceso mapeado mediante el enum NombreEstadoProceso. */
  estado: NombreEstadoProceso;
  /** @description Cantidad de ticks acumulados que el proceso ha consumido de CPU hasta este instante. */
  tiempoEjecutado?: number;
}

/**
 * @description Snapshot completo del estado del sistema operativo en un tick específico, usado para renderizar la línea de tiempo y el Gantt.
 */
export interface EstadoPaso {
  /** @description Instante de tiempo (reloj t) que representa este paso. */
  tiempoActual: number;
  /** @description ID del proceso que ocupa la CPU en este tick (null si la CPU está IDLE). */
  procesoEnEjecucion: string | null;
  /** @description Lista con la situación de todos los procesos del sistema en este instante. */
  estadosProcesos: EstadoProcesoEnTiempo[];
  /** @description IDs de los procesos que se encuentran esperando turno en la cola de listos. */
  colaListos: string[];
  /** @description IDs de los procesos que se encuentran retenidos en la cola de Entrada/Salida. */
  colaBloqueados?: string[];
  /** @description Cadena explicativa de los eventos ocurridos en este tick (ej. cambios de contexto o terminaciones). */
  mensaje: string;
  /** @description Array acumulado de IDs de ejecución históricos hasta el tiempoActual. */
  gantt: string[];
}