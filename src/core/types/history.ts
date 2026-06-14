// T-04 — Tipos de historial y eventos

/** Estado completo de la simulación en un tick dado. */
export interface HistoryEvent {
  readonly tick: number;
  readonly onCPU: string | null;       // null = CPU inactiva
  readonly ready: readonly string[];
  readonly pending: readonly string[];
  readonly completed: readonly string[];
  readonly message: string;
}

/** Secuencia completa de eventos tick a tick. */
export type History = readonly HistoryEvent[];

/**
 * Tramo continuo del mismo proceso (o hueco de inactividad) en el diagrama de Gantt.
 * pid = null indica CPU inactiva.
 */
export interface Interval {
  readonly pid: string | null;
  readonly start: number;
  readonly end: number;
}
