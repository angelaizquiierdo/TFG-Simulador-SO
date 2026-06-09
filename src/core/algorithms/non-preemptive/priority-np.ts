import type { IAlgorithm, ReadyProcess } from '../../types/algorithm.js';

export class PriorityNP implements IAlgorithm {
  readonly name = 'priority-np';
  readonly preemptionMode = 'none' as const;
  readonly requires = { priority: true };

  select(ready: readonly ReadyProcess[]): ReadyProcess {
    let best = ready[0];
    if (best === undefined) throw new Error('Sin procesos en cola');
    for (const p of ready) {
      if ((p.priority ?? Infinity) < (best.priority ?? Infinity)) best = p;
    }
    return best;
  }
}
