export interface HistoryEvent {
  readonly tick: number;
  readonly onCPU: string | null;
  readonly ready: readonly string[];
  readonly pending: readonly string[];
  readonly completed: readonly string[];
  readonly inIO: string | null;          // pid en servicio; null si no hay E/S
  readonly waitingIO: readonly string[]; // cola FCFS del dispositivo
  readonly message: string;
}

export type History = readonly HistoryEvent[];

export interface Interval {
  readonly pid: string | null;
  readonly start: number;
  readonly end: number;
}
