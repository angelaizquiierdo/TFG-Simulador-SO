import type { IAlgorithm, ReadyProcess } from '../../types/algorithm.js';

export class PriorityP implements IAlgorithm {
  readonly name = 'priority-p';
  readonly preemptionMode = 'on-better' as const;
  readonly requires = { priority: true as const };

  select(ready: readonly ReadyProcess[]): ReadyProcess {
    const first = ready[0];
    if (first === undefined) throw new Error('La cola de listos está vacía');
    let best = first;
    for (const p of ready) {
      if ((p.priority ?? Infinity) < (best.priority ?? Infinity)) best = p;
    }
    return best;
  }
}
