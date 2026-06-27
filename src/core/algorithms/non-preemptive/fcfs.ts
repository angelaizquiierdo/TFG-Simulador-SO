import type { IAlgorithm, ReadyProcess } from '../../../core/types/algorithm.js';

export class FCFS implements IAlgorithm {
  readonly name = 'fcfs';
  readonly preemptionMode = 'none' as const;
  readonly requires = { io: false } as const;

  select(ready: readonly ReadyProcess[]): ReadyProcess {
    if (ready.length === 0) throw new Error('Cola de listos vacía');
    // La lista ya llega ordenada por arrival_time y luego id (desempate global del motor)
    const first = ready[0];
    if (first === undefined) throw new Error('Cola de listos vacía');
    return first;
  }
}
