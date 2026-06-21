import type { IOOperation } from './io.js';

export interface Process {
  readonly id: string;
  readonly arrival_time: number;   // >= 0
  readonly burst_time: number;     // > 0
  readonly priority?: number;
  readonly io?: readonly IOOperation[]; // io_entry estrictamente crecientes; solo VRR
}
