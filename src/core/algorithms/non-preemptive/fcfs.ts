import type { IAlgorithm, ReadyProcess } from '../../types/algorithm.js';

export class FCFS implements IAlgorithm {
  readonly name = 'fcfs';
  readonly preemptionMode = 'none' as const;
  readonly requires = {};

  select(ready: readonly ReadyProcess[]): ReadyProcess {
    const first = ready[0];
    if (first === undefined) throw new Error('Sin procesos en cola');
    return first;
  }
}
