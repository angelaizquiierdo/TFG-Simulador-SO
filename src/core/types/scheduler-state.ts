export interface SchedulerState {
  readonly tick: number;
  readonly onCPU: string | null;
  readonly ready: readonly string[];
  readonly pending: readonly string[];
  readonly completed: readonly string[];
  readonly inIO: string | null;
  readonly waitingIO: readonly string[];
  readonly remainingBurst: Readonly<Record<string, number>>;
}
