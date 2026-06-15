// Estado del simulador en un tick concreto
export interface HistoryEvent {
  readonly tick: number;
  readonly onCPU: string | null;          // null = CPU inactiva
  readonly ready: readonly string[];
  readonly pending: readonly string[];
  readonly completed: readonly string[];
  readonly message: string;
}

// Secuencia completa de eventos tick a tick
export type History = readonly HistoryEvent[];

// Intervalo colapsado de uso de CPU (se deriva del history)
export interface Interval {
  readonly pid: string | null;  // null = hueco de inactividad
  readonly start: number;
  readonly end: number;
}
