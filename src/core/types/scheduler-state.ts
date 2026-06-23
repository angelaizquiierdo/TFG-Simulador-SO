import type { DeviceState } from './io.js';

interface SchedulerState {
  readonly tick: number;
  readonly onCPU: string | null;
  readonly ready: readonly string[];
  readonly pending: readonly string[];
  readonly completed: readonly string[];
  readonly deviceState: DeviceState;
}

export type { SchedulerState };
