// Evento del historial: estado del simulador en un tick concreto
export interface HistoryEvent {
  readonly tick: number;
  readonly onCPU: string | null;         // null = CPU inactiva
  readonly ready: readonly string[];
  readonly pending: readonly string[];
  readonly completed: readonly string[];
  readonly message: string;
}

// Historial completo de la simulación (indexable — devuelve HistoryEvent | undefined)
export type History = readonly HistoryEvent[];

// Intervalo continuo de ejecución para el diagrama de Gantt
export interface Interval {
  readonly pid: string | null;   // null = hueco de inactividad
  readonly start: number;
  readonly end: number;
}
