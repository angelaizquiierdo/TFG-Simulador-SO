import type { IAlgorithm, ReadyProcess } from '../../types/algorithm.js';

export class FCFS implements IAlgorithm {
  readonly name = 'fcfs';
  readonly preemptionMode = 'none' as const;
  readonly requires = { priority: false, quantum: false, io: false };

  select(ready: readonly ReadyProcess[]): ReadyProcess {
    if (ready.length === 0) throw new Error('select: cola vacía');
    // El motor entrega la lista ordenada por arrival_time y luego id
    const first = ready[0];
    if (first === undefined) throw new Error('select: cola vacía');
    return first;
  }
}
