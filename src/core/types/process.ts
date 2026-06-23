import type { IOOperation } from './io.js';

interface Process {
  readonly id: string;
  readonly arrival_time: number;
  readonly burst_time: number;
  readonly priority?: number;
  readonly io?: readonly IOOperation[];
}

export type { Process };
