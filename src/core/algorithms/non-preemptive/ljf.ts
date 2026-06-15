import type { IAlgorithm, ReadyProcess } from '../../types/algorithm.js';

export class LJF implements IAlgorithm {
  readonly name = 'ljf';
  readonly preemptionMode = 'none' as const;
  readonly requires = {};

  select(ready: readonly ReadyProcess[]): ReadyProcess {
    const first = ready[0];
    if (first === undefined) throw new Error('La cola de listos está vacía');
    let best = first;
    for (const p of ready) {
      if (p.burst_time > best.burst_time) best = p;
    }
    return best;
  }
}
