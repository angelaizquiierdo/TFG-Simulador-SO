interface HistoryEvent {
  readonly tick: number;
  readonly onCPU: string | null;
  readonly ready: readonly string[];
  readonly pending: readonly string[];
  readonly completed: readonly string[];
  readonly inIO: string | null;
  readonly waitingIO: readonly string[];
  readonly message: string;
}

type History = readonly HistoryEvent[];

interface Interval {
  readonly pid: string | null;
  readonly start: number;
  readonly end: number;
}

export type { HistoryEvent, History, Interval };
