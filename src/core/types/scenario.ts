import type { Process } from './process.js';
import type { AlgorithmParams } from './algorithm.js';
import type { SchedulerState } from './scheduler-state.js';

export interface Scenario {
  readonly name?: string;
  readonly processes: readonly Process[];
  readonly algorithm: string;
  readonly params: AlgorithmParams;
  readonly whatIf?: { fromTick: number; state: SchedulerState };
}
