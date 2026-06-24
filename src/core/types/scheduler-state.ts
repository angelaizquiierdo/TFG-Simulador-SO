import type { DeviceState } from './io.js';

interface SchedulerState {
  readonly tick: number;
  readonly onCPU: string | null;
  readonly ready: readonly string[];
  readonly pending: readonly string[];
  readonly completed: readonly string[];
  readonly deviceState: DeviceState;
  // Tiempo de CPU restante por proceso en este punto del historial
  readonly remaining: readonly { readonly id: string; readonly remaining: number }[];
}

export type { SchedulerState };
