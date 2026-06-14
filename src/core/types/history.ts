// Evento registrado en cada tick del motor
export interface HistoryEvent {
  readonly tick:      number;
  readonly onCPU:     string | null;   // null = CPU inactiva
  readonly ready:     readonly string[];
  readonly pending:   readonly string[];
  readonly completed: readonly string[];
  readonly message:   string;
}

// Secuencia inmutable de eventos del motor
export type History = readonly HistoryEvent[];

// Tramo continuo de ejecución o inactividad en el diagrama de Gantt
export interface Interval {
  readonly pid:   string | null;   // null = hueco de inactividad
  readonly start: number;
  readonly end:   number;
}
