/**
 * Configuración global del simulador.
 * Define el comportamiento del algoritmo de planificación.
 */
export interface ConfiguracionSimulador {
  /** true si el algoritmo puede expulsar a un proceso de la CPU antes de que termine */
  expropiativo: boolean;
  /** true si el algoritmo toma decisiones basadas en el campo prioridad */
  usaPrioridades: boolean;
  /** Límite máximo de ticks que un proceso puede usar la CPU de forma ininterrumpida (Quantum). Opcional. */
  tiempoMaximoTurno?: number;
}

/**
 * Proceso de entrada - datos iniciales proporcionados por el usuario.
 */
export interface Proceso {
  /** Identificador único del proceso */
  id: string;
  /** Instante en el que el proceso llega al sistema (tiempo de llegada) */
  tiempoLlegada: number;
  /** Tiempo de ejecución en CPU (burst time) */
  tiempoCPU: number;
  /** Instante en el que el proceso solicita E/S (opcional) */
  tiempoLlegadaES?: number;
  /** Duración de la operación de E/S (opcional) */
  tiempoES?: number;
  /** Prioridad del proceso (menor número = mayor prioridad, opcional) */
  prioridad?: number;
  /** Color para el diagrama de Gantt */
  color: string;
}

/**
 * Proceso extendido con campos de control durante la simulación.
 * Extiende Proceso para mantener el seguimiento del estado de ejecución.
 */
export interface ProcesoControlFinal extends Proceso {
  /** Tiempo restante de ejecución */
  tiempoRestante: number;
  /** Momento en el que terminó la ejecución (undefined si no ha terminado) */
  tiempoFin?: number;
  /** Tiempo de retorno = tiempoFin - tiempoLlegada (undefined si no ha terminado) */
  tiempoRetorno?: number;
  /** Tiempo de espera = tiempoRetorno - tiempoCPU (undefined si no ha terminado) */
  tiempoEspera?: number;
}

/**
 * Estado de un proceso en un momento específico del tiempo.
 */
export interface EstadoProcesoEnTiempo {
  /** ID del proceso */
  id: string;
  /** Estado actual del proceso */
  estado: 'ejecutando' | 'esperando' | 'bloqueado' | 'not-arrived' | 'terminado';
  /** Tiempo acumulado que el proceso ha estado en ejecución (opcional) */
  tiempoEjecutado?: number;
}

/**
 * Representa el estado completo del sistema en un instante específico.
 * Es el "snapshot" en un tiempo t exacto.
 */
export interface EstadoPaso {
  /** Tiempo actual de la simulación */
  tiempoActual: number;
  /** ID del proceso que está en ejecución en este instante (null si ninguno) */
  procesoEnEjecucion: string | null;
  /** Estados de todos los procesos en este instante */
  estadosProcesos: EstadoProcesoEnTiempo[];
  /** IDs de los procesos listos para ejecutar */
  colaListos: string[];
  /** IDs de los procesos bloqueados en E/S (opcional) */
  colaBloqueados?: string[];
  /** Mensaje descriptivo de lo que sucedió en este instante */
  mensaje: string;
  /** Historial acumulado de IDs de procesos ejecutados (para el diagrama de Gantt) */
  gantt: string[];
}
