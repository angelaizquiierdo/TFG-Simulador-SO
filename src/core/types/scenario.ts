import type { Process } from './process.js';
import type { AlgorithmParams } from './algorithm.js';
import type { SchedulerState } from './scheduler-state.js';

interface Scenario {
  readonly name?: string;
  readonly processes: readonly Process[];
  readonly algorithm: string;
  readonly params: AlgorithmParams;
}

interface WhatIfBranch {
  readonly fromTick: number;
  readonly state: SchedulerState;
}

export type { Scenario, WhatIfBranch };
